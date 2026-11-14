// Package http is the Gin-based delivery layer: routing, middleware and handlers.
package http

import (
        "errors"
        "net/http"

        "github.com/gin-gonic/gin"

        "vodda/backend/internal/domain"
)

func ok(c *gin.Context, data any) {
        c.JSON(http.StatusOK, gin.H{"data": data})
}

func created(c *gin.Context, data any) {
        c.JSON(http.StatusCreated, gin.H{"data": data})
}

func okList(c *gin.Context, items any, total int64) {
        c.JSON(http.StatusOK, gin.H{"data": items, "total": total})
}

// fail maps a domain error to the appropriate HTTP status + message.
func fail(c *gin.Context, err error) {
        status := http.StatusInternalServerError
        msg := "خطای داخلی سرور"

        switch {
        case errors.Is(err, domain.ErrNotFound):
                status, msg = http.StatusNotFound, "موردی یافت نشد"
        case errors.Is(err, domain.ErrUnauthorized):
                status, msg = http.StatusUnauthorized, "احراز هویت لازم است"
        case errors.Is(err, domain.ErrForbidden):
                status, msg = http.StatusForbidden, "دسترسی غیرمجاز"
        case errors.Is(err, domain.ErrValidation):
                status, msg = http.StatusBadRequest, "اطلاعات نامعتبر است"
        case errors.Is(err, domain.ErrConflict):
                status, msg = http.StatusConflict, "این عملیات در وضعیت فعلی ممکن نیست"
        case errors.Is(err, domain.ErrOTPInvalid):
                status, msg = http.StatusBadRequest, "کد تأیید نامعتبر یا منقضی شده است"
        case errors.Is(err, domain.ErrOTPCooldown):
                status, msg = http.StatusTooManyRequests, "لطفاً کمی صبر کنید و دوباره تلاش کنید"
        case errors.Is(err, domain.ErrInsufficient):
                status, msg = http.StatusBadRequest, "موجودی کیف پول کافی نیست"
        case errors.Is(err, domain.ErrTeacherNotReady):
                status, msg = http.StatusBadRequest, "پروفایل استاد هنوز تأیید نشده است"
        case errors.Is(err, domain.ErrCallActive):
                status, msg = http.StatusConflict, "شما یک فراخوان فعال دارید؛ ابتدا همان فراخوان را لغو کنید یا منتظر پاسخ اساتید بمانید"
        case errors.Is(err, domain.ErrNoTeachersForTopic):
                status, msg = http.StatusBadRequest, "هنوز استادی برای این موضوع آمادگی خود را ثبت نکرده است؛ موضوع دیگری را انتخاب کنید یا بعداً دوباره تلاش کنید"
        case errors.Is(err, domain.ErrSampleRequired):
                status, msg = http.StatusBadRequest, "برای پذیرش این مراسم، حداقل یک نمونه صوت در پروفایل شما لازم است"
        case errors.Is(err, domain.ErrTeacherProfileRequired):
                status, msg = http.StatusForbidden, "برای این حساب پروفایل استاد فعال نیست"
        case errors.Is(err, domain.ErrSelfBooking):
                status, msg = http.StatusBadRequest, "نمی‌توانید استاد خودتان را رزرو کنید؛ برای رزرو با حساب قرآن‌آموز وارد شوید"
        }
        c.AbortWithStatusJSON(status, gin.H{"error": msg})
}
