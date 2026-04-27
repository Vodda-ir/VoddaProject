<section class="stack">
    <div class="grid-two">
        <article class="card">
            <div class="card__header">
                <h1>پروفایل کاربری</h1>
            </div>
            <div class="form-grid">
                <label class="field">
                    <span>نام</span>
                    <input type="text" wire:model="name">
                </label>
                <div class="field">
                    <span>شماره موبایل</span>
                    <div class="read-only">{{ auth()->user()->mobile }}</div>
                </div>
                <button class="button" wire:click="saveProfile" type="button">ذخیره پروفایل</button>
            </div>
        </article>

        <article class="card">
            <div class="card__header">
                <h3>نقش‌های فعال</h3>
            </div>
            <div class="role-pills role-pills--static">
                @foreach($roleNames as $role)
                    <span class="pill {{ auth()->user()->active_role === $role ? 'pill--active' : '' }}">{{ $role }}</span>
                @endforeach
            </div>
            <p class="muted">تغییر نقش فعال از هدر بالای صفحه انجام می‌شود.</p>
        </article>
    </div>

    <article class="card">
        <div class="card__header">
            <h3>پروفایل استاد</h3>
            @if($teacherProfile)
                <span class="badge badge--warning">{{ $teacherProfile['verification_status'] }}</span>
            @endif
        </div>

        <div class="form-grid form-grid--wide">
            <label class="field">
                <span>تخصص</span>
                <input type="text" wire:model="specialty" placeholder="قرآن یا مداحی">
            </label>
            <label class="field">
                <span>سطح</span>
                <select wire:model="level">
                    <option value="beginner">مبتدی</option>
                    <option value="intermediate">متوسط</option>
                    <option value="advanced">پیشرفته</option>
                </select>
            </label>
            <label class="field">
                <span>قیمت هر ۳۰ دقیقه</span>
                <input type="number" wire:model="pricePer30min" min="10000" step="10000">
            </label>
            <label class="field field--full">
                <span>بیو</span>
                <textarea wire:model="bio" rows="4"></textarea>
            </label>
            <button class="button button--secondary" wire:click="saveTeacherProfile" type="button">ثبت/به‌روزرسانی پروفایل استاد</button>
        </div>
    </article>
</section>
