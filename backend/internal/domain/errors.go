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
        ErrInternal               = errors.New("internal server error")
        // فراخوان-specific errors with learner-friendly wording (dispatch UX).
        ErrCallActive             = errors.New("an active dispatch call already exists")
        ErrNoTeachersForTopic     = errors.New("no teachers available for this topic yet")
)
