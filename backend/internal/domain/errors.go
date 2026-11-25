package domain

import "errors"

// Domain-level sentinel errors. Delivery layer maps these to HTTP status codes.
var (
	ErrNotFound               = errors.New("resource not found")
	ErrUnauthorized           = errors.New("unauthorized")
	ErrForbidden              = errors.New("forbidden")
	ErrValidation             = errors.New("validation failed")
	ErrConflict               = errors.New("conflict")
	ErrOTPInvalid             = errors.New("invalid or expired code")
	ErrOTPCooldown            = errors.New("please wait before requesting a new code")
	ErrInsufficient           = errors.New("insufficient wallet balance")
	ErrTeacherNotReady        = errors.New("teacher profile not approved")
	ErrTeacherOffline         = errors.New("teacher is currently offline")
	ErrSampleRequired         = errors.New("a work sample is required for this service")
	ErrTeacherProfileRequired = errors.New("teacher profile required")
	ErrSelfBooking            = errors.New("self booking is not allowed")
	// جلسهٔ فوری و جلسات رایگان — کلیدهای استاد و محدودیت‌های رزرو فوری.
	ErrInstantUnavailable = errors.New("instant sessions are disabled for this teacher")
	ErrFreeUnavailable    = errors.New("free sessions are disabled for this teacher")
	ErrNoInstantTeachers  = errors.New("no teacher with instant sessions for this topic")
	ErrInternal           = errors.New("internal server error")
	// فراخوان-specific errors with learner-friendly wording (dispatch UX).
	ErrCallActive         = errors.New("an active dispatch call already exists")
	ErrNoTeachersForTopic = errors.New("no teachers available for this topic yet")
	// بیگ‌بلوباتن — کلاس زنده روی زیرساخت اشتراک BigBlueButton ایران.
	// NotConfigured: URL/Secret هنوز ثبت نشده‌اند؛ Unreachable: سرویس‌دهنده پاسخ نداد.
	ErrBBBNotConfigured = errors.New("bigbluebutton is not configured")
	ErrBBBUnavailable   = errors.New("bigbluebutton endpoint unreachable")
	// چالش‌های قرآنی — پیام‌های دوستانه برای هر محدودیت چرخهٔ چالش.
	ErrChallengePhase          = errors.New("challenge phase does not allow this action")
	ErrChallengeCapacity       = errors.New("challenge capacity is full")
	ErrChallengeAlreadyJoined  = errors.New("already joined this challenge")
	ErrChallengeNotParticipant = errors.New("join the challenge first")
	ErrChallengeSelfVote       = errors.New("voting for your own submission is not allowed")
	ErrChallengeDuplicateVote  = errors.New("you already voted for this submission")
	ErrChallengeDeadline       = errors.New("challenge deadline has passed")
	ErrChallengeNoSubmission   = errors.New("submission must include text or audio")
)
