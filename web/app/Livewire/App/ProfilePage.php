<?php

namespace App\Livewire\App;

use App\Services\VoddaPlatformService;
use Illuminate\Contracts\View\View;
use Livewire\Component;

class ProfilePage extends Component
{
    public string $name = '';

    public string $specialty = '';

    public string $level = 'beginner';

    public string $bio = '';

    public int $pricePer30min = 0;

    public function mount(): void
    {
        $this->hydrateFromUser();
    }

    public function saveProfile(): void
    {
        auth()->user()->forceFill([
            'name' => trim($this->name),
        ])->save();

        $this->hydrateFromUser();
        session()->flash('status', 'اطلاعات پروفایل کاربر ذخیره شد.');
    }

    public function saveTeacherProfile(): void
    {
        app(VoddaPlatformService::class)->upsertTeacherProfile(auth()->user(), [
            'specialty' => $this->specialty,
            'level' => $this->level,
            'bio' => $this->bio,
            'price_per_30min' => $this->pricePer30min,
        ]);

        $this->hydrateFromUser();
        session()->flash('status', 'پروفایل استاد ثبت و برای بررسی ارسال شد.');
    }

    public function render(): View
    {
        $teacherProfile = app(VoddaPlatformService::class)->getTeacherProfileForUser(auth()->user());

        return view('livewire.app.profile-page', [
            'teacherProfile' => $teacherProfile,
            'roleNames' => auth()->user()->fresh('roles')->roleNames(),
        ])->layout('layouts.app', [
            'title' => 'پروفایل',
        ]);
    }

    protected function hydrateFromUser(): void
    {
        $user = auth()->user()->fresh('roles');
        $profile = app(VoddaPlatformService::class)->getTeacherProfileForUser($user);

        $this->name = $user->name;
        $this->specialty = $profile['specialty'] ?? '';
        $this->level = $profile['level'] ?? 'beginner';
        $this->bio = $profile['bio'] ?? '';
        $this->pricePer30min = (int) ($profile['price_per_30min'] ?? 0);
    }
}
