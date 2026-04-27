<?php

namespace App\Livewire\App;

use App\Services\VoddaPlatformService;
use Illuminate\Contracts\View\View;
use Livewire\Component;

class DashboardPage extends Component
{
    public function render(): View
    {
        $platform = app(VoddaPlatformService::class);
        $bookings = $platform->listLearnerBookings(auth()->user());
        $notifications = $platform->listNotifications(auth()->user());
        $teacherProfile = $platform->getTeacherProfileForUser(auth()->user());

        return view('livewire.app.dashboard-page', [
            'activeBookings' => collect($bookings)->whereIn('status', ['pending', 'accepted'])->take(4)->values()->all(),
            'historyBookings' => collect($bookings)->whereIn('status', ['completed', 'rejected', 'cancelled'])->take(4)->values()->all(),
            'notifications' => array_slice($notifications, 0, 6),
            'teacherProfile' => $teacherProfile,
        ])->layout('layouts.app', [
            'title' => 'داشبورد کاربر',
        ]);
    }
}
