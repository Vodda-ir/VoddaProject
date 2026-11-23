package http

import (
	"github.com/gin-gonic/gin"

	"vodda/backend/internal/usecase"
)

func teacherReviewsHandler(teachers *usecase.TeacherUsecase) gin.HandlerFunc {
	return func(c *gin.Context) {
		reviews, err := teachers.MyReviews(c, userID(c))
		if err != nil {
			fail(c, err)
			return
		}
		ok(c, reviews)
	}
}
