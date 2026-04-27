<section class="stack">
    <article class="card">
        <div class="card__header">
            <h1>درخواست‌های برداشت</h1>
        </div>

        <div class="filters-grid">
            <label class="field">
                <span>فیلتر وضعیت</span>
                <select wire:model.live="status">
                    <option value="">همه</option>
                    <option value="pending">pending</option>
                    <option value="approved">approved</option>
                    <option value="rejected">rejected</option>
                    <option value="paid">paid</option>
                </select>
            </label>
        </div>

        <div class="table-wrap">
            <table>
                <thead>
                <tr>
                    <th>کاربر</th>
                    <th>مبلغ</th>
                    <th>وضعیت</th>
                    <th>عملیات</th>
                </tr>
                </thead>
                <tbody>
                @forelse($withdrawRequests as $request)
                    <tr>
                        <td>{{ $request['user_name'] ?: $request['user_mobile'] }}</td>
                        <td>{{ number_format($request['amount']) }}</td>
                        <td>{{ $request['status'] }}</td>
                        <td>
                            <div class="row-actions">
                                <button class="button button--ghost" wire:click="process({{ $request['id'] }}, 'approved')" type="button">تأیید</button>
                                <button class="button button--secondary" wire:click="process({{ $request['id'] }}, 'paid')" type="button">پرداخت</button>
                                <button class="button button--ghost" wire:click="process({{ $request['id'] }}, 'rejected')" type="button">رد</button>
                            </div>
                        </td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="4">درخواستی ثبت نشده است.</td>
                    </tr>
                @endforelse
                </tbody>
            </table>
        </div>
    </article>
</section>
