package domain

import "errors"

// Domain-level sentinel errors. Delivery layer maps these to HTTP status codes.
var (
	ErrNotFound        = errors.New("resource not found")
	ErrUnauthorized    = errors.New("unauthorized")
	ErrForbidden       = errors.New("forbidden")
	ErrValidation      = errors.New("validation failed")
	ErrConflict        = errors.New("conflict")
	ErrOTPInvalid      = errors.New("invalid or expired code")
	ErrOTPCooldown     = errors.New("please wait before requesting a new code")
	ErrInsufficient    = errors.New("insufficient wallet balance")
	ErrTeacherNotReady = errors.New("teacher profile not approved")
	ErrTeacherProfileRequired = errors.New("teacher profile required")
	ErrInternal        = errors.New("internal server error")
)
