<?php

namespace App\Services;

use App\Exceptions\VoddaException;
use App\Models\OtpRequest;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class OtpAuthService
{
    public function requestOtp(string $mobile): array
    {
        $mobile = $this->normalizeMobile($mobile);
        $existingOtp = OtpRequest::query()
            ->where('mobile', $mobile)
            ->whereNull('verified_at')
            ->where('expires_at', '>', now())
            ->latest('id')
            ->first();

        if ($existingOtp) {
            Log::info('vodda.otp.reused', [
                'mobile' => $mobile,
                'expires_at' => $existingOtp->expires_at?->toISOString(),
            ]);

            return $this->serializeOtpRequest(
                otp: $existingOtp,
                message: 'کد قبلی هنوز معتبر است. لطفاً از همان کد استفاده کنید.',
                reusedExistingCode: true,
            );
        }

        $code = (string) config('vodda.otp.stub_code', '12345');
        $otp = OtpRequest::query()->create([
            'mobile' => $mobile,
            'code' => $code,
            'expires_at' => now()->addMinutes((int) config('vodda.otp.expires_in_minutes', 2)),
        ]);

        Log::info('vodda.otp.requested', [
            'mobile' => $mobile,
            'code' => $code,
        ]);

        return $this->serializeOtpRequest(
            otp: $otp,
            message: 'کد تأیید ارسال شد.',
            reusedExistingCode: false,
        );
    }

    public function verifyForWeb(string $mobile, string $code): User
    {
        $user = $this->resolveUserFromOtp($mobile, $code);

        Auth::login($user, true);

        return $user->fresh(['roles']);
    }

    public function verifyForApi(string $mobile, string $code): array
    {
        $user = $this->resolveUserFromOtp($mobile, $code);

        return [
            'user' => $user->fresh(['roles']),
            'tokens' => $this->issueApiTokens($user),
        ];
    }

    public function issueApiTokens(User $user): array
    {
        $user->tokens()->delete();

        return [
            'access_token' => $user->createToken('access')->plainTextToken,
            'refresh_token' => $user->createToken('refresh')->plainTextToken,
            'expires_in' => null,
        ];
    }

    public function setActiveRole(User $user, string $role): User
    {
        if (! in_array($role, ['learner', 'teacher', 'admin'], true)) {
            throw new VoddaException('نقش معتبر نیست.', 422);
        }

        if (! $user->hasRole($role)) {
            throw new VoddaException('این نقش برای کاربر فعال نیست.', 403);
        }

        $user->forceFill(['active_role' => $role])->save();

        return $user->fresh(['roles']);
    }

    public function serializeUser(User $user): array
    {
        return [
            'id' => $user->id,
            'mobile' => $user->mobile,
            'name' => $user->name,
            'roles' => $user->roles()->pluck('role')->all(),
            'active_role' => $user->active_role,
        ];
    }

    public function normalizeMobile(?string $mobile): string
    {
        $normalized = preg_replace('/\D+/', '', (string) $mobile) ?? '';

        if (Str::startsWith($normalized, '98') && strlen($normalized) === 12) {
            $normalized = '0'.substr($normalized, 2);
        }

        if (! preg_match('/^09\d{9}$/', $normalized)) {
            throw new VoddaException('شماره موبایل معتبر نیست.', 422);
        }

        return $normalized;
    }

    protected function resolveUserFromOtp(string $mobile, string $code): User
    {
        $mobile = $this->normalizeMobile($mobile);
        $code = trim($code);

        $otp = OtpRequest::query()
            ->where('mobile', $mobile)
            ->where('code', $code)
            ->whereNull('verified_at')
            ->where('expires_at', '>', now())
            ->latest('id')
            ->first();

        if (! $otp) {
            throw new VoddaException('کد ورود نامعتبر یا منقضی شده است.', 401);
        }

        $otp->forceFill(['verified_at' => now()])->save();

        $user = User::query()->firstOrCreate(
            ['mobile' => $mobile],
            ['name' => '', 'active_role' => 'learner'],
        );

        $user->ensureRole('learner');
        $user->syncActiveRole();

        return $user->fresh(['roles']);
    }

    protected function serializeOtpRequest(OtpRequest $otp, string $message, bool $reusedExistingCode): array
    {
        $expiresAt = $otp->expires_at;
        $expiresInSeconds = max(0, ($expiresAt?->getTimestamp() ?? now()->getTimestamp()) - now()->getTimestamp());

        return [
            'message' => $message,
            'reused_existing_code' => $reusedExistingCode,
            'expires_in_seconds' => $expiresInSeconds,
            'expires_at' => $expiresAt?->toISOString(),
        ];
    }
}
