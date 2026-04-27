<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\VoddaPlatformService;
use Illuminate\Http\Request;

class SessionController extends Controller
{
    public function token(Request $request, int $session, VoddaPlatformService $platformService)
    {
        return response()->json(
            $platformService->generateSessionToken($request->user(), $session),
        );
    }

    public function end(Request $request, int $session, VoddaPlatformService $platformService)
    {
        return response()->json(
            $platformService->endSession($request->user(), $session),
        );
    }
}
