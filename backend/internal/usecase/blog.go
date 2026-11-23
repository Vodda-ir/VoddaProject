package usecase

import (
	"context"
	"strings"
	"time"
	"unicode"

	"vodda/backend/internal/domain"
)

// BlogUsecase manages the platform blog: admin CRUD plus the public
// read-side (published listing, article view counting).
type BlogUsecase struct {
	posts domain.PostRepository
}

// NewBlogUsecase wires the blog usecase to its persistence boundary.
func NewBlogUsecase(posts domain.PostRepository) *BlogUsecase {
	return &BlogUsecase{posts: posts}
}

// PostInput is the admin-facing create/update payload.
type PostInput struct {
	Title    string  `json:"title"`
	Slug     *string `json:"slug"`
	Excerpt  string  `json:"excerpt"`
	Content  string  `json:"content"`
	CoverURL string  `json:"cover_url"`
	Category string  `json:"category"`
	Status   string  `json:"status"`
}

// PostStats powers the admin blog overview cards.
type PostStats struct {
	Total      int64    `json:"total"`
	Published  int64    `json:"published"`
	Drafts     int64    `json:"drafts"`
	Views      int64    `json:"views"`
	Categories []string `json:"categories"`
}

// List returns articles for the admin console (any status).
func (b *BlogUsecase) List(ctx context.Context, status domain.PostStatus, q, category string, limit, offset int) ([]domain.Post, int64, error) {
	return b.posts.List(ctx, domain.PostFilter{
		Status:   status,
		Query:    q,
		Category: category,
		Limit:    limit,
		Offset:   offset,
	})
}

// PublicList returns only published articles, newest first.
func (b *BlogUsecase) PublicList(ctx context.Context, q, category string, limit, offset int) ([]domain.Post, int64, error) {
	return b.posts.List(ctx, domain.PostFilter{
		Public:   true,
		Query:    q,
		Category: category,
		Limit:    limit,
		Offset:   offset,
	})
}

// PublicGetBySlug returns a published article and registers one view.
func (b *BlogUsecase) PublicGetBySlug(ctx context.Context, slug string) (*domain.Post, error) {
	post, err := b.posts.BySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	if post.Status != domain.PostPublished {
		return nil, domain.ErrNotFound
	}
	// Best-effort counter: a failed increment must not break reading.
	_ = b.posts.IncrementViews(ctx, post.ID)
	return post, nil
}

// Get returns any article by ID for editing.
func (b *BlogUsecase) Get(ctx context.Context, id uint) (*domain.Post, error) {
	return b.posts.ByID(ctx, id)
}

// Create persists a new article authored by the given admin.
func (b *BlogUsecase) Create(ctx context.Context, authorID uint, in PostInput) (*domain.Post, error) {
	post := &domain.Post{AuthorID: authorID}
	if err := b.applyInput(ctx, post, in, 0); err != nil {
		return nil, err
	}
	if err := b.posts.Create(ctx, post); err != nil {
		return nil, err
	}
	return post, nil
}

// Update modifies an existing article.
func (b *BlogUsecase) Update(ctx context.Context, id uint, in PostInput) (*domain.Post, error) {
	post, err := b.posts.ByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if err := b.applyInput(ctx, post, in, id); err != nil {
		return nil, err
	}
	if err := b.posts.Update(ctx, post); err != nil {
		return nil, err
	}
	return post, nil
}

// Delete removes an article permanently.
func (b *BlogUsecase) Delete(ctx context.Context, id uint) error {
	return b.posts.Delete(ctx, id)
}

// Stats aggregates blog KPIs for the admin console.
func (b *BlogUsecase) Stats(ctx context.Context) (*PostStats, error) {
	total, published, drafts, views, err := b.posts.Stats(ctx)
	if err != nil {
		return nil, err
	}
	categories, err := b.posts.Categories(ctx)
	if err != nil {
		return nil, err
	}
	return &PostStats{
		Total:      total,
		Published:  published,
		Drafts:     drafts,
		Views:      views,
		Categories: categories,
	}, nil
}

