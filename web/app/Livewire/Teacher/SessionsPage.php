<?php

namespace App\Livewire\Teacher;

use App\Services\VoddaPlatformService;
use Illuminate\Contracts\View\View;
use Livewire\Component;

class SessionsPage extends Component
{
    public array $rejectReasons = [];

    public array $lastToken = [];

    public function accept(int $bookingId): void
    {
        app(VoddaPlatformService::class)->acceptBooking(auth()->user(), $bookingId);
        session()->flash('status', 'رزرو تأیید شد.');
    }

    public function reject(int $bookingId): void
    {
        app(VoddaPlatformService::class)->rejectBooking(
            auth()->user(),
            $bookingId,
            $this->rejectReasons[$bookingId] ?? null,
        );

        session()->flash('status', 'رزرو رد شد.');
    }

    public function endSession(int $sessionId): void
    {
        app(VoddaPlatformService::class)->endSession(auth()->user(), $sessionId);
        session()->flash('status', 'جلسه پایان یافت و تسویه اعمال شد.');
    }

    public function generateToken(int $sessionId): void
    {
        $this->lastToken = app(VoddaPlatformService::class)->generateSessionToken(auth()->user(), $sessionId);
    }

    public function render(): View
    {
        return view('livewire.teacher.sessions-page', [
            'bookings' => app(VoddaPlatformService::class)->listTeacherBookings(auth()->user()),
        ])->layout('layouts.app', [
            'title' => 'جلسات استاد',
        ]);
    }
}
