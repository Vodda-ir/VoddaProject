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

    public ?string $redirectTo = null;

    public function mount(): void
    {
        $this->redirectTo = request()->query('redirect');
    }

    public function requestOtp(): void
    {
        $service = app(OtpAuthService::class);
        $service->requestOtp($this->mobile);

        $this->otpRequested = true;
        session()->flash('status', 'کد ورود ارسال شد. در حالت پیش‌فرض از کد آزمایشی استفاده می‌شود.');
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
