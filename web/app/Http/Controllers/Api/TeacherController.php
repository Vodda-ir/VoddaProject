<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\VoddaPlatformService;
use Illuminate\Http\Request;

class TeacherController extends Controller
{
    public function index(Request $request, VoddaPlatformService $platformService)
    {
        return response()->json([
            'items' => $platformService->listTeachers($request->only(['query', 'specialty', 'level'])),
        ]);
    }

    public function show(int $teacher, VoddaPlatformService $platformService)
    {
        return response()->json(
            $platformService->getTeacher($teacher),
        );
    }

    public function upsert(Request $request, VoddaPlatformService $platformService)
    {
        $data = $request->validate([
            'specialty' => ['required', 'string', 'max:100'],
            'level' => ['required', 'string'],
            'bio' => ['nullable', 'string'],
            'price_per_30min' => ['required', 'integer', 'min:1'],
        ]);

        return response()->json(
            $platformService->upsertTeacherProfile($request->user(), $data),
        );
    }

    public function pending(VoddaPlatformService $platformService)
    {
        return response()->json([
            'items' => $platformService->listPendingTeachers(),
        ]);
    }

    public function approve(int $teacher, VoddaPlatformService $platformService)
    {
        return response()->json(
            $platformService->updateTeacherVerification($teacher, 'approved'),
        );
    }

    public function reject(int $teacher, VoddaPlatformService $platformService)
    {
        return response()->json(
            $platformService->updateTeacherVerification($teacher, 'rejected'),
        );
    }
}
