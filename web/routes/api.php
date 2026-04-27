<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\RatingController;
use App\Http\Controllers\Api\SessionController;
use App\Http\Controllers\Api\TeacherController;
use App\Http\Controllers\Api\WalletController;
use Illuminate\Support\Facades\Route;

Route::get('/healthz', fn () => response()->json(['status' => 'ok']));

Route::post('/auth/request-otp', [AuthController::class, 'requestOtp']);
Route::post('/auth/verify-otp', [AuthController::class, 'verifyOtp']);
Route::get('/teachers', [TeacherController::class, 'index']);
Route::get('/teachers/{teacher}', [TeacherController::class, 'show']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::patch('/me/profile', [AuthController::class, 'updateProfile']);
    Route::post('/me/active-role', [AuthController::class, 'setActiveRole']);

    Route::post('/teacher/profile', [TeacherController::class, 'upsert']);
    Route::post('/bookings', [BookingController::class, 'store']);
    Route::get('/bookings/my', [BookingController::class, 'my']);
    Route::get('/teacher/bookings', [BookingController::class, 'teacherBookings'])->middleware('role:teacher');
    Route::post('/bookings/{booking}/accept', [BookingController::class, 'accept'])->middleware('role:teacher');
    Route::post('/bookings/{booking}/reject', [BookingController::class, 'reject'])->middleware('role:teacher');

    Route::post('/sessions/{session}/token', [SessionController::class, 'token']);
    Route::post('/sessions/{session}/end', [SessionController::class, 'end']);

    Route::post('/wallet/topup/initiate', [WalletController::class, 'initiate']);
    Route::post('/wallet/topup/verify', [WalletController::class, 'verify']);
    Route::get('/wallet/transactions', [WalletController::class, 'transactions']);
    Route::post('/wallet/withdraw-requests', [WalletController::class, 'withdraw']);

    Route::post('/ratings', [RatingController::class, 'store']);
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'read']);

    Route::get('/admin/teachers/pending', [TeacherController::class, 'pending'])->middleware('role:admin');
    Route::post('/admin/teachers/{teacher}/approve', [TeacherController::class, 'approve'])->middleware('role:admin');
    Route::post('/admin/teachers/{teacher}/reject', [TeacherController::class, 'reject'])->middleware('role:admin');
    Route::get('/admin/withdraw-requests', [AdminController::class, 'withdrawals'])->middleware('role:admin');
    Route::post('/admin/withdraw-requests/{withdrawRequest}/process', [AdminController::class, 'processWithdraw'])->middleware('role:admin');
});
