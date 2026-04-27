<?php

namespace App\Livewire\Admin;

use App\Services\VoddaPlatformService;
use Illuminate\Contracts\View\View;
use Livewire\Component;

class WithdrawRequestsPage extends Component
{
    public string $status = '';

    public function process(int $withdrawRequestId, string $action): void
    {
        app(VoddaPlatformService::class)->processWithdrawRequest($withdrawRequestId, $action);
        session()->flash('status', 'درخواست برداشت پردازش شد.');
    }

    public function render(): View
    {
        return view('livewire.admin.withdraw-requests-page', [
            'withdrawRequests' => app(VoddaPlatformService::class)->listWithdrawRequests($this->status ?: null),
        ])->layout('layouts.app', [
            'title' => 'درخواست‌های برداشت',
        ]);
    }
}
