<section class="stack">
    <div class="card">
        <div class="section-intro section-intro--compact">
            <span class="eyebrow">جستجوی عمومی</span>
            <h1>لیست اساتید</h1>
            <p>اساتید تأییدشده را بر اساس نام، تخصص و سطح فیلتر کنید.</p>
        </div>

        <div class="filters-grid">
            <label class="field">
                <span>جستجو</span>
                <input type="text" wire:model.live.debounce.300ms="query" placeholder="نام استاد یا تخصص">
            </label>

            <label class="field">
                <span>تخصص</span>
                <select wire:model.live="specialty">
                    <option value="">همه</option>
                    <option value="قرآن">قرآن</option>
                    <option value="مداحی">مداحی</option>
                </select>
            </label>

            <label class="field">
                <span>سطح</span>
                <select wire:model.live="level">
                    <option value="">همه</option>
                    <option value="beginner">مبتدی</option>
                    <option value="intermediate">متوسط</option>
                    <option value="advanced">پیشرفته</option>
                </select>
            </label>
        </div>
    </div>

    <div class="grid-three">
        @forelse($teachers as $teacher)
            <article class="card card--teacher">
                <div class="card__header">
                    <div>
                        <h3>{{ $teacher['name'] ?: 'استاد #' . $teacher['id'] }}</h3>
                        <p class="muted">{{ $teacher['specialty'] }} | {{ $teacher['level'] }}</p>
                    </div>
                    <span class="badge badge--success">{{ number_format($teacher['average_rating'], 1) }} امتیاز</span>
                </div>
                <p>{{ $teacher['bio'] ?: 'بدون توضیح ثبت‌شده' }}</p>
                <div class="card__footer">
                    <span class="price">{{ number_format($teacher['price_per_30min']) }} تومان / ۳۰ دقیقه</span>
                    <a class="button button--secondary" href="{{ route('app.bookings', ['teacher' => $teacher['id']]) }}">رزرو جلسه</a>
                </div>
            </article>
        @empty
            <div class="card empty-state">
                موردی با این فیلترها پیدا نشد.
            </div>
        @endforelse
    </div>
</section>
