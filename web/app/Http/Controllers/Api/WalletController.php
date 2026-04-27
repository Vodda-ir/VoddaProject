<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\VoddaPlatformService;
use Illuminate\Http\Request;

class WalletController extends Controller
{
    public function initiate(Request $request, VoddaPlatformService $platformService)
    {
        $data = $request->validate([
            'amount' => ['required', 'integer', 'min:1'],
        ]);

        return response()->json(
            $platformService->topupInitiate($request->user(), (int) $data['amount']),
        );
    }

    public function verify(Request $request, VoddaPlatformService $platformService)
    {
        $data = $request->validate([
            'reference_id' => ['required', 'string'],
            'amount' => ['required', 'integer', 'min:1'],
        ]);

        return response()->json(
            $platformService->topupVerify($request->user(), $data['reference_id'], (int) $data['amount']),
        );
    }

    public function transactions(Request $request, VoddaPlatformService $platformService)
    {
        return response()->json(
            $platformService->walletSnapshot($request->user()),
        );
    }

    public function withdraw(Request $request, VoddaPlatformService $platformService)
    {
        $data = $request->validate([
            'amount' => ['required', 'integer', 'min:1'],
            'bank_info' => ['nullable', 'array'],
        ]);

        return response()->json(
            $platformService->createWithdrawRequest($request->user(), (int) $data['amount'], $data['bank_info'] ?? []),
        );
    }
}
