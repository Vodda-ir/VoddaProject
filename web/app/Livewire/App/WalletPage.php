<?php

namespace App\Livewire\App;

use App\Services\VoddaPlatformService;
use Illuminate\Contracts\View\View;
use Livewire\Component;

class WalletPage extends Component
{
    public int $topupAmount = 200000;

    public string $referenceId = '';

    public int $pendingTopupAmount = 0;

    public int $withdrawAmount = 100000;

    public string $bankCard = '';

    public string $bankShaba = '';

    public function initiateTopup(): void
    {
        $result = app(VoddaPlatformService::class)->topupInitiate(auth()->user(), $this->topupAmount);

        $this->referenceId = $result['reference_id'];
        $this->pendingTopupAmount = $result['amount'];

        session()->flash('status', 'لینک پرداخت آزمایشی تولید شد. برای اعمال شارژ، تأیید را بزنید.');
    }

    public function verifyTopup(): void
    {
        app(VoddaPlatformService::class)->topupVerify(
            auth()->user(),
            $this->referenceId,
            $this->pendingTopupAmount > 0 ? $this->pendingTopupAmount : $this->topupAmount,
        );

        $this->referenceId = '';
        $this->pendingTopupAmount = 0;
        session()->flash('status', 'شارژ کیف پول انجام شد.');
    }

    public function createWithdrawRequest(): void
    {
        app(VoddaPlatformService::class)->createWithdrawRequest(auth()->user(), $this->withdrawAmount, [
            'card' => $this->bankCard,
            'shaba' => $this->bankShaba,
        ]);

        $this->bankCard = '';
        $this->bankShaba = '';

        session()->flash('status', 'درخواست برداشت ثبت شد.');
    }

    public function render(): View
    {
        $platform = app(VoddaPlatformService::class);

        return view('livewire.app.wallet-page', [
            'wallet' => $platform->walletSnapshot(auth()->user()),
            'withdrawRequests' => $platform->listUserWithdrawRequests(auth()->user()),
        ])->layout('layouts.app', [
            'title' => 'کیف پول',
        ]);
    }
}
