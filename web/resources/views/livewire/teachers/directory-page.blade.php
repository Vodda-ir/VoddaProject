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

<section class="stack public-stack">
    <div class="card">
        <div class="section-intro section-intro--compact section-intro--stacked">
            <div>
                <span class="eyebrow">جستجوی عمومی</span>
                <h1>اساتید وُدّا</h1>
                <p>با چند فیلتر ساده، گزینه‌ای را پیدا کنید که با نیاز آموزشی شما هماهنگ باشد.</p>
            </div>

            <div class="results-pill">
                <strong>{{ count($teachers) }}</strong>
                <span>استاد</span>
            </div>
        </div>

        <div class="filters-grid filters-grid--compact">
            <label class="field">
                <span>جستجو</span>
                <input type="text" wire:model.live.debounce.300ms="query" placeholder="نام استاد یا تخصص">
            </label>

            <label class="field">
                <span>حوزه آموزش</span>
                <select wire:model.live="specialty">
                    <option value="">همه</option>
                    <option value="قرآن">قرآن</option>
                    <option value="مداحی">مداحی</option>
                </select>
            </label>

            <label class="field">
                <span>سطح آموزش</span>
                <select wire:model.live="level">
                    <option value="">همه</option>
                    <option value="beginner">مقدماتی</option>
                    <option value="intermediate">میانی</option>
                    <option value="advanced">پیشرفته</option>
                </select>
            </label>
        </div>
    </div>

    <div class="grid-three teacher-grid">
        @forelse($teachers as $teacher)
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

                <p>{{ $teacher['bio'] ?: 'توضیحی برای این استاد ثبت نشده است.' }}</p>

                <div class="teacher-meta">
                    @if($teacher['total_bookings'] > 0)
                        <span class="chip">{{ $teacher['total_bookings'] }} جلسه ثبت‌شده</span>
                    @endif
                    @if(count($teacher['availability_slots']) > 0)
                        <span class="chip">{{ count($teacher['availability_slots']) }} بازه‌ی زمانی در دسترس</span>
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
                <h3>نتیجه‌ای پیدا نشد</h3>
                <p class="muted">عبارت جستجو یا فیلترها را تغییر دهید تا گزینه‌های بیشتری ببینید.</p>
            </div>
        @endforelse
    </div>
</section>
