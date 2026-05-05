<?php

namespace Database\Seeders;

use App\Models\AvailabilitySlot;
use App\Models\Booking;
use App\Models\Notification;
use App\Models\Rating;
use App\Models\Session;
use App\Models\TeacherProfile;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WithdrawRequest;
use Carbon\CarbonInterface;
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
        $admin = $this->seedUser(
            mobile: (string) config('vodda.demo.admin_mobile'),
            name: 'مدیر وُدّا',
            roles: ['learner', 'admin'],
            activeRole: 'admin',
        );
        $teacher = $this->seedUser(
            mobile: (string) config('vodda.demo.teacher_mobile'),
            name: 'عباس ملک محمدی',
            roles: ['learner', 'teacher'],
            activeRole: 'teacher',
        );
        $learner = $this->seedUser(
            mobile: (string) config('vodda.demo.learner_mobile'),
            name: 'مجتبی شعبان زاده',
            roles: ['learner'],
            activeRole: 'learner',
        );
        $secondaryLearner = $this->seedUser(
            mobile: '09135550021',
            name: 'کاربر تست دوم',
            roles: ['learner'],
            activeRole: 'learner',
        );

        $featuredTeacherProfile = $this->seedTeacherProfile(
            user: $teacher,
            specialty: 'قاری قرآن',
            level: 'advanced',
            bio: 'آموزش تجوید، صوت و لحن و تثبیت محفوظات با جلسات منظم حضوری و آنلاین.',
            pricePer30Min: 500000,
            verificationStatus: 'approved',
        );

        $mentorUser = $this->seedUser(
            mobile: '09135550012',
            name: 'محمد حبیب زاده فرد',
            roles: ['learner', 'teacher'],
            activeRole: 'teacher',
        );
        $mentorProfile = $this->seedTeacherProfile(
            user: $mentorUser,
            specialty: 'مشاوره قرآنی',
            level: 'advanced',
            bio: 'مشاوره انتخاب مسیر حفظ، آمادگی مسابقات و برنامه‌ریزی جلسات فردی.',
            pricePer30Min: 380000,
            verificationStatus: 'approved',
        );

        $femaleTeacherUser = $this->seedUser(
            mobile: '09135550013',
            name: 'مریم رضوی',
            roles: ['learner', 'teacher'],
            activeRole: 'teacher',
        );
        $femaleTeacherProfile = $this->seedTeacherProfile(
            user: $femaleTeacherUser,
            specialty: 'روخوانی و تجوید بانوان',
            level: 'intermediate',
            bio: 'برنامه‌ریزی گام‌به‌گام برای روخوانی، روان‌خوانی و جلسات منظم بانوان.',
            pricePer30Min: 320000,
            verificationStatus: 'approved',
        );

        $pendingTeacherUser = $this->seedUser(
            mobile: '09135550014',
            name: 'مداح در انتظار تأیید',
            roles: ['learner', 'teacher'],
            activeRole: 'teacher',
        );
        $pendingTeacherProfile = $this->seedTeacherProfile(
            user: $pendingTeacherUser,
            specialty: 'مداحی',
            level: 'intermediate',
            bio: 'مداحی و آموزش مقدماتی برای نوجوانان.',
            pricePer30Min: 280000,
            verificationStatus: 'pending',
        );

        $this->seedAvailability($featuredTeacherProfile, [
            ['day' => 6, 'start' => '09:00:00', 'end' => '12:00:00'],
            ['day' => 2, 'start' => '17:00:00', 'end' => '20:00:00'],
            ['day' => 4, 'start' => '10:00:00', 'end' => '13:30:00'],
        ]);
        $this->seedAvailability($mentorProfile, [
            ['day' => 1, 'start' => '18:00:00', 'end' => '21:00:00'],
            ['day' => 3, 'start' => '09:00:00', 'end' => '12:00:00'],
        ]);
        $this->seedAvailability($femaleTeacherProfile, [
            ['day' => 0, 'start' => '08:30:00', 'end' => '11:30:00'],
            ['day' => 5, 'start' => '15:00:00', 'end' => '19:00:00'],
        ]);
        $this->seedAvailability($pendingTeacherProfile, [
            ['day' => 4, 'start' => '16:00:00', 'end' => '18:30:00'],
        ]);

        $teacherWallet = $this->seedWallet($teacher, 1820000, [
            ['amount' => 550000, 'type' => 'payout', 'reference_id' => 'seed-teacher-income-1', 'description' => 'درآمد جلسه قاری قرآن'],
            ['amount' => -55000, 'type' => 'commission', 'reference_id' => 'seed-teacher-commission-1', 'description' => 'کارمزد پلتفرم'],
            ['amount' => 420000, 'type' => 'payout', 'reference_id' => 'seed-teacher-income-2', 'description' => 'درآمد جلسه تثبیت حفظ'],
        ]);
        $mentorWallet = $this->seedWallet($mentorUser, 960000, [
            ['amount' => 380000, 'type' => 'payout', 'reference_id' => 'seed-mentor-income-1', 'description' => 'مشاوره قرآنی'],
        ]);
        $femaleTeacherWallet = $this->seedWallet($femaleTeacherUser, 640000, [
            ['amount' => 320000, 'type' => 'payout', 'reference_id' => 'seed-female-income-1', 'description' => 'جلسه روخوانی'],
        ]);
        $learnerWallet = $this->seedWallet($learner, 1460000, [
            ['amount' => 900000, 'type' => 'topup', 'reference_id' => 'seed-learner-topup-1', 'description' => 'شارژ اولیه کیف پول'],
            ['amount' => 450000, 'type' => 'topup', 'reference_id' => 'seed-learner-topup-2', 'description' => 'شارژ تکمیلی کیف پول'],
        ]);
        $this->seedWallet($secondaryLearner, 780000, [
            ['amount' => 780000, 'type' => 'topup', 'reference_id' => 'seed-secondary-learner-topup-1', 'description' => 'کیف پول کاربر دوم'],
        ]);

        $completedBooking = $this->seedBooking(
            learner: $learner,
            teacherProfile: $featuredTeacherProfile,
            slotDate: now()->subDays(2),
            slotStart: '09:10:00',
            slotEnd: '09:40:00',
            status: 'completed',
            notes: 'مرور سوره یاسین و رفع اشکال وقف و ابتدا',
        );
        $acceptedBooking = $this->seedBooking(
            learner: $learner,
            teacherProfile: $featuredTeacherProfile,
            slotDate: now()->addDay(),
            slotStart: '10:20:00',
            slotEnd: '10:50:00',
            status: 'accepted',
            notes: 'جلسه تثبیت محفوظات',
        );
        $pendingBooking = $this->seedBooking(
            learner: $learner,
            teacherProfile: $mentorProfile,
            slotDate: now()->addDays(2),
            slotStart: '12:45:00',
            slotEnd: '13:15:00',
            status: 'pending',
            notes: 'مشاوره آنلاین برای برنامه حفظ',
        );
        $rejectedBooking = $this->seedBooking(
            learner: $learner,
            teacherProfile: $femaleTeacherProfile,
            slotDate: now()->subDay(),
            slotStart: '16:00:00',
            slotEnd: '16:30:00',
            status: 'rejected',
            notes: 'به دلیل تداخل زمانی لغو شد',
        );
        $teacherPendingRequest = $this->seedBooking(
            learner: $secondaryLearner,
            teacherProfile: $featuredTeacherProfile,
            slotDate: now()->addDays(3),
            slotStart: '18:00:00',
            slotEnd: '18:30:00',
            status: 'pending',
            notes: 'درخواست حضوری برای مراسم',
        );

        Session::query()->updateOrCreate(
            ['booking_id' => $completedBooking->id],
            ['status' => 'ended', 'started_at' => now()->subDays(2)->setTime(9, 10), 'ended_at' => now()->subDays(2)->setTime(9, 40)],
        );
        Session::query()->updateOrCreate(
            ['booking_id' => $acceptedBooking->id],
            ['status' => 'scheduled'],
        );

        Rating::query()->updateOrCreate(
            ['booking_id' => $completedBooking->id],
            [
                'learner_id' => $learner->id,
                'teacher_profile_id' => $featuredTeacherProfile->id,
                'score' => 5,
                'comment' => 'جلسه بسیار دقیق، منظم و کاربردی بود.',
            ],
        );

        Rating::query()->updateOrCreate(
            ['booking_id' => $rejectedBooking->id],
            [
                'learner_id' => $learner->id,
                'teacher_profile_id' => $femaleTeacherProfile->id,
                'score' => 4,
                'comment' => 'هماهنگی خوب بود اما جلسه به دلیل تداخل زمانی انجام نشد.',
            ],
        );

        WithdrawRequest::query()->updateOrCreate(
            ['user_id' => $teacher->id, 'amount' => 280000],
            [
                'status' => 'pending',
                'bank_info' => ['card' => '6037990000000000', 'shaba' => 'IR000000000000000000000000'],
            ],
        );
        WithdrawRequest::query()->updateOrCreate(
            ['user_id' => $mentorUser->id, 'amount' => 180000],
            [
                'status' => 'approved',
                'bank_info' => ['card' => '6037991111111111'],
                'processed_at' => now()->subDay(),
            ],
        );

        $this->seedNotification($teacher, 'جلسه جدید', 'یک درخواست جدید برای شما ثبت شده است.');
        $this->seedNotification($teacher, 'تسویه درآمد', 'درآمد یکی از جلسات شما با موفقیت ثبت شد.', now()->subHours(5));
        $this->seedNotification($learner, 'رزرو تأیید شد', 'یکی از رزروهای شما توسط استاد پذیرفته شده است.');
        $this->seedNotification($learner, 'کد تخفیف فعال شد', 'برای اولین رزرو حضوری شما اعتبار هدیه در نظر گرفته شد.', now()->subHours(8));
        $this->seedNotification($admin, 'استاد جدید در انتظار تأیید', 'یک پروفایل استاد جدید برای بررسی ثبت شده است.');
        $this->seedNotification($secondaryLearner, 'درخواست شما ثبت شد', 'درخواست جلسه شما برای استاد ارسال شد.');

        $teacherWallet->refresh();
        $mentorWallet->refresh();
        $femaleTeacherWallet->refresh();
        $learnerWallet->refresh();
        $teacherPendingRequest->refresh();
        $pendingBooking->refresh();
    }

    protected function seedUser(string $mobile, string $name, array $roles, string $activeRole): User
    {
        $user = User::query()->updateOrCreate(
            ['mobile' => $mobile],
            ['name' => $name, 'active_role' => $activeRole],
        );

        foreach ($roles as $role) {
            $user->ensureRole($role);
        }

        $user->forceFill(['active_role' => $activeRole])->save();

        return $user->fresh(['roles']);
    }

    protected function seedTeacherProfile(
        User $user,
        string $specialty,
        string $level,
        string $bio,
        int $pricePer30Min,
        string $verificationStatus,
    ): TeacherProfile {
        return TeacherProfile::query()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'specialty' => $specialty,
                'level' => $level,
                'bio' => $bio,
                'price_per_30min' => $pricePer30Min,
                'verification_status' => $verificationStatus,
            ],
        );
    }

    protected function seedAvailability(TeacherProfile $teacherProfile, array $slots): void
    {
        foreach ($slots as $slot) {
            AvailabilitySlot::query()->updateOrCreate(
                [
                    'teacher_profile_id' => $teacherProfile->id,
                    'day_of_week' => (int) $slot['day'],
                    'start_time' => $slot['start'],
                    'end_time' => $slot['end'],
                ],
                [],
            );
        }
    }

    protected function seedWallet(User $user, int $balance, array $transactions): Wallet
    {
        $wallet = Wallet::query()->firstOrCreate(
            ['user_id' => $user->id],
            ['balance' => $balance],
        );
        $wallet->forceFill(['balance' => $balance])->save();

        foreach ($transactions as $transaction) {
            Transaction::query()->updateOrCreate(
                [
                    'wallet_id' => $wallet->id,
                    'type' => $transaction['type'],
                    'reference_id' => $transaction['reference_id'],
                ],
                [
                    'amount' => $transaction['amount'],
                    'description' => $transaction['description'],
                ],
            );
        }

        return $wallet;
    }

    protected function seedBooking(
        User $learner,
        TeacherProfile $teacherProfile,
        CarbonInterface $slotDate,
        string $slotStart,
        string $slotEnd,
        string $status,
        string $notes,
    ): Booking {
        return Booking::query()->updateOrCreate(
            [
                'learner_id' => $learner->id,
                'teacher_profile_id' => $teacherProfile->id,
                'slot_date' => $slotDate->format('Y-m-d'),
                'slot_start' => $slotStart,
                'slot_end' => $slotEnd,
            ],
            [
                'status' => $status,
                'notes' => $notes,
            ],
        );
    }

    protected function seedNotification(User $user, string $title, string $body, ?CarbonInterface $readAt = null): void
    {
        Notification::query()->updateOrCreate(
            ['user_id' => $user->id, 'title' => $title],
            [
                'body' => $body,
                'read_at' => $readAt,
            ],
        );
    }
}
