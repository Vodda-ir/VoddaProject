@php
    $maskedMobile = preg_match('/^(\d{4})\d{3}(\d{4})$/', $mobile)
        ? preg_replace('/^(\d{4})\d{3}(\d{4})$/', '$1***$2', $mobile)
        : $mobile;
@endphp

<section class="auth-shell">
    <div
        class="card auth-card auth-card--login"
        data-auth-login
        data-otp-open="{{ $otpRequested ? '1' : '0' }}"
        data-otp-expires-at="{{ $otpExpiresAt ?? '' }}"
    >
        <span class="eyebrow">ورود به وُدّا</span>
        <h1 class="auth-card__title">{{ $otpRequested ? 'کد تأیید را وارد کنید' : 'شماره موبایل‌تان را وارد کنید' }}</h1>
        <p class="muted auth-card__lead">
            @if($otpRequested)
                کد تأیید برای همین شماره ارسال شده و تا دو دقیقه معتبر می‌ماند.
            @else
                کد تأیید برای همین شماره ارسال می‌شود و تا دو دقیقه معتبر می‌ماند.
            @endif
        </p>

        @if($otpMessage)
            <div class="flash {{ $otpReusedExistingCode ? 'flash--info' : 'flash--success' }} auth-card__flash">
                {{ $otpMessage }}
            </div>
        @endif

        <div class="auth-form">
            <label class="field field--full">
                <span>شماره موبایل</span>
                <input
                    class="auth-input auth-input--mobile"
                    type="text"
                    wire:model.defer="mobile"
                    placeholder="09123456789"
                    inputmode="tel"
                    autocomplete="tel"
                    dir="ltr"
                    @disabled($otpRequested)
                >
            </label>

            @if(! $otpRequested)
                <button
                    class="button auth-submit"
                    wire:click="requestOtp"
                    wire:loading.attr="disabled"
                    wire:target="requestOtp"
                    type="button"
                >
                    <span wire:loading.remove wire:target="requestOtp">ارسال کد تأیید</span>
                    <span wire:loading wire:target="requestOtp">در حال ارسال...</span>
                </button>
            @else
                <div class="auth-mobile-state">
                    {{-- <span class="auth-mobile-state__label">شماره ثبت شد: {{ $maskedMobile !== '' ? $maskedMobile : $mobile }}</span> --}}
                    <button
                        class="button button--ghost auth-edit-mobile"
                        wire:click="resetOtpFlow"
                        wire:loading.attr="disabled"
                        type="button"
                    >
                        ویرایش شماره
                    </button>
                </div>
            @endif
        </div>

        <div class="auth-otp-panel {{ $otpRequested ? 'is-open' : '' }}" aria-hidden="{{ $otpRequested ? 'false' : 'true' }}">
            <div class="auth-otp-panel__inner">
                <div class="auth-divider">
                    <span>تأیید شماره</span>
                </div>

                <div class="auth-otp-copy">
                    <strong>کد تأیید را وارد کنید</strong>
                    <p class="muted">
                        @if($maskedMobile !== '')
                            کد برای شماره {{ $maskedMobile }} ارسال شده است.
                        @else
                            بعد از دریافت پیام، کد را در این بخش وارد کنید.
                        @endif
                    </p>
                </div>

                {{-- <div class="auth-panel-meta">
                    <span class="muted auth-panel-meta__hint">بعد از پایان این زمان، دوباره باید کد بگیرید.</span>
                </div> --}}
                                    <span class="auth-countdown" data-otp-countdown>۲:۰۰</span>


                <div class="auth-form auth-form--otp">
                    <label class="field field--full">
                        <span>کد تأیید</span>
                        <input
                            class="auth-input auth-input--otp"
                            type="text"
                            wire:model.defer="code"
                            placeholder="12345"
                            inputmode="numeric"
                            autocomplete="one-time-code"
                            dir="ltr"
                            data-otp-input
                            @disabled(! $otpRequested)
                        >
                    </label>

                    <div class="auth-form__actions">
                        <button
                            class="button button--secondary auth-submit"
                            wire:click="verifyOtp"
                            wire:loading.attr="disabled"
                            wire:target="verifyOtp"
                            type="button"
                            @disabled(! $otpRequested)
                        >
                            <span wire:loading.remove wire:target="verifyOtp">تأیید و ورود</span>
                            <span wire:loading wire:target="verifyOtp">در حال بررسی...</span>
                        </button>

                        <button
                            class="button button--ghost auth-resend"
                            wire:click="requestOtp"
                            wire:loading.attr="disabled"
                            wire:target="requestOtp"
                            type="button"
                            @disabled(! $otpRequested)
                        >
                            ارسال دوباره کد
                        </button>
                    </div>
                </div>
            </div>
        </div>

        @error('app')
            <div class="flash flash--error auth-card__flash">{{ $message }}</div>
        @enderror
    </div>
</section>

@script
<script>
    (() => {
        const root = document.querySelector('[data-auth-login]');
        let otpTimer = null;

        const formatOtpCountdown = (totalSeconds) => {
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        };

        const syncOtpCountdown = () => {
            if (!root) return;

            const countdownNode = root.querySelector('[data-otp-countdown]');
            const isOpen = root.dataset.otpOpen === '1';
            const expiresAtRaw = root.dataset.otpExpiresAt ?? '';

            if (otpTimer) {
                window.clearInterval(otpTimer);
                otpTimer = null;
            }

            if (!countdownNode || !isOpen || !expiresAtRaw) {
                if (countdownNode) {
                    countdownNode.textContent = '۲:۰۰';
                }
                return;
            }

            const expiresAt = new Date(expiresAtRaw);
            if (Number.isNaN(expiresAt.getTime())) {
                countdownNode.textContent = '۲:۰۰';
                return;
            }

            const tick = () => {
                const remainingSeconds = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));
                countdownNode.textContent = formatOtpCountdown(remainingSeconds);

                if (remainingSeconds <= 0) {
                    window.clearInterval(otpTimer);
                    otpTimer = null;
                    $wire.collapseOtp();
                }
            };

            tick();
            otpTimer = window.setInterval(tick, 1000);
        };

        syncOtpCountdown();

        $wire.on('vodda-otp-requested', () => {
            window.setTimeout(() => {
                syncOtpCountdown();
                root?.querySelector('[data-otp-input]')?.focus();
            }, 220);
        });
    })();
</script>
@endscript
