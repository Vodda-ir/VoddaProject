<section class="stack">
    <article class="card">
        <div class="card__header">
            <h1>اساتید در انتظار تأیید</h1>
        </div>

        <div class="grid-two">
            @forelse($teachers as $teacher)
                <article class="card card--subtle">
                    <div class="card__header">
                        <div>
                            <strong>{{ $teacher['name'] ?: 'استاد #' . $teacher['id'] }}</strong>
                            <p class="muted">{{ $teacher['specialty'] }} | {{ $teacher['level'] }}</p>
                        </div>
                        <span class="price">{{ number_format($teacher['price_per_30min']) }} تومان</span>
                    </div>
                    <p>{{ $teacher['bio'] ?: 'بیو ثبت نشده است.' }}</p>
                    <div class="row-actions">
                        <button class="button button--secondary" wire:click="approve({{ $teacher['id'] }})" type="button">تأیید</button>
                        <button class="button button--ghost" wire:click="reject({{ $teacher['id'] }})" type="button">رد</button>
                    </div>
                </article>
            @empty
                <p class="muted">موردی در صف بررسی وجود ندارد.</p>
            @endforelse
        </div>
    </article>
</section>
