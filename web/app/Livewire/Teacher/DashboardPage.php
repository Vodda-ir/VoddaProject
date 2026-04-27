<?php

namespace App\Livewire\Teacher;

use App\Services\VoddaPlatformService;
use Illuminate\Contracts\View\View;
use Livewire\Component;

class DashboardPage extends Component
{
    public function render(): View
    {
        $platform = app(VoddaPlatformService::class);
        $bookings = $platform->listTeacherBookings(auth()->user());
        $wallet = $platform->walletSnapshot(auth()->user());
        $teacherProfile = $platform->getTeacherProfileForUser(auth()->user());

        return view('livewire.teacher.dashboard-page', [
            'teacherProfile' => $teacherProfile,
            'wallet' => $wallet,
            'pendingCount' => collect($bookings)->where('status', 'pending')->count(),
            'acceptedCount' => collect($bookings)->where('status', 'accepted')->count(),
            'completedCount' => collect($bookings)->where('status', 'completed')->count(),
            'latestBookings' => array_slice($bookings, 0, 5),
        ])->layout('layouts.app', [
            'title' => 'داشبورد استاد',
        ]);
    }
}
