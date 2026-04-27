<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\VoddaPlatformService;
use Illuminate\Http\Request;

class RatingController extends Controller
{
    public function store(Request $request, VoddaPlatformService $platformService)
    {
        $data = $request->validate([
            'booking_id' => ['required', 'integer'],
            'score' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string'],
        ]);

        return response()->json(
            $platformService->createRating($request->user(), (int) $data['booking_id'], (int) $data['score'], $data['comment'] ?? null),
        );
    }
}
