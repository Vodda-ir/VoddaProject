<section class="auth-shell">
    <div class="card auth-card">
        <span class="eyebrow">ورود با OTP</span>
        <h1>ورود به وُدّا</h1>
        <p class="muted">
            برای اجرای محلی، کد پیش‌فرض OTP برابر <strong>12345</strong> است.
        </p>

        <div class="form-grid">
            <label class="field">
                <span>شماره موبایل</span>
                <input type="text" wire:model.defer="mobile" placeholder="09123456789">
            </label>

            <button class="button" wire:click="requestOtp" type="button">دریافت کد</button>
        </div>

        @if($otpRequested)
            <div class="form-grid">
                <label class="field">
                    <span>کد تأیید</span>
                    <input type="text" wire:model.defer="code" placeholder="12345">
                </label>

                <button class="button button--secondary" wire:click="verifyOtp" type="button">ورود</button>
            </div>
        @endif

        @error('app') <div class="flash flash--error">{{ $message }}</div> @enderror

        <div class="note">
            <strong>شماره‌های نمونه seed:</strong>
            <span>`09136336002` ادمین</span>
            <span>`09135550011` استاد</span>
            <span>`09914932678` قرآن‌آموز</span>
        </div>
    </div>
</section>
