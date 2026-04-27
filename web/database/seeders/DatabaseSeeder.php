<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\Notification;
use App\Models\Rating;
use App\Models\Session;
use App\Models\TeacherProfile;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WithdrawRequest;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $admin = User::query()->updateOrCreate(
            ['mobile' => config('vodda.demo.admin_mobile')],
            ['name' => 'مدیر وُدّا', 'active_role' => 'admin'],
        );
        $admin->ensureRole('learner');
        $admin->ensureRole('admin');

        $teacher = User::query()->updateOrCreate(
            ['mobile' => config('vodda.demo.teacher_mobile')],
            ['name' => 'استاد سمیع', 'active_role' => 'teacher'],
        );
        $teacher->ensureRole('learner');
        $teacher->ensureRole('teacher');

        $learner = User::query()->updateOrCreate(
            ['mobile' => config('vodda.demo.learner_mobile')],
            ['name' => 'قرآن‌آموز نمونه', 'active_role' => 'learner'],
        );
        $learner->ensureRole('learner');

        $pendingTeacherUser = User::query()->updateOrCreate(
            ['mobile' => '09000000003'],
            ['name' => 'مداح در انتظار تأیید', 'active_role' => 'teacher'],
        );
        $pendingTeacherUser->ensureRole('learner');
        $pendingTeacherUser->ensureRole('teacher');

        $approvedProfile = TeacherProfile::query()->updateOrCreate(
            ['user_id' => $teacher->id],
            [
                'specialty' => 'قرآن',
                'level' => 'advanced',
                'bio' => 'آموزش تجوید، صوت و لحن با تمرکز بر جلسات منظم هفتگی.',
                'price_per_30min' => 250000,
                'verification_status' => 'approved',
            ],
        );

        TeacherProfile::query()->updateOrCreate(
            ['user_id' => $pendingTeacherUser->id],
            [
                'specialty' => 'مداحی',
                'level' => 'intermediate',
                'bio' => 'مداحی و آموزش مقدماتی برای نوجوانان.',
                'price_per_30min' => 180000,
                'verification_status' => 'pending',
            ],
        );

        $teacherWallet = Wallet::query()->firstOrCreate(
            ['user_id' => $teacher->id],
            ['balance' => 950000],
        );
        $teacherWallet->forceFill(['balance' => 950000])->save();

        $learnerWallet = Wallet::query()->firstOrCreate(
            ['user_id' => $learner->id],
            ['balance' => 650000],
        );
        $learnerWallet->forceFill(['balance' => 650000])->save();

        Transaction::query()->firstOrCreate([
            'wallet_id' => $learnerWallet->id,
            'type' => 'topup',
            'reference_id' => 'seed-learner-topup',
        ], [
            'amount' => 900000,
            'description' => 'seeded topup',
        ]);

        Transaction::query()->firstOrCreate([
            'wallet_id' => $teacherWallet->id,
            'type' => 'payout',
            'reference_id' => 'seed-teacher-income',
        ], [
            'amount' => 250000,
            'description' => 'seeded income',
        ]);

        Transaction::query()->firstOrCreate([
            'wallet_id' => $teacherWallet->id,
            'type' => 'commission',
            'reference_id' => 'seed-teacher-commission',
        ], [
            'amount' => -25000,
            'description' => 'seeded commission',
        ]);

        $completedBooking = Booking::query()->firstOrCreate([
            'learner_id' => $learner->id,
            'teacher_profile_id' => $approvedProfile->id,
            'slot_date' => now()->subDay()->format('Y-m-d'),
            'slot_start' => '10:00:00',
            'slot_end' => '10:30:00',
        ], [
            'status' => 'completed',
            'notes' => 'مرور سوره یاسین',
        ]);

        $acceptedBooking = Booking::query()->firstOrCreate([
            'learner_id' => $learner->id,
            'teacher_profile_id' => $approvedProfile->id,
            'slot_date' => now()->addDay()->format('Y-m-d'),
            'slot_start' => '12:00:00',
            'slot_end' => '12:30:00',
        ], [
            'status' => 'accepted',
            'notes' => 'جلسه بعدی',
        ]);

        Booking::query()->firstOrCreate([
            'learner_id' => $learner->id,
            'teacher_profile_id' => $approvedProfile->id,
            'slot_date' => now()->addDays(2)->format('Y-m-d'),
            'slot_start' => '14:00:00',
            'slot_end' => '14:30:00',
        ], [
            'status' => 'pending',
            'notes' => 'جلسه در انتظار تأیید',
        ]);

        Session::query()->firstOrCreate(
            ['booking_id' => $completedBooking->id],
            ['status' => 'ended', 'started_at' => now()->subDay(), 'ended_at' => now()->subDay()->addMinutes(30)],
        );

        Session::query()->firstOrCreate(
            ['booking_id' => $acceptedBooking->id],
            ['status' => 'scheduled'],
        );

        Rating::query()->firstOrCreate(
            ['booking_id' => $completedBooking->id],
            [
                'learner_id' => $learner->id,
                'teacher_profile_id' => $approvedProfile->id,
                'score' => 5,
                'comment' => 'جلسه بسیار دقیق و منظم بود.',
            ],
        );

        WithdrawRequest::query()->firstOrCreate(
            ['user_id' => $teacher->id, 'amount' => 200000],
            [
                'status' => 'pending',
                'bank_info' => ['card' => '6037990000000000', 'shaba' => 'IR000000000000000000000000'],
            ],
        );

        Notification::query()->firstOrCreate(
            ['user_id' => $teacher->id, 'title' => 'جلسه جدید'],
            ['body' => 'یک جلسه‌ی آینده برای شما ثبت شده است.'],
        );

        Notification::query()->firstOrCreate(
            ['user_id' => $learner->id, 'title' => 'رزرو تأیید شد'],
            ['body' => 'یکی از رزروهای شما توسط استاد پذیرفته شده است.'],
        );
    }
}
