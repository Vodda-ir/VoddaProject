package http

import (
	"github.com/gin-gonic/gin"

	"vodda/backend/internal/domain"
	"vodda/backend/internal/usecase"
)

func learnerSessionDisplaysHandler(sessions *usecase.SessionUsecase) gin.HandlerFunc {
	return func(c *gin.Context) {
		items, err := sessions.LearnerSessionDisplays(c, userID(c), c.Query("when"))
		if err != nil {
			fail(c, err)
			return
		}
		ok(c, items)
	}
}

func teacherSessionDisplaysHandler(sessions *usecase.SessionUsecase) gin.HandlerFunc {
	return func(c *gin.Context) {
		var statuses []domain.SessionStatus
		switch c.Query("when") {
		case "pending":
			statuses = []domain.SessionStatus{domain.SessionPending}
		case "upcoming":
			statuses = []domain.SessionStatus{domain.SessionPending, domain.SessionConfirmed}
		case "past":
			statuses = []domain.SessionStatus{domain.SessionDone, domain.SessionCanceled}
		}
		items, err := sessions.TeacherSessionDisplays(c, userID(c), statuses, c.Query("mark_seen") == "1")
		if err != nil {
			fail(c, err)
			return
		}
		ok(c, items)
	}
}

func adminSessionDisplaysHandler(sessions *usecase.SessionUsecase) gin.HandlerFunc {
	return func(c *gin.Context) {
		status := domain.SessionStatus(c.Query("status"))
		items, total, err := sessions.AdminSessionDisplays(c, status, queryInt(c, "limit", 30), queryInt(c, "offset", 0))
		if err != nil {
			fail(c, err)
			return
		}
		okList(c, items, total)
	}
}
