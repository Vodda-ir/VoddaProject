<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\VoddaPlatformService;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request, VoddaPlatformService $platformService)
    {
        return response()->json([
            'items' => $platformService->listNotifications($request->user()),
        ]);
    }

    public function read(Request $request, int $notification, VoddaPlatformService $platformService)
    {
        $platformService->markNotificationRead($request->user(), $notification);

        return response()->json([
            'message' => 'marked-as-read',
        ]);
    }
}
