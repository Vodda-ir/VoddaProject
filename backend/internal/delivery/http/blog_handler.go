package http

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"vodda/backend/internal/domain"
	"vodda/backend/internal/usecase"
)

// ─────────────────────────── Public blog ───────────────────────────

// BlogList serves published articles to visitors.
func (h *Handler) BlogList(c *gin.Context) {
	posts, total, err := h.Blog.PublicList(c, c.Query("q"), c.Query("category"), queryInt(c, "limit", 12), queryInt(c, "offset", 0))
	if err != nil {
		fail(c, err)
		return
	}
	okList(c, posts, total)
}

// BlogPostBySlug serves one published article and counts the view.
func (h *Handler) BlogPostBySlug(c *gin.Context) {
	post, err := h.Blog.PublicGetBySlug(c, c.Param("slug"))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, post)
}

// ─────────────────────────── Admin blog ───────────────────────────

// AdminPosts lists every article (drafts included) for the console.
func (h *Handler) AdminPosts(c *gin.Context) {
	posts, total, err := h.Blog.List(c,
		domain.PostStatus(c.Query("status")),
		c.Query("q"),
		c.Query("category"),
		queryInt(c, "limit", 30),
		queryInt(c, "offset", 0),
	)
	if err != nil {
		fail(c, err)
		return
	}
	okList(c, posts, total)
}

// AdminPostStats returns blog KPIs and known categories.
func (h *Handler) AdminPostStats(c *gin.Context) {
	stats, err := h.Blog.Stats(c)
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, stats)
}

// AdminGetPost returns a single article for editing.
func (h *Handler) AdminGetPost(c *gin.Context) {
	post, err := h.Blog.Get(c, paramID(c))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, post)
}

// AdminCreatePost creates a new article.
func (h *Handler) AdminCreatePost(c *gin.Context) {
	var in usecase.PostInput
	if err := c.ShouldBindJSON(&in); err != nil {
		fail(c, domain.ErrValidation)
		return
	}
	post, err := h.Blog.Create(c, userID(c), in)
	if err != nil {
		fail(c, err)
		return
	}
	created(c, post)
}

// AdminUpdatePost updates an existing article.
func (h *Handler) AdminUpdatePost(c *gin.Context) {
	var in usecase.PostInput
	if err := c.ShouldBindJSON(&in); err != nil {
		fail(c, domain.ErrValidation)
		return
	}
	post, err := h.Blog.Update(c, paramID(c), in)
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, post)
}

// AdminDeletePost permanently removes an article.
func (h *Handler) AdminDeletePost(c *gin.Context) {
	if err := h.Blog.Delete(c, paramID(c)); err != nil {
		fail(c, err)
		return
	}
	ok(c, gin.H{"deleted": true})
}

// AdminUploadPostImage stores a cover image and returns its public path.
func (h *Handler) AdminUploadPostImage(c *gin.Context) {
	file, header, err := c.Request.FormFile("image")
	if err != nil {
		fail(c, domain.ErrValidation)
		return
	}
	defer file.Close()

	if header.Size > 4<<20 {
		fail(c, domain.ErrValidation)
		return
	}
	ext := strings.ToLower(filepath.Ext(header.Filename))
	switch ext {
	case ".jpg", ".jpeg", ".png", ".webp":
	default:
		fail(c, domain.ErrValidation)
		return
	}

	uploadDir := "uploads/blog"
	if err := os.MkdirAll(uploadDir, 0o755); err != nil {
		fail(c, domain.ErrInternal)
		return
	}
	filename := fmt.Sprintf("post_%d%s", time.Now().UnixNano(), ext)
	savePath := filepath.Join(uploadDir, filename)
	dst, err := os.OpenFile(savePath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o644)
	if err != nil {
		fail(c, domain.ErrInternal)
		return
	}
	_, copyErr := io.Copy(dst, file)
	closeErr := dst.Close()
	if copyErr != nil || closeErr != nil {
		_ = os.Remove(savePath)
		fail(c, domain.ErrInternal)
		return
	}
	ok(c, gin.H{"url": "/" + filepath.ToSlash(savePath)})
}
