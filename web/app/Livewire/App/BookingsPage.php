<?php

namespace App\Livewire\App;

use App\Services\VoddaPlatformService;
use Illuminate\Contracts\View\View;
use Livewire\Component;

class BookingsPage extends Component
{
    public string $teacherProfileId = '';

    public string $slotDate = '';

    public string $slotStart = '10:00';

    public string $slotEnd = '10:30';

    public string $notes = '';

    public array $ratingComments = [];

    public function mount(): void
    {
        $teacher = request()->query('teacher');
        $this->teacherProfileId = $teacher ? (string) $teacher : '';
    }

    public function createBooking(): void
    {
        app(VoddaPlatformService::class)->createBooking(auth()->user(), [
            'teacher_profile_id' => (int) $this->teacherProfileId,
            'slot_date' => $this->slotDate,
            'slot_start' => $this->slotStart,
            'slot_end' => $this->slotEnd,
            'notes' => $this->notes,
        ]);

        $this->notes = '';
        session()->flash('status', 'درخواست رزرو با موفقیت ثبت شد.');
    }

    public function submitRating(int $bookingId, int $score): void
    {
        app(VoddaPlatformService::class)->createRating(
            auth()->user(),
            $bookingId,
            $score,
            $this->ratingComments[$bookingId] ?? '',
        );

        session()->flash('status', 'امتیاز شما ثبت شد.');
    }

    public function render(): View
    {
        $platform = app(VoddaPlatformService::class);
        $teachers = $platform->listTeachers();
        $bookings = $platform->listLearnerBookings(auth()->user());

        return view('livewire.app.bookings-page', [
            'teachers' => $teachers,
            'activeBookings' => collect($bookings)->whereIn('status', ['pending', 'accepted'])->values()->all(),
            'historyBookings' => collect($bookings)->whereIn('status', ['completed', 'rejected', 'cancelled'])->values()->all(),
        ])->layout('layouts.app', [
            'title' => 'رزرو جلسات',
        ]);
    }
}
