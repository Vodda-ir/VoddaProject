<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\OtpAuthService;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function requestOtp(Request $request, OtpAuthService $otpAuthService)
    {
        $data = $request->validate([
            'mobile' => ['required', 'string'],
        ]);

        return response()->json(
            $otpAuthService->requestOtp($data['mobile']),
        );
    }

    public function verifyOtp(Request $request, OtpAuthService $otpAuthService)
    {
        $data = $request->validate([
            'mobile' => ['required', 'string'],
            'code' => ['required', 'string'],
        ]);

        $payload = $otpAuthService->verifyForApi($data['mobile'], $data['code']);

        return response()->json($payload['tokens']);
    }

    public function me(Request $request, OtpAuthService $otpAuthService)
    {
        return response()->json(
            $otpAuthService->serializeUser($request->user()),
        );
    }

    public function updateProfile(Request $request, OtpAuthService $otpAuthService)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $request->user()->forceFill([
            'name' => trim($data['name']),
        ])->save();

        return response()->json(
            $otpAuthService->serializeUser($request->user()->fresh(['roles'])),
        );
    }

    public function setActiveRole(Request $request, OtpAuthService $otpAuthService)
    {
        $data = $request->validate([
            'role' => ['required', 'string'],
        ]);

        $user = $otpAuthService->setActiveRole($request->user(), $data['role']);

        return response()->json(
            $otpAuthService->issueApiTokens($user),
        );
    }
}
