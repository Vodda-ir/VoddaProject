package repository

import (
	"context"
	"errors"
	"strings"

	"gorm.io/gorm"

	"vodda/backend/internal/domain"
)

type postRepo struct{ db *gorm.DB }

// NewPostRepository creates the blog article persistence boundary.
func NewPostRepository(db *gorm.DB) domain.PostRepository {
	return &postRepo{db: db}
}

func (r *postRepo) Create(ctx context.Context, p *domain.Post) error {
	if p == nil {
		return domain.ErrValidation
	}
	return r.db.WithContext(ctx).Create(p).Error
}

func (r *postRepo) Update(ctx context.Context, p *domain.Post) error {
	if p == nil || p.ID == 0 {
		return domain.ErrValidation
	}
	return r.db.WithContext(ctx).Save(p).Error
}

func (r *postRepo) Delete(ctx context.Context, id uint) error {
	res := r.db.WithContext(ctx).Delete(&domain.Post{}, id)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *postRepo) ByID(ctx context.Context, id uint) (*domain.Post, error) {
	var post domain.Post
	if err := r.db.WithContext(ctx).Preload("Author").First(&post, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return &post, nil
}

func (r *postRepo) BySlug(ctx context.Context, slug string) (*domain.Post, error) {
	var post domain.Post
	if err := r.db.WithContext(ctx).Preload("Author").Where("slug = ?", slug).First(&post).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return &post, nil
}

func (r *postRepo) SlugTaken(ctx context.Context, slug string, excludeID uint) (bool, error) {
	var count int64
	query := r.db.WithContext(ctx).Model(&domain.Post{}).Where("slug = ?", slug)
	if excludeID > 0 {
		query = query.Where("id <> ?", excludeID)
	}
	if err := query.Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *postRepo) List(ctx context.Context, f domain.PostFilter) ([]domain.Post, int64, error) {
	query := r.db.WithContext(ctx).Model(&domain.Post{})
	if f.Public {
		query = query.Where("status = ?", domain.PostPublished)
	}
	if f.Status != "" {
		query = query.Where("status = ?", f.Status)
	}
	if f.Category != "" {
		query = query.Where("category = ?", f.Category)
	}
	if q := strings.TrimSpace(f.Query); q != "" {
		like := "%" + q + "%"
		query = query.Where("title LIKE ? OR excerpt LIKE ?", like, like)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if f.Limit <= 0 || f.Limit > 50 {
		f.Limit = 24
	}
	if f.Offset < 0 {
		f.Offset = 0
	}

	var posts []domain.Post
	order := "COALESCE(published_at, created_at) DESC, id DESC"
	if err := query.
		Preload("Author").
		Order(order).
		Limit(f.Limit).Offset(f.Offset).
		Find(&posts).Error; err != nil {
		return nil, 0, err
	}
	return posts, total, nil
}

func (r *postRepo) IncrementViews(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Model(&domain.Post{}).
		Where("id = ?", id).
		UpdateColumn("views", gorm.Expr("views + 1")).Error
}

func (r *postRepo) Stats(ctx context.Context) (total, published, drafts int64, views int64, err error) {
	if err = r.db.WithContext(ctx).Model(&domain.Post{}).Count(&total).Error; err != nil {
		return
	}
	if err = r.db.WithContext(ctx).Model(&domain.Post{}).Where("status = ?", domain.PostPublished).Count(&published).Error; err != nil {
		return
	}
	drafts = total - published
	err = r.db.WithContext(ctx).Model(&domain.Post{}).Select("COALESCE(SUM(views), 0)").Scan(&views).Error
	return
}

func (r *postRepo) Categories(ctx context.Context) ([]string, error) {
	var rows []string
	if err := r.db.WithContext(ctx).Model(&domain.Post{}).
		Where("category <> ''").
		Distinct().
		Order("category").
		Pluck("category", &rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}
