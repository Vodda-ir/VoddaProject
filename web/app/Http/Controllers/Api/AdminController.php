<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\VoddaPlatformService;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    public function withdrawals(Request $request, VoddaPlatformService $platformService)
    {
        return response()->json([
            'items' => $platformService->listWithdrawRequests($request->string('status')->toString() ?: null),
        ]);
    }

    public function processWithdraw(Request $request, int $withdrawRequest, VoddaPlatformService $platformService)
    {
        $data = $request->validate([
            'action' => ['required', 'string'],
        ]);

        return response()->json(
            $platformService->processWithdrawRequest($withdrawRequest, $data['action']),
        );
    }
}
