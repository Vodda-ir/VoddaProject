<section class="stack">
    <div class="hero hero--panel">
        <div class="hero__content">
            <span class="eyebrow">پنل قرآن‌آموز</span>
            <h1>{{ auth()->user()->name ?: 'خوش آمدید' }}</h1>
            <p>
                از اینجا می‌توانید رزروهای فعال، اعلان‌های اخیر و وضعیت نقش‌ها را دنبال کنید.
            </p>
        </div>
        <div class="hero__panel">
            <div class="card">
                <h3>وضعیت نقش‌ها</h3>
                <div class="role-pills role-pills--static">
                    @foreach(auth()->user()->fresh('roles')->roleNames() as $role)
                        <span class="pill {{ auth()->user()->active_role === $role ? 'pill--active' : '' }}">{{ $role }}</span>
                    @endforeach
                </div>
                @if($teacherProfile)
                    <p class="muted">وضعیت پروفایل استاد: {{ $teacherProfile['verification_status'] }}</p>
                @endif
            </div>
        </div>
    </div>

    <div class="grid-two">
        <article class="card">
            <div class="card__header">
                <h3>جلسات فعال</h3>
                <a class="button button--ghost" href="{{ route('app.bookings') }}">مدیریت رزروها</a>
            </div>
            <div class="stack-list">
                @forelse($activeBookings as $booking)
                    <div class="list-row">
                        <strong>{{ $booking['teacher_name'] }}</strong>
                        <span>{{ $booking['slot_date'] }} | {{ $booking['slot_start'] }} تا {{ $booking['slot_end'] }}</span>
                        <span class="badge badge--warning">{{ $booking['status'] }}</span>
                    </div>
                @empty
                    <p class="muted">جلسه فعالی وجود ندارد.</p>
                @endforelse
            </div>
        </article>

        <article class="card">
            <div class="card__header">
                <h3>اعلان‌های اخیر</h3>
            </div>
            <div class="stack-list">
                @forelse($notifications as $notification)
                    <div class="list-row">
                        <strong>{{ $notification['title'] }}</strong>
                        <span>{{ $notification['body'] }}</span>
                    </div>
                @empty
                    <p class="muted">اعلانی ثبت نشده است.</p>
                @endforelse
            </div>
        </article>
    </div>

    <article class="card">
        <div class="card__header">
            <h3>تاریخچه کوتاه</h3>
        </div>
        <div class="stack-list">
            @forelse($historyBookings as $booking)
                <div class="list-row">
                    <strong>{{ $booking['teacher_name'] }}</strong>
                    <span>{{ $booking['slot_date'] }} | {{ $booking['status'] }}</span>
                </div>
            @empty
                <p class="muted">هنوز تاریخچه‌ای ثبت نشده است.</p>
            @endforelse
        </div>
    </article>
</section>
