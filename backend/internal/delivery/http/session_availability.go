package http

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"vodda/backend/internal/domain"
	"vodda/backend/internal/usecase"
)

type availabilitySlotResponse struct {
	StartAt    time.Time `json:"start_at"`
	EndAt      time.Time `json:"end_at"`
	LocalDate  string    `json:"local_date"`
	LocalStart string    `json:"local_start"`
	LocalEnd   string    `json:"local_end"`
	Weekday    int       `json:"weekday"`
}

func teacherAvailabilityHandler(sessions *usecase.SessionUsecase) gin.HandlerFunc {
	return func(c *gin.Context) {
		teacherID := paramID(c)
		serviceValue := c.Query("service_id")
		serviceID64, err := strconv.ParseUint(serviceValue, 10, 64)
		if err != nil || serviceID64 == 0 {
			fail(c, domain.ErrValidation)
			return
		}
		days := 14
		if raw := c.Query("days"); raw != "" {
			parsed, parseErr := strconv.Atoi(raw)
			if parseErr != nil || parsed <= 0 || parsed > 60 {
				fail(c, domain.ErrValidation)
				return
			}
			days = parsed
		}

		slots, err := sessions.AvailableSlots(c, teacherID, uint(serviceID64), days)
		if err != nil {
			fail(c, err)
			return
		}
		response := make([]availabilitySlotResponse, 0, len(slots))
		for _, slot := range slots {
			response = append(response, availabilitySlotResponse{
				StartAt:    slot.StartAt,
				EndAt:      slot.EndAt,
				LocalDate:  slot.LocalDate,
				LocalStart: slot.LocalStart,
				LocalEnd:   slot.LocalEnd,
				Weekday:    slot.Weekday,
			})
		}
		ok(c, response)
	}
}
