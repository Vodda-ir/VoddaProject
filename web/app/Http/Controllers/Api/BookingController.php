<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\VoddaPlatformService;
use Illuminate\Http\Request;

class BookingController extends Controller
{
    public function store(Request $request, VoddaPlatformService $platformService)
    {
        $data = $request->validate([
            'teacher_profile_id' => ['required', 'integer'],
            'slot_date' => ['required', 'date'],
            'slot_start' => ['required', 'string'],
            'slot_end' => ['required', 'string'],
            'notes' => ['nullable', 'string'],
        ]);

        return response()->json(
            $platformService->createBooking($request->user(), $data),
            201,
        );
    }

    public function my(Request $request, VoddaPlatformService $platformService)
    {
        return response()->json([
            'items' => $platformService->listLearnerBookings($request->user()),
        ]);
    }

    public function teacherBookings(Request $request, VoddaPlatformService $platformService)
    {
        return response()->json([
            'items' => $platformService->listTeacherBookings($request->user()),
        ]);
    }

    public function accept(Request $request, int $booking, VoddaPlatformService $platformService)
    {
        return response()->json(
            $platformService->acceptBooking($request->user(), $booking),
        );
    }

    public function reject(Request $request, int $booking, VoddaPlatformService $platformService)
    {
        $data = $request->validate([
            'reason' => ['nullable', 'string'],
        ]);

        return response()->json(
            $platformService->rejectBooking($request->user(), $booking, $data['reason'] ?? null),
        );
    }
}
