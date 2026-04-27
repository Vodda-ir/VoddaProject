<section class="stack">
    <div class="hero hero--panel">
        <div class="hero__content">
            <span class="eyebrow">پنل استاد</span>
            <h1>{{ auth()->user()->name ?: 'استاد وُدّا' }}</h1>
            <p>مرور سریع رزروها، کیف پول و وضعیت تأیید پروفایل.</p>
        </div>
        <div class="hero__panel">
            <div class="card">
                <h3>وضعیت پروفایل</h3>
                <p class="price">{{ $teacherProfile['verification_status'] ?? 'ثبت نشده' }}</p>
                <p class="muted">موجودی: {{ number_format($wallet['balance']) }} تومان</p>
            </div>
        </div>
    </div>

    <div class="stats-grid">
        <article class="card stat-card">
            <span class="stat-card__label">در انتظار</span>
            <strong>{{ $pendingCount }}</strong>
        </article>
        <article class="card stat-card">
            <span class="stat-card__label">تأییدشده</span>
            <strong>{{ $acceptedCount }}</strong>
        </article>
        <article class="card stat-card">
            <span class="stat-card__label">تکمیل‌شده</span>
            <strong>{{ $completedCount }}</strong>
        </article>
    </div>

    <article class="card">
        <div class="card__header">
            <h3>آخرین رزروها</h3>
        </div>
        <div class="stack-list">
            @forelse($latestBookings as $booking)
                <div class="list-row">
                    <strong>{{ $booking['learner_name'] }}</strong>
                    <span>{{ $booking['slot_date'] }} | {{ $booking['status'] }}</span>
                </div>
            @empty
                <p class="muted">رزروی برای نمایش وجود ندارد.</p>
            @endforelse
        </div>
    </article>
</section>
