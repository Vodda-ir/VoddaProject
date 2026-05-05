<?php

namespace App\Livewire\Auth;

use App\Services\OtpAuthService;
use Illuminate\Support\Facades\Auth;
use Livewire\Component;

class LoginPage extends Component
{
    public string $mobile = '';

    public string $code = '';

    public bool $otpRequested = false;

    public ?string $otpMessage = null;

    public bool $otpReusedExistingCode = false;

    public ?string $otpExpiresAt = null;

    public ?string $redirectTo = null;

    public function mount(): void
    {
        $this->redirectTo = request()->query('redirect');
    }

    public function requestOtp(): void
    {
        $service = app(OtpAuthService::class);
        $result = $service->requestOtp($this->mobile);

        $this->otpRequested = true;
        $this->code = '';
        $this->otpMessage = (string) ($result['message'] ?? 'کد تأیید ارسال شد.');
        $this->otpReusedExistingCode = (bool) ($result['reused_existing_code'] ?? false);
        $this->otpExpiresAt = (string) ($result['expires_at'] ?? '');
        $this->dispatch('vodda-otp-requested');
    }

    public function verifyOtp()
    {
        $user = app(OtpAuthService::class)->verifyForWeb($this->mobile, $this->code);
        request()->session()->regenerate();

        return $this->redirect($this->redirectTo ?: $this->defaultRouteFor($user));
    }

    public function render()
    {
        if (Auth::check()) {
            return redirect()->to($this->defaultRouteFor(Auth::user()));
        }

        return view('livewire.auth.login-page')->layout('layouts.app', [
            'title' => 'ورود به وُدّا',
        ]);
    }

    public function collapseOtp(): void
    {
        $this->otpRequested = false;
        $this->code = '';
        $this->otpExpiresAt = null;
        $this->otpReusedExistingCode = false;
        $this->otpMessage = 'مهلت استفاده از کد تمام شد. برای دریافت کد تازه دوباره اقدام کنید.';
    }

    public function resetOtpFlow(): void
    {
        $this->otpRequested = false;
        $this->code = '';
        $this->otpExpiresAt = null;
        $this->otpReusedExistingCode = false;
        $this->otpMessage = null;
    }

    protected function defaultRouteFor($user): string
    {
        if ($user->active_role === 'admin' && $user->hasRole('admin')) {
            return route('admin.teachers.pending');
        }

        if ($user->active_role === 'teacher' && $user->hasRole('teacher')) {
            return route('teacher.dashboard');
        }

        return route('app.dashboard');
    }
}
