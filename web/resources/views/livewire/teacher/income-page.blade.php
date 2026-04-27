<section class="stack">
    <div class="grid-two">
        <article class="card">
            <div class="card__header">
                <h1>درآمد استاد</h1>
                <span class="price">{{ number_format($wallet['balance']) }} تومان</span>
            </div>
            <div class="form-grid">
                <label class="field">
                    <span>مبلغ برداشت</span>
                    <input type="number" wire:model="withdrawAmount" min="10000" step="10000">
                </label>
                <label class="field">
                    <span>شماره کارت</span>
                    <input type="text" wire:model="bankCard">
                </label>
                <label class="field field--full">
                    <span>شماره شبا</span>
                    <input type="text" wire:model="bankShaba">
                </label>
                <button class="button" wire:click="createWithdrawRequest" type="button">درخواست برداشت</button>
            </div>
        </article>

        <article class="card">
            <div class="card__header">
                <h3>درخواست‌های برداشت</h3>
            </div>
            <div class="stack-list">
                @forelse($withdrawRequests as $request)
                    <div class="list-row">
                        <strong>{{ number_format($request['amount']) }} تومان</strong>
                        <span>{{ $request['status'] }}</span>
                    </div>
                @empty
                    <p class="muted">درخواستی ثبت نشده است.</p>
                @endforelse
            </div>
        </article>
    </div>

    <article class="card">
        <div class="card__header">
            <h3>تراکنش‌ها</h3>
        </div>
        <div class="table-wrap">
            <table>
                <thead>
                <tr>
                    <th>نوع</th>
                    <th>مبلغ</th>
                    <th>مرجع</th>
                    <th>توضیح</th>
                </tr>
                </thead>
                <tbody>
                @forelse($wallet['transactions'] as $transaction)
                    <tr>
                        <td>{{ $transaction['type'] }}</td>
                        <td>{{ number_format($transaction['amount']) }}</td>
                        <td>{{ $transaction['reference_id'] }}</td>
                        <td>{{ $transaction['description'] }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="4">تراکنشی ثبت نشده است.</td>
                    </tr>
                @endforelse
                </tbody>
            </table>
        </div>
    </article>
</section>