// applyInput validates and maps PostInput onto a Post, generating the slug
// and read-time estimate and maintaining published_at transitions.
func (b *BlogUsecase) applyInput(ctx context.Context, post *domain.Post, in PostInput, excludeID uint) error {
	in.Title = strings.TrimSpace(in.Title)
	if len([]rune(in.Title)) < 3 || len([]rune(in.Title)) > 180 {
		return domain.ErrValidation
	}

	status := domain.PostStatus(strings.TrimSpace(in.Status))
	if status == "" {
		status = domain.PostDraft
	}
	if status != domain.PostDraft && status != domain.PostPublished {
		return domain.ErrValidation
	}
	in.Content = strings.TrimSpace(in.Content)
	if status == domain.PostPublished && strings.Count(in.Content, "") < 20 {
		return domain.ErrValidation
	}

	slug := normalizeSlug(in.Slug, in.Title)
	taken, err := b.posts.SlugTaken(ctx, slug, excludeID)
	if err != nil {
		return err
	}
	if taken {
		return domain.ErrConflict
	}

	// Excerpt falls back to the first ~180 characters of content.
	excerpt := strings.TrimSpace(in.Excerpt)
	if excerpt == "" {
		excerpt = firstRunes(in.Content, 180)
	}

	wasPublished := post.Status == domain.PostPublished && post.PublishedAt != nil
	post.Title = in.Title
	post.Slug = slug
	post.Excerpt = excerpt
	post.Content = in.Content
	post.CoverURL = strings.TrimSpace(in.CoverURL)
	post.Category = strings.TrimSpace(in.Category)
	post.ReadMinutes = readMinutes(in.Content)

	if status == domain.PostPublished && !wasPublished {
		now := time.Now()
		post.PublishedAt = &now
	}
	if status == domain.PostDraft && post.PublishedAt == nil {
		post.PublishedAt = nil
	}
	// Un-publishing keeps the original publish date so the order stays stable.
	post.Status = status
	return nil
}

// normalizeSlug derives a URL-safe, Persian-friendly slug. Persian letters
// are preserved (they are valid in URLs); whitespace/punctuation collapse
// into single dashes. Empty results fall back to a timestamped slug.
func normalizeSlug(requested *string, title string) string {
	source := title
	if requested != nil && strings.TrimSpace(*requested) != "" {
		source = *requested
	}

	var b strings.Builder
	lastDash := true // avoids a leading dash
	for _, r := range strings.ToLower(strings.TrimSpace(source)) {
		switch {
		case unicode.IsLetter(r) || unicode.IsDigit(r):
			b.WriteRune(r)
			lastDash = false
		case r == ' ' || r == '-' || r == '_' || r == '/' || r == '.' || r == '،' || r == '؟':
			if !lastDash {
				b.WriteRune('-')
				lastDash = true
			}
		}
	}
	slug := strings.Trim(b.String(), "-")
	if len(slug) > 190 {
		slug = strings.TrimRight(slug[:190], "-")
	}
	if slug == "" {
		slug = "post-" + time.Now().UTC().Format("20060102150405")
	}
	return slug
}

// readMinutes estimates reading time at ~180 Persian words per minute.
func readMinutes(content string) int {
	words := len(strings.Fields(content))
	if words <= 0 {
		return 1
	}
	minutes := (words + 179) / 180
	if minutes < 1 {
		minutes = 1
	}
	return minutes
}

// firstRunes returns at most n leading runes of s, without cutting words mid-way
// when a space appears shortly before the limit.
func firstRunes(s string, n int) string {
	runes := []rune(strings.TrimSpace(s))
	if len(runes) <= n {
		return string(runes)
	}
	cut := runes[:n]
	if idx := strings.LastIndex(string(cut), " "); idx > n/2 {
		return strings.TrimSpace(string(cut[:idx])) + "…"
	}
	return string(cut) + "…"
}
