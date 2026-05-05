@extends('layouts.app')

@section('title', 'وُدّا | آموزش قرآن و مداحی')

@section('content')
    @php
        $levelLabels = [
            'beginner' => 'مقدماتی',
            'intermediate' => 'میانی',
            'advanced' => 'پیشرفته',
        ];

        $dayLabels = [
            0 => 'یکشنبه',
            1 => 'دوشنبه',
            2 => 'سه‌شنبه',
            3 => 'چهارشنبه',
            4 => 'پنجشنبه',
            5 => 'جمعه',
            6 => 'شنبه',
        ];
    @endphp

    <section class="hero hero--public">
        <div class="hero__content hero__content--public">
            <span class="eyebrow">آموزش منظم و قابل پیگیری</span>
            <h1>استاد مناسب‌تان را پیدا کنید و جلسه‌ی بعدی را بدون شلوغی هماهنگ کنید.</h1>
            <p class="hero__lede">
                وُدّا برای آموزش قرآن و مداحی ساخته شده تا انتخاب استاد، ثبت درخواست جلسه
                و پیگیری وضعیت کلاس‌ها در یک مسیر ساده و روشن انجام شود.
            </p>

            <div class="hero__actions">
                <a class="button" href="{{ route('teachers.index') }}">دیدن اساتید</a>
                <a class="button button--ghost" href="{{ route('login') }}">ورود</a>
            </div>

            <div class="hero-badges">
                <span class="badge-pill">انتخاب استاد بر اساس نیاز شما</span>
                <span class="badge-pill">درخواست جلسه در چند قدم</span>
                <span class="badge-pill">پیگیری و امتیازدهی پس از کلاس</span>
            </div>
        </div>

        <div class="hero__panel hero__panel--public">
            <article class="card card--accent overview-card">
                <span class="eyebrow">نمای سریع</span>
                <h3>همه‌چیز برای شروع آماده است</h3>
                <p class="muted">
                    از پیدا کردن استاد تا ثبت بازخورد بعد از جلسه، مسیر یادگیری طوری چیده شده
                    که کاربر درگیر جزئیات اضافه نشود.
                </p>

                <div class="metric-strip">
                    <div class="metric">
                        <strong>{{ $approvedTeachersCount }}</strong>
                        <span>استاد آماده‌ی رزرو</span>
                    </div>
                    <div class="metric">
                        <strong>{{ $availabilitySlotsCount }}</strong>
                        <span>بازه‌ی زمانی پیشنهادی</span>
                    </div>
                    <div class="metric">
                        <strong>{{ $averageRating > 0 ? number_format($averageRating, 1) : 'جدید' }}</strong>
                        <span>میانگین رضایت</span>
                    </div>
                </div>
            </article>

            <article class="card">
                <h3>مسیر کار در وُدّا</h3>
                <div class="info-list">
                    <div class="info-list__item">
                        <strong>۱. استاد را انتخاب کنید</strong>
                        <p class="muted">فهرست اساتید را ببینید و گزینه‌ای را انتخاب کنید که با سبک آموزش شما هماهنگ است.</p>
                    </div>
                    <div class="info-list__item">
                        <strong>۲. درخواست جلسه بدهید</strong>
                        <p class="muted">زمان مناسب را انتخاب کنید و روند هماهنگی را از داخل حساب خودتان دنبال کنید.</p>
                    </div>
                    <div class="info-list__item">
                        <strong>۳. نتیجه را ثبت کنید</strong>
                        <p class="muted">بعد از کلاس، وضعیت جلسه و نظر خودتان را در همان مسیر ثبت و پیگیری کنید.</p>
                    </div>
                </div>
            </article>
        </div>
    </section>

    <section class="feature-grid">
        <article class="card feature-card">
            <span class="eyebrow">انتخاب</span>
            <h3>جستجوی ساده و هدفمند</h3>
            <p class="muted">
                بر اساس نام استاد، حوزه‌ی آموزش یا سطح مدنظر خودتان جستجو کنید
                و سریع‌تر به گزینه‌ی مناسب برسید.
            </p>
        </article>

        <article class="card feature-card">
            <span class="eyebrow">هماهنگی</span>
            <h3>رزرو شفاف و مرحله‌به‌مرحله</h3>
            <p class="muted">
                درخواست شما ثبت می‌شود، وضعیت آن قابل پیگیری است
                و هیچ بخش مهمی در میان پیام‌ها یا تماس‌های پراکنده گم نمی‌شود.
            </p>
        </article>

        <article class="card feature-card">
            <span class="eyebrow">پیگیری</span>
            <h3>یک حساب برای کل مسیر</h3>
            <p class="muted">
                از مشاهده‌ی رزروها تا پیگیری جلسات و ثبت نظر، همه‌چیز در حساب شما جمع شده است.
            </p>
        </article>
    </section>

    <section class="stack public-stack">
        <div class="section-intro section-intro--compact section-intro--stacked">
            <div>
                <span class="eyebrow">چند انتخاب برای شروع</span>
                <h2>اساتیدی که همین حالا می‌توانید بررسی کنید</h2>
                <p>این چند گزینه از میان اساتید فعال انتخاب شده‌اند تا تصویر روشن‌تری از فضای وُدّا داشته باشید.</p>
            </div>
            <a class="button button--ghost" href="{{ route('teachers.index') }}">همه اساتید</a>
        </div>

        <div class="grid-three teacher-grid">
            @forelse($featuredTeachers as $teacher)
                <article class="card card--teacher">
                    <div class="card__header">
                        <div>
                            <h3>{{ $teacher['name'] ?: 'استاد #' . $teacher['id'] }}</h3>
                            <p class="muted">{{ $teacher['specialty'] }} · {{ $levelLabels[$teacher['level']] ?? 'همه سطوح' }}</p>
                        </div>

                        @if($teacher['average_rating'] > 0)
                            <span class="badge badge--success">{{ number_format($teacher['average_rating'], 1) }} از ۵</span>
                        @else
                            <span class="badge">تازه اضافه شده</span>
                        @endif
                    </div>

                    <p>{{ $teacher['bio'] ?: 'جلسات با هماهنگی و بر اساس نیاز آموزشی شما برنامه‌ریزی می‌شود.' }}</p>

                    <div class="teacher-meta">
                        @if($teacher['total_bookings'] > 0)
                            <span class="chip">{{ $teacher['total_bookings'] }} جلسه ثبت‌شده</span>
                        @endif
                        @if(count($teacher['availability_slots']) > 0)
                            <span class="chip">{{ count($teacher['availability_slots']) }} بازه‌ی زمانی آماده</span>
                        @endif
                    </div>

                    @if(count($teacher['availability_slots']) > 0)
                        <div class="schedule-list">
                            @foreach(array_slice($teacher['availability_slots'], 0, 2) as $slot)
                                <span class="schedule-chip">
                                    {{ $dayLabels[$slot['day_of_week']] ?? 'روز دیگر' }}
                                    ·
                                    {{ substr($slot['start_time'], 0, 5) }}
                                    تا
                                    {{ substr($slot['end_time'], 0, 5) }}
                                </span>
                            @endforeach
                        </div>
                    @endif

                    <div class="card__footer">
                        <span class="price">{{ number_format($teacher['price_per_30min']) }} تومان برای هر نیم‌ساعت</span>
                        <a class="button button--secondary" href="{{ route('app.bookings', ['teacher' => $teacher['id']]) }}">درخواست جلسه</a>
                    </div>
                </article>
            @empty
                <div class="card empty-state">
                    <h3>فهرست اساتید به‌زودی در این بخش نمایش داده می‌شود.</h3>
                    <p class="muted">در حال حاضر می‌توانید از مسیر اساتید یا ورود به حساب، ادامه‌ی کار را پیش ببرید.</p>
                </div>
            @endforelse
        </div>
    </section>

    <section class="cta-band">
        <div>
            <span class="eyebrow">ادامه مسیر</span>
            <h2>اگر انتخاب‌تان را پیدا کرده‌اید، بقیه‌ی مسیر از همین‌جا شروع می‌شود.</h2>
            <p class="muted">
                با ورود به حساب، می‌توانید درخواست جلسه ثبت کنید، پاسخ استاد را ببینید
                و وضعیت کلاس‌ها را مرحله‌به‌مرحله دنبال کنید.
            </p>
        </div>

        <a class="button button--secondary" href="{{ route('login') }}">ورود و ادامه</a>
    </section>
@endsection
