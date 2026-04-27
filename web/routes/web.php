<?php

use App\Livewire\Admin\PendingTeachersPage;
use App\Livewire\Admin\WithdrawRequestsPage;
use App\Livewire\App\BookingsPage;
use App\Livewire\App\DashboardPage as LearnerDashboardPage;
use App\Livewire\App\ProfilePage;
use App\Livewire\App\WalletPage;
use App\Livewire\Auth\LoginPage;
use App\Livewire\Teacher\DashboardPage as TeacherDashboardPage;
use App\Livewire\Teacher\IncomePage;
use App\Livewire\Teacher\SessionsPage;
use App\Livewire\Teachers\DirectoryPage;
use App\Services\OtpAuthService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

Route::get('/healthz', fn () => response()->json(['status' => 'ok']));

Route::view('/', 'pages.home')->name('home');
Route::view('/about', 'pages.about')->name('about');
Route::get('/teachers', DirectoryPage::class)->name('teachers.index');

Route::middleware('guest')->group(function () {
    Route::get('/login', LoginPage::class)->name('login');
    Route::get('/admin/login', LoginPage::class)->name('admin.login');
});

Route::middleware('auth')->group(function () {
    Route::post('/logout', function (Request $request) {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('home');
    })->name('logout');

    Route::post('/switch-role', function (Request $request, OtpAuthService $otpAuthService) {
        $data = $request->validate([
            'role' => ['required', 'string'],
        ]);

        $otpAuthService->setActiveRole($request->user(), $data['role']);

        return back()->with('status', 'نقش فعال شما به‌روزرسانی شد.');
    })->name('role.switch');

    Route::prefix('app')->name('app.')->group(function () {
        Route::get('/dashboard', LearnerDashboardPage::class)->name('dashboard');
        Route::get('/bookings', BookingsPage::class)->name('bookings');
        Route::get('/wallet', WalletPage::class)->name('wallet');
        Route::get('/profile', ProfilePage::class)->name('profile');
    });

    Route::prefix('teacher')->name('teacher.')->middleware('role:teacher')->group(function () {
        Route::get('/dashboard', TeacherDashboardPage::class)->name('dashboard');
        Route::get('/sessions', SessionsPage::class)->name('sessions');
        Route::get('/income', IncomePage::class)->name('income');
    });

    Route::prefix('admin')->name('admin.')->middleware('role:admin')->group(function () {
        Route::get('/teachers/pending', PendingTeachersPage::class)->name('teachers.pending');
        Route::get('/withdraw-requests', WithdrawRequestsPage::class)->name('withdraw-requests');
    });
});
