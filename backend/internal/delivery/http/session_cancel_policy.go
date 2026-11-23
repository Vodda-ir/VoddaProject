package http

import (
	"github.com/gin-gonic/gin"

	"vodda/backend/internal/usecase"
)

func cancelSessionBeforeStartHandler(sessions *usecase.SessionUsecase) gin.HandlerFunc {
	return func(c *gin.Context) {
		session, err := sessions.CancelBeforeStart(c, userID(c), paramID(c))
		if err != nil {
			fail(c, err)
			return
		}
		ok(c, session)
	}
}
