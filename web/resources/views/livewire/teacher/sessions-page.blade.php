<section class="stack">
    <article class="card">
        <div class="card__header">
            <h1>مدیریت جلسات استاد</h1>
        </div>

        <div class="stack-list">
            @forelse($bookings as $booking)
                <div class="list-row list-row--block">
                    <div class="card__header">
                        <div>
                            <strong>{{ $booking['learner_name'] }}</strong>
                            <p class="muted">{{ $booking['slot_date'] }} | {{ $booking['slot_start'] }} تا {{ $booking['slot_end'] }}</p>
                        </div>
                        <span class="badge badge--warning">{{ $booking['status'] }}</span>
                    </div>

                    @if($booking['status'] === 'pending')
                        <textarea wire:model="rejectReasons.{{ $booking['id'] }}" rows="2" placeholder="در صورت رد، دلیل را بنویسید"></textarea>
                        <div class="row-actions">
                            <button class="button button--secondary" wire:click="accept({{ $booking['id'] }})" type="button">پذیرش</button>
                            <button class="button button--ghost" wire:click="reject({{ $booking['id'] }})" type="button">رد</button>
                        </div>
                    @endif

                    @if($booking['status'] === 'accepted' && $booking['session_id'])
                        <div class="row-actions">
                            <button class="button button--ghost" wire:click="generateToken({{ $booking['session_id'] }})" type="button">توکن جلسه</button>
                            <button class="button" wire:click="endSession({{ $booking['session_id'] }})" type="button">پایان جلسه</button>
                        </div>
                    @endif
                </div>
            @empty
                <p class="muted">درخواستی برای جلسه ثبت نشده است.</p>
            @endforelse
        </div>
    </article>

    @if($lastToken)
        <article class="card">
            <div class="card__header">
                <h3>توکن جلسه آزمایشی</h3>
            </div>
            <pre class="code-block">{{ json_encode($lastToken, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) }}</pre>
        </article>
    @endif
</section>
