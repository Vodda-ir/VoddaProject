<?php

namespace App\Livewire\Admin;

use App\Services\VoddaPlatformService;
use Illuminate\Contracts\View\View;
use Livewire\Component;

class PendingTeachersPage extends Component
{
    public function approve(int $teacherId): void
    {
        app(VoddaPlatformService::class)->updateTeacherVerification($teacherId, 'approved');
        session()->flash('status', 'استاد تأیید شد.');
    }

    public function reject(int $teacherId): void
    {
        app(VoddaPlatformService::class)->updateTeacherVerification($teacherId, 'rejected');
        session()->flash('status', 'استاد رد شد.');
    }

    public function render(): View
    {
        return view('livewire.admin.pending-teachers-page', [
            'teachers' => app(VoddaPlatformService::class)->listPendingTeachers(),
        ])->layout('layouts.app', [
            'title' => 'اساتید در انتظار تأیید',
        ]);
    }
}
