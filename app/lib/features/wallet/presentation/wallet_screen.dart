import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/fa.dart';
import '../../../core/widgets/app_error.dart';
import '../../auth/data/user_repository.dart';
import '../data/wallet_repository.dart';

class WalletScreen extends ConsumerWidget {
  const WalletScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final me = ref.watch(meProvider);
    final transactions = ref.watch(transactionsProvider);

    return SafeArea(
      child: RefreshIndicator(
        color: AppColors.olive600,
        onRefresh: () async {
          ref.invalidate(meProvider);
          ref.invalidate(transactionsProvider);
          await ref.read(meProvider.future);
        },
        child: ListView(
          padding: const EdgeInsets.only(bottom: 24),
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 12, 20, 16),
              child: Text(
                'کیف پول',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
              child: Container(
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    begin: Alignment.topRight,
                    end: Alignment.bottomLeft,
                    colors: [AppColors.olive800, AppColors.olive600],
                  ),
                  borderRadius: BorderRadius.circular(30),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x475E6E43),
                      blurRadius: 28,
                      offset: Offset(0, 10),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'موجودی کیف پول',
                      style: TextStyle(fontSize: 13, color: Colors.white70),
                    ),
                    const SizedBox(height: 7),
                    me.when(
                      loading: () => const _BalancePlaceholder(),
                      error: (_, _) => const _BalancePlaceholder(),
                      data: (user) => Text.rich(
                        TextSpan(
                          children: [
                            TextSpan(
                              text: faNumber(user.wallet),
                              style: const TextStyle(
                                fontSize: 30,
                                fontWeight: FontWeight.w800,
                                color: Colors.white,
                              ),
                            ),
                            const TextSpan(
                              text: '  تومان',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                                color: Colors.white70,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 0, 20, 24),
              child: _PaymentNotice(),
            ),
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 0, 20, 13),
              child: Text(
                'تراکنش‌ها',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
              ),
            ),
            transactions.when(
              loading: () => const Padding(
                padding: EdgeInsets.all(30),
                child: Center(
                  child: CircularProgressIndicator(color: AppColors.olive600),
                ),
              ),
              error: (error, _) => AppErrorView(
                error: error,
                compact: true,
                onRetry: () => ref.invalidate(transactionsProvider),
              ),
              data: (list) => list.isEmpty
                  ? const Padding(
                      padding: EdgeInsets.all(32),
                      child: Center(
                        child: Text(
                          'هنوز تراکنشی ثبت نشده است.',
                          style: TextStyle(color: AppColors.ink3),
                        ),
                      ),
                    )
                  : Column(
                      children: list
                          .map(
                            (transaction) => Padding(
                              padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
                              child: Container(
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: AppColors.surface,
                                  borderRadius: BorderRadius.circular(18),
                                  boxShadow: const [
                                    BoxShadow(
                                      color: Color(0x0A2E3622),
                                      blurRadius: 6,
                                    ),
                                  ],
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 42,
                                      height: 42,
                                      decoration: BoxDecoration(
                                        color: transaction.credit
                                            ? AppColors.olive100
                                            : AppColors.clayBg,
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Icon(
                                        transaction.credit
                                            ? Icons.south_west
                                            : Icons.north_east,
                                        size: 20,
                                        color: transaction.credit
                                            ? AppColors.olive700
                                            : AppColors.clay,
                                      ),
                                    ),
                                    const SizedBox(width: 13),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            transaction.title,
                                            style: const TextStyle(
                                              fontSize: 14,
                                              fontWeight: FontWeight.w700,
                                            ),
                                          ),
                                          const SizedBox(height: 3),
                                          Text(
                                            faDigits(transaction.date),
                                            style: const TextStyle(
                                              fontSize: 11.5,
                                              color: AppColors.ink4,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Text(
                                      '${transaction.credit ? '+' : '−'}${faNumber(transaction.amount.abs())}',
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w800,
                                        color: transaction.credit
                                            ? AppColors.olive700
                                            : AppColors.ink,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          )
                          .toList(),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BalancePlaceholder extends StatelessWidget {
  const _BalancePlaceholder();

  @override
  Widget build(BuildContext context) => const Text(
    '—',
    style: TextStyle(
      fontSize: 30,
      fontWeight: FontWeight.w800,
      color: Colors.white,
    ),
  );
}

class _PaymentNotice extends StatelessWidget {
  const _PaymentNotice();

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: AppColors.goldBg,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: AppColors.gold.withValues(alpha: 0.25)),
    ),
    child: const Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(LucideIcons.info, size: 19, color: AppColors.gold),
        SizedBox(width: 10),
        Expanded(
          child: Text(
            'شارژ اینترنتی کیف پول پس از اتصال و تأیید درگاه پرداخت فعال می‌شود. دکمهٔ شارژ آزمایشی در نسخهٔ production نمایش داده نمی‌شود.',
            style: TextStyle(fontSize: 12.5, height: 1.8, color: AppColors.ink2),
          ),
        ),
      ],
    ),
  );
}
