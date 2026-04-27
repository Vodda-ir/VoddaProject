<?php

namespace App\Livewire\Teacher;

use App\Services\VoddaPlatformService;
use Illuminate\Contracts\View\View;
use Livewire\Component;

class IncomePage extends Component
{
    public int $withdrawAmount = 100000;

    public string $bankCard = '';

    public string $bankShaba = '';

    public function createWithdrawRequest(): void
    {
        app(VoddaPlatformService::class)->createWithdrawRequest(auth()->user(), $this->withdrawAmount, [
            'card' => $this->bankCard,
            'shaba' => $this->bankShaba,
        ]);

        $this->bankCard = '';
        $this->bankShaba = '';
        session()->flash('status', 'درخواست برداشت برای استاد ثبت شد.');
    }

    public function render(): View
    {
        $platform = app(VoddaPlatformService::class);

        return view('livewire.teacher.income-page', [
            'wallet' => $platform->walletSnapshot(auth()->user()),
            'withdrawRequests' => $platform->listUserWithdrawRequests(auth()->user()),
        ])->layout('layouts.app', [
            'title' => 'درآمد استاد',
        ]);
    }
}
