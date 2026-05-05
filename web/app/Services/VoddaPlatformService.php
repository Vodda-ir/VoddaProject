<?php

namespace App\Services;

use App\Exceptions\VoddaException;
use App\Models\Booking;
use App\Models\Notification;
use App\Models\Rating;
use App\Models\Session;
use App\Models\TeacherProfile;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WithdrawRequest;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class VoddaPlatformService
{
    public function listTeachers(array $filters = [], bool $onlyApproved = true): array
    {
        $query = TeacherProfile::query()
            ->with('user')
            ->with('availabilitySlots')
            ->withAvg('ratings as average_rating', 'score')
            ->withCount('bookings as total_bookings')
            ->latest();

        if ($onlyApproved) {
            $query->where('verification_status', 'approved');
        }

        if ($search = trim((string) ($filters['query'] ?? ''))) {
            $query->where(function (Builder $builder) use ($search): void {
                $builder
                    ->where('specialty', 'like', '%'.$search.'%')
                    ->orWhereHas('user', fn (Builder $userQuery) => $userQuery->where('name', 'like', '%'.$search.'%'));
            });
        }

        if ($specialty = trim((string) ($filters['specialty'] ?? ''))) {
            $query->where('specialty', $specialty);
        }

        if ($level = trim((string) ($filters['level'] ?? ''))) {
            $query->where('level', $level);
        }

        return $query->get()->map(fn (TeacherProfile $teacher) => $this->serializeTeacher($teacher))->all();
    }

    public function getTeacher(int $teacherId): array
    {
        $teacher = TeacherProfile::query()
            ->with('user')
            ->with('availabilitySlots')
            ->withAvg('ratings as average_rating', 'score')
            ->withCount('bookings as total_bookings')
            ->find($teacherId);

        if (! $teacher) {
            throw new VoddaException('استاد موردنظر پیدا نشد.', 404);
        }

        return $this->serializeTeacher($teacher);
    }

    public function getTeacherProfileForUser(User $user): ?array
    {
        $profile = TeacherProfile::query()
            ->with('user')
            ->with('availabilitySlots')
            ->withAvg('ratings as average_rating', 'score')
            ->withCount('bookings as total_bookings')
            ->where('user_id', $user->id)
            ->first();

        return $profile ? $this->serializeTeacher($profile) : null;
    }

    public function upsertTeacherProfile(User $user, array $data): array
    {
        $specialty = trim((string) ($data['specialty'] ?? ''));
        $level = trim((string) ($data['level'] ?? ''));
        $bio = trim((string) ($data['bio'] ?? ''));
        $price = (int) ($data['price_per_30min'] ?? 0);

        if ($specialty === '' || ! in_array($level, ['beginner', 'intermediate', 'advanced'], true) || $price <= 0) {
            throw new VoddaException('اطلاعات پروفایل استاد کامل نیست.', 422);
        }

        $profile = TeacherProfile::query()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'specialty' => $specialty,
                'level' => $level,
                'bio' => $bio,
                'price_per_30min' => $price,
                'verification_status' => 'pending',
            ],
        );

        $user->ensureRole('teacher');

        return $this->getTeacher($profile->id);
    }

    public function updateTeacherVerification(int $teacherId, string $status): array
    {
        if (! in_array($status, ['approved', 'rejected'], true)) {
            throw new VoddaException('وضعیت نامعتبر است.', 422);
        }

        $teacher = TeacherProfile::query()->with('user')->find($teacherId);

        if (! $teacher) {
            throw new VoddaException('پروفایل استاد پیدا نشد.', 404);
        }

        $teacher->forceFill(['verification_status' => $status])->save();

        if ($status === 'approved') {
            $teacher->user->ensureRole('teacher');
        }

        $this->createNotification($teacher->user, 'وضعیت پروفایل استاد', "وضعیت پروفایل شما: {$status}");

        return $this->getTeacher($teacher->id);
    }

    public function listPendingTeachers(): array
    {
        return TeacherProfile::query()
            ->with('user')
            ->with('availabilitySlots')
            ->withAvg('ratings as average_rating', 'score')
            ->withCount('bookings as total_bookings')
            ->where('verification_status', 'pending')
            ->latest()
            ->get()
            ->map(fn (TeacherProfile $teacher) => $this->serializeTeacher($teacher))
            ->all();
    }

    public function createBooking(User $learner, array $data): array
    {
        $teacher = TeacherProfile::query()->with('user')->find((int) ($data['teacher_profile_id'] ?? 0));
        $slotDate = (string) ($data['slot_date'] ?? '');
        $slotStart = $this->normalizeTime((string) ($data['slot_start'] ?? ''));
        $slotEnd = $this->normalizeTime((string) ($data['slot_end'] ?? ''));
        $notes = trim((string) ($data['notes'] ?? ''));

        if (! $teacher) {
            throw new VoddaException('استاد پیدا نشد.', 404);
        }

        if ($teacher->verification_status !== 'approved') {
            throw new VoddaException('استاد هنوز تأیید نشده است.', 409);
        }

        if (! $this->isValidTimeRange($slotStart, $slotEnd) || ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $slotDate)) {
            throw new VoddaException('بازه زمانی رزرو معتبر نیست.', 422);
        }

        $conflict = Booking::query()
            ->where('teacher_profile_id', $teacher->id)
            ->whereDate('slot_date', $slotDate)
            ->where('slot_start', $slotStart)
            ->whereIn('status', ['pending', 'accepted'])
            ->exists();

        if ($conflict) {
            throw new VoddaException('این بازه زمانی قبلاً رزرو شده است.', 409);
        }

        $booking = Booking::query()->create([
            'learner_id' => $learner->id,
            'teacher_profile_id' => $teacher->id,
            'slot_date' => $slotDate,
            'slot_start' => $slotStart,
            'slot_end' => $slotEnd,
            'notes' => $notes,
            'status' => 'pending',
        ]);

        $this->createNotification($teacher->user, 'درخواست جلسه جدید', 'درخواست جدیدی برای جلسه دریافت کردید.');

        return $this->serializeBooking($booking->fresh()->load($this->bookingRelations()));
    }

    public function listLearnerBookings(User $user): array
    {
        return Booking::query()
            ->with($this->bookingRelations())
            ->where('learner_id', $user->id)
            ->latest()
            ->get()
            ->map(fn (Booking $booking) => $this->serializeBooking($booking))
            ->all();
    }

    public function listTeacherBookings(User $user): array
    {
        return Booking::query()
            ->with($this->bookingRelations())
            ->whereHas('teacherProfile', fn (Builder $query) => $query->where('user_id', $user->id))
            ->latest()
            ->get()
            ->map(fn (Booking $booking) => $this->serializeBooking($booking))
            ->all();
    }

    public function acceptBooking(User $teacherUser, int $bookingId): array
    {
        return DB::transaction(function () use ($teacherUser, $bookingId) {
            $booking = Booking::query()->with($this->bookingRelations())->find($bookingId);

            if (! $booking) {
                throw new VoddaException('رزرو پیدا نشد.', 404);
            }

            if ((int) $booking->teacherProfile->user_id !== (int) $teacherUser->id) {
                throw new VoddaException('دسترسی مجاز نیست.', 403);
            }

            if ($booking->status !== 'pending') {
                throw new VoddaException('فقط رزروهای در انتظار قابل تأیید هستند.', 409);
            }

            $conflict = Booking::query()
                ->where('teacher_profile_id', $booking->teacher_profile_id)
                ->whereDate('slot_date', $booking->slot_date)
                ->where('slot_start', $booking->slot_start)
                ->where('status', 'accepted')
                ->whereKeyNot($booking->id)
                ->exists();

            if ($conflict) {
                throw new VoddaException('این بازه زمانی قبلاً تأیید شده است.', 409);
            }

            $booking->forceFill(['status' => 'accepted'])->save();
            $booking->session()->updateOrCreate(
                ['booking_id' => $booking->id],
                ['status' => 'scheduled'],
            );

            $this->createNotification($booking->learner, 'وضعیت رزرو', 'رزرو شما توسط استاد پذیرفته شد.');

            return $this->serializeBooking($booking->fresh()->load($this->bookingRelations()));
        });
    }

    public function rejectBooking(User $teacherUser, int $bookingId, ?string $reason = null): array
    {
        return DB::transaction(function () use ($teacherUser, $bookingId, $reason) {
            $booking = Booking::query()->with($this->bookingRelations())->find($bookingId);

            if (! $booking) {
                throw new VoddaException('رزرو پیدا نشد.', 404);
            }

            if ((int) $booking->teacherProfile->user_id !== (int) $teacherUser->id) {
                throw new VoddaException('دسترسی مجاز نیست.', 403);
            }

            if ($booking->status !== 'pending') {
                throw new VoddaException('فقط رزروهای در انتظار قابل رد هستند.', 409);
            }

            $booking->forceFill([
                'status' => 'rejected',
                'notes' => trim((string) $reason) !== '' ? trim((string) $reason) : $booking->notes,
            ])->save();

            $this->createNotification($booking->learner, 'وضعیت رزرو', 'رزرو شما توسط استاد رد شد.');

            return $this->serializeBooking($booking->fresh()->load($this->bookingRelations()));
        });
    }

    public function generateSessionToken(User $user, int $sessionId): array
    {
        $session = Session::query()->with('booking.teacherProfile.user')->find($sessionId);

        if (! $session) {
            throw new VoddaException('جلسه پیدا نشد.', 404);
        }

        $booking = $session->booking;
        $teacherUserId = $booking->teacherProfile->user_id;

        if (! in_array($user->id, [$booking->learner_id, $teacherUserId], true)) {
            throw new VoddaException('دسترسی مجاز نیست.', 403);
        }

        return [
            'session_id' => $session->id,
            'room_name' => 'booking-'.$booking->id,
            'token' => 'stub-'.$session->id.'-'.$user->id.'-'.now()->timestamp,
            'provider' => 'stub',
        ];
    }

    public function endSession(User $user, int $sessionId): array
    {
        return DB::transaction(function () use ($user, $sessionId) {
            $session = Session::query()->with($this->bookingRelations('booking.'))->find($sessionId);

            if (! $session) {
                throw new VoddaException('جلسه پیدا نشد.', 404);
            }

            $booking = $session->booking;
            $teacherUser = $booking->teacherProfile->user;

            if (! in_array($user->id, [$booking->learner_id, $teacherUser->id], true)) {
                throw new VoddaException('دسترسی مجاز نیست.', 403);
            }

            if ($session->status !== 'ended') {
                $session->forceFill([
                    'status' => 'ended',
                    'ended_at' => now(),
                ])->save();
            }

            if ($booking->status !== 'completed') {
                $this->settleBooking($booking, $teacherUser);
                $booking->forceFill(['status' => 'completed'])->save();
                $this->createNotification($booking->learner, 'پایان جلسه', 'جلسه شما پایان یافت و تسویه انجام شد.');
                $this->createNotification($teacherUser, 'پایان جلسه', 'جلسه پایان یافت و درآمد شما ثبت شد.');
            }

            return $this->serializeBooking($booking->fresh()->load($this->bookingRelations()));
        });
    }

    public function topupInitiate(User $user, int $amount): array
    {
        if ($amount <= 0) {
            throw new VoddaException('مبلغ شارژ معتبر نیست.', 422);
        }

        $referenceId = 'topup_'.$user->id.'_'.now()->timestamp.'_'.random_int(1000, 9999);

        return [
            'reference_id' => $referenceId,
            'amount' => $amount,
            'payment_url' => "https://payment.stub/vodda/{$referenceId}",
            'status' => 'initiated',
        ];
    }

    public function topupVerify(User $user, string $referenceId, int $amount): array
    {
        $referenceId = trim($referenceId);

        if ($referenceId === '' || $amount <= 0) {
            throw new VoddaException('اطلاعات شارژ کیف پول نامعتبر است.', 422);
        }

        return DB::transaction(function () use ($user, $referenceId, $amount) {
            $wallet = $this->ensureWallet($user);

            $existing = Transaction::query()
                ->where('wallet_id', $wallet->id)
                ->where('type', 'topup')
                ->where('reference_id', $referenceId)
                ->first();

            if ($existing) {
                return [
                    'reference_id' => $referenceId,
                    'status' => 'verified',
                    'balance' => (int) $wallet->fresh()->balance,
                    'already_done' => true,
                ];
            }

            $wallet->increment('balance', $amount);
            $wallet->transactions()->create([
                'amount' => $amount,
                'type' => 'topup',
                'reference_id' => $referenceId,
                'description' => 'verified',
            ]);

            return [
                'reference_id' => $referenceId,
                'status' => 'verified',
                'balance' => (int) $wallet->fresh()->balance,
                'already_done' => false,
            ];
        });
    }

    public function walletSnapshot(User $user): array
    {
        $wallet = $this->ensureWallet($user)->load([
            'transactions' => fn ($query) => $query->latest()->limit(100),
        ]);

        return [
            'wallet_id' => $wallet->id,
            'balance' => (int) $wallet->balance,
            'transactions' => $wallet->transactions->map(fn (Transaction $transaction) => $this->serializeTransaction($transaction))->all(),
        ];
    }

    public function createWithdrawRequest(User $user, int $amount, array|string|null $bankInfo = null): array
    {
        if ($amount <= 0) {
            throw new VoddaException('مبلغ برداشت معتبر نیست.', 422);
        }

        return DB::transaction(function () use ($user, $amount, $bankInfo) {
            $wallet = $this->ensureWallet($user);

            if ($wallet->balance < $amount) {
                throw new VoddaException('موجودی کیف پول کافی نیست.', 422);
            }

            $request = WithdrawRequest::query()->create([
                'user_id' => $user->id,
                'amount' => $amount,
                'status' => 'pending',
                'bank_info' => is_array($bankInfo) ? $bankInfo : ['raw' => (string) $bankInfo],
            ]);

            return $this->serializeWithdrawRequest($request->load('user'));
        });
    }

    public function listUserWithdrawRequests(User $user): array
    {
        return WithdrawRequest::query()
            ->with('user')
            ->where('user_id', $user->id)
            ->latest()
            ->get()
            ->map(fn (WithdrawRequest $request) => $this->serializeWithdrawRequest($request))
            ->all();
    }

    public function listWithdrawRequests(?string $status = null): array
    {
        return WithdrawRequest::query()
            ->with('user')
            ->when($status, fn (Builder $query) => $query->where('status', $status))
            ->latest()
            ->get()
            ->map(fn (WithdrawRequest $request) => $this->serializeWithdrawRequest($request))
            ->all();
    }

    public function processWithdrawRequest(int $withdrawRequestId, string $action): array
    {
        $action = strtolower(trim($action));

        if (! in_array($action, ['approved', 'rejected', 'paid'], true)) {
            throw new VoddaException('عملیات برداشت معتبر نیست.', 422);
        }

        return DB::transaction(function () use ($withdrawRequestId, $action) {
            $request = WithdrawRequest::query()->with('user')->find($withdrawRequestId);

            if (! $request) {
                throw new VoddaException('درخواست برداشت پیدا نشد.', 404);
            }

            if (in_array($request->status, ['rejected', 'paid'], true)) {
                throw new VoddaException('این درخواست دیگر قابل پردازش نیست.', 409);
            }

            if ($action === 'paid') {
                $wallet = $this->ensureWallet($request->user);

                if ($wallet->balance < $request->amount) {
                    throw new VoddaException('موجودی کیف پول برای پرداخت برداشت کافی نیست.', 422);
                }

                $wallet->decrement('balance', $request->amount);
                $wallet->transactions()->create([
                    'amount' => -$request->amount,
                    'type' => 'payout',
                    'reference_id' => 'withdraw:'.$request->id,
                    'description' => 'withdraw request paid',
                ]);
            }

            $request->forceFill([
                'status' => $action,
                'processed_at' => now(),
            ])->save();

            $this->createNotification($request->user, 'وضعیت برداشت', "وضعیت درخواست برداشت شما: {$action}");

            return $this->serializeWithdrawRequest($request->fresh()->load('user'));
        });
    }

    public function createRating(User $learner, int $bookingId, int $score, ?string $comment = null): array
    {
        if ($score < 1 || $score > 5) {
            throw new VoddaException('امتیاز باید بین ۱ تا ۵ باشد.', 422);
        }

        $booking = Booking::query()->with('teacherProfile.user')->find($bookingId);

        if (! $booking) {
            throw new VoddaException('رزرو پیدا نشد.', 404);
        }

        if ((int) $booking->learner_id !== (int) $learner->id) {
            throw new VoddaException('شما مجاز به امتیازدهی این جلسه نیستید.', 403);
        }

        if ($booking->status !== 'completed') {
            throw new VoddaException('فقط جلسات تکمیل‌شده قابل امتیازدهی هستند.', 409);
        }

        if (Rating::query()->where('booking_id', $booking->id)->exists()) {
            throw new VoddaException('برای این جلسه قبلاً امتیاز ثبت شده است.', 409);
        }

        $rating = Rating::query()->create([
            'booking_id' => $booking->id,
            'learner_id' => $learner->id,
            'teacher_profile_id' => $booking->teacher_profile_id,
            'score' => $score,
            'comment' => trim((string) $comment),
        ]);

        $this->createNotification($booking->teacherProfile->user, 'امتیاز جدید', 'برای یکی از جلسات شما امتیاز ثبت شد.');

        return $this->serializeRating($rating);
    }

    public function listNotifications(User $user): array
    {
        return $user->notifications()
            ->latest()
            ->limit(100)
            ->get()
            ->map(fn (Notification $notification) => $this->serializeNotification($notification))
            ->all();
    }

    public function markNotificationRead(User $user, int $notificationId): void
    {
        $notification = $user->notifications()->find($notificationId);

        if (! $notification) {
            throw new VoddaException('اعلان پیدا نشد.', 404);
        }

        $notification->forceFill(['read_at' => now()])->save();
    }

    public function serializeTeacher(TeacherProfile $teacher): array
    {
        $teacher->loadMissing(['user', 'availabilitySlots']);

        return [
            'id' => $teacher->id,
            'user_id' => $teacher->user_id,
            'name' => $teacher->user?->name ?? '',
            'specialty' => $teacher->specialty,
            'level' => $teacher->level,
            'bio' => $teacher->bio ?? '',
            'price_per_30min' => (int) $teacher->price_per_30min,
            'verification_status' => $teacher->verification_status,
            'average_rating' => round((float) ($teacher->average_rating ?? 0), 1),
            'total_bookings' => (int) ($teacher->total_bookings ?? $teacher->bookings()->count()),
            'availability_slots' => $teacher->availabilitySlots
                ->sortBy([
                    ['day_of_week', 'asc'],
                    ['start_time', 'asc'],
                ])
                ->map(fn ($slot) => [
                    'day_of_week' => (int) $slot->day_of_week,
                    'start_time' => substr((string) $slot->start_time, 0, 8),
                    'end_time' => substr((string) $slot->end_time, 0, 8),
                ])
                ->values()
                ->all(),
        ];
    }

    public function serializeBooking(Booking $booking): array
    {
        $booking->loadMissing($this->bookingRelations());

        return [
            'id' => $booking->id,
            'learner_id' => $booking->learner_id,
            'learner_name' => $booking->learner?->name ?? '',
            'teacher_profile_id' => $booking->teacher_profile_id,
            'teacher_name' => $booking->teacherProfile?->user?->name ?? '',
            'slot_date' => $booking->slot_date?->format('Y-m-d') ?? (string) $booking->slot_date,
            'slot_start' => substr((string) $booking->slot_start, 0, 8),
            'slot_end' => substr((string) $booking->slot_end, 0, 8),
            'status' => $booking->status,
            'notes' => $booking->notes ?? '',
            'session_id' => $booking->session?->id,
            'created_at' => optional($booking->created_at)->toISOString(),
        ];
    }

    public function serializeTransaction(Transaction $transaction): array
    {
        return [
            'id' => $transaction->id,
            'amount' => (int) $transaction->amount,
            'type' => $transaction->type,
            'reference_id' => $transaction->reference_id ?? '',
            'description' => $transaction->description ?? '',
            'created_at' => optional($transaction->created_at)->toISOString(),
        ];
    }

    public function serializeWithdrawRequest(WithdrawRequest $request): array
    {
        $request->loadMissing('user');

        return [
            'id' => $request->id,
            'user_id' => $request->user_id,
            'user_name' => $request->user?->name ?? '',
            'user_mobile' => $request->user?->mobile ?? '',
            'amount' => (int) $request->amount,
            'status' => $request->status,
            'bank_info' => $request->bank_info ?? [],
            'processed_at' => optional($request->processed_at)->toISOString(),
            'created_at' => optional($request->created_at)->toISOString(),
        ];
    }

    public function serializeRating(Rating $rating): array
    {
        return [
            'id' => $rating->id,
            'booking_id' => $rating->booking_id,
            'learner_id' => $rating->learner_id,
            'teacher_profile_id' => $rating->teacher_profile_id,
            'score' => (int) $rating->score,
            'comment' => $rating->comment ?? '',
            'created_at' => optional($rating->created_at)->toISOString(),
        ];
    }

    public function serializeNotification(Notification $notification): array
    {
        return [
            'id' => $notification->id,
            'title' => $notification->title,
            'body' => $notification->body ?? '',
            'read_at' => optional($notification->read_at)->toISOString(),
            'created_at' => optional($notification->created_at)->toISOString(),
        ];
    }

    protected function bookingRelations(string $prefix = ''): array
    {
        return [
            $prefix.'learner',
            $prefix.'teacherProfile.user',
            $prefix.'session',
        ];
    }

    protected function ensureWallet(User $user): Wallet
    {
        return Wallet::query()->firstOrCreate(
            ['user_id' => $user->id],
            ['balance' => 0],
        );
    }

    protected function createNotification(User $user, string $title, string $body): void
    {
        $user->notifications()->create([
            'title' => $title,
            'body' => $body,
        ]);
    }

    protected function settleBooking(Booking $booking, User $teacherUser): void
    {
        $walletLearner = $this->ensureWallet($booking->learner);
        $walletTeacher = $this->ensureWallet($teacherUser);
        $chargeRef = 'booking:'.$booking->id.':charge';

        if ($walletLearner->transactions()->where('reference_id', $chargeRef)->exists()) {
            return;
        }

        $durationMinutes = $this->diffMinutes((string) $booking->slot_start, (string) $booking->slot_end);
        if ($durationMinutes <= 0) {
            $durationMinutes = 30;
        }

        $units = (int) ceil($durationMinutes / 30);
        $amount = (int) $booking->teacherProfile->price_per_30min * $units;

        if ($amount <= 0) {
            return;
        }

        if ($walletLearner->balance < $amount) {
            throw new VoddaException('موجودی قرآن‌آموز برای تسویه جلسه کافی نیست.', 422);
        }

        $commissionPercent = max(0, min(100, (int) config('vodda.commission_percent', 10)));
        $commission = intdiv($amount * $commissionPercent, 100);

        $walletLearner->decrement('balance', $amount);
        $walletLearner->transactions()->create([
            'amount' => -$amount,
            'type' => 'charge',
            'reference_id' => $chargeRef,
            'description' => 'session charge',
        ]);

        $walletTeacher->increment('balance', $amount);
        $walletTeacher->transactions()->create([
            'amount' => $amount,
            'type' => 'payout',
            'reference_id' => 'booking:'.$booking->id.':payout',
            'description' => 'session income',
        ]);

        if ($commission > 0) {
            $walletTeacher->decrement('balance', $commission);
            $walletTeacher->transactions()->create([
                'amount' => -$commission,
                'type' => 'commission',
                'reference_id' => 'booking:'.$booking->id.':commission',
                'description' => 'platform commission',
            ]);
        }
    }

    protected function isValidTimeRange(string $start, string $end): bool
    {
        return $this->diffMinutes($start, $end) > 0;
    }

    protected function normalizeTime(string $value): string
    {
        $value = trim($value);

        if (preg_match('/^\d{2}:\d{2}$/', $value)) {
            return $value.':00';
        }

        if (preg_match('/^\d{2}:\d{2}:\d{2}$/', $value)) {
            return $value;
        }

        throw new VoddaException('فرمت زمان نامعتبر است.', 422);
    }

    protected function diffMinutes(string $start, string $end): int
    {
        $startTime = Carbon::createFromFormat('H:i:s', $this->normalizeTime($start));
        $endTime = Carbon::createFromFormat('H:i:s', $this->normalizeTime($end));

        if ($endTime->lessThanOrEqualTo($startTime)) {
            return 0;
        }

        return (int) $startTime->diffInMinutes($endTime);
    }
}
