<section class="stack">
    <article class="card">
        <div class="card__header">
            <h1>رزرو جلسه جدید</h1>
        </div>

        <div class="form-grid form-grid--wide">
            <label class="field">
                <span>استاد</span>
                <select wire:model="teacherProfileId">
                    <option value="">انتخاب کنید</option>
                    @foreach($teachers as $teacher)
                        <option value="{{ $teacher['id'] }}">{{ $teacher['name'] }} | {{ $teacher['specialty'] }}</option>
                    @endforeach
                </select>
            </label>

            <label class="field">
                <span>تاریخ</span>
                <input type="date" wire:model="slotDate">
            </label>

            <label class="field">
                <span>شروع</span>
                <input type="time" wire:model="slotStart">
            </label>

            <label class="field">
                <span>پایان</span>
                <input type="time" wire:model="slotEnd">
            </label>

            <label class="field field--full">
                <span>توضیحات</span>
                <textarea wire:model="notes" rows="3" placeholder="اختیاری"></textarea>
            </label>

            <button class="button" wire:click="createBooking" type="button">ثبت رزرو</button>
        </div>
    </article>

    <div class="grid-two">
        <article class="card">
            <div class="card__header">
                <h3>جلسات فعال</h3>
            </div>
            <div class="stack-list">
                @forelse($activeBookings as $booking)
                    <div class="list-row">
                        <strong>{{ $booking['teacher_name'] }}</strong>
                        <span>{{ $booking['slot_date'] }} | {{ $booking['slot_start'] }} تا {{ $booking['slot_end'] }}</span>
                        <span class="badge badge--warning">{{ $booking['status'] }}</span>
                    </div>
                @empty
                    <p class="muted">جلسه فعالی ندارید.</p>
                @endforelse
            </div>
        </article>

        <article class="card">
            <div class="card__header">
                <h3>تاریخچه و امتیاز</h3>
            </div>
            <div class="stack-list">
                @forelse($historyBookings as $booking)
                    <div class="list-row list-row--block">
                        <strong>{{ $booking['teacher_name'] }}</strong>
                        <span>{{ $booking['slot_date'] }} | {{ $booking['status'] }}</span>
                        @if($booking['status'] === 'completed')
                            <textarea wire:model="ratingComments.{{ $booking['id'] }}" rows="2" placeholder="نظر شما"></textarea>
                            <div class="row-actions">
                                <button class="button button--secondary" wire:click="submitRating({{ $booking['id'] }}, 5)" type="button">امتیاز ۵</button>
                                <button class="button button--ghost" wire:click="submitRating({{ $booking['id'] }}, 4)" type="button">امتیاز ۴</button>
                            </div>
                        @endif
                    </div>
                @empty
                    <p class="muted">هنوز تاریخچه‌ای ثبت نشده است.</p>
                @endforelse
            </div>
        </article>
    </div>
</section>
