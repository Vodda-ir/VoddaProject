import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/fa.dart';
import '../../../core/widgets/app_error.dart';
import '../../auth/data/user_repository.dart';
import '../../wallet/data/wallet_repository.dart';

class TeacherWallet extends ConsumerWidget {
  const TeacherWallet({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final me = ref.watch(meProvider);
    final txs = ref.watch(transactionsProvider);
    final wallet = me.maybeWhen(data: (u) => u.wallet, orElse: () => 0);
    final income = txs.maybeWhen(
      data: (list) =>
          list.where((t) => t.credit).fold<int>(0, (s, t) => s + t.amount),
      orElse: () => 0,
    );

    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.only(bottom: 24),
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 12, 20, 16),
            child: Text(
              'کیف پول استاد',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
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
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'موجودی قابل برداشت',
                    style: TextStyle(fontSize: 13, color: Colors.white70),
                  ),
                  const SizedBox(height: 7),
                  Row(
                    children: [
                      Text(
                        faNumber(wallet),
                        style: const TextStyle(
                          fontSize: 30,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(width: 6),
                      const Text(
                        'تومان',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Colors.white60,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  SizedBox(
                    height: 48,
                    child: ElevatedButton.icon(
                      onPressed: () => context.push('/t/withdraw'),
                      icon: const Icon(LucideIcons.download, size: 19),
                      label: const Text('درخواست برداشت وجه'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: AppColors.olive700,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
            child: Row(
              children: [
                _statBox('درآمد کل', faNumber(income), AppColors.olive700),
                const SizedBox(width: 10),
                _statBox(
                  'تراکنش‌ها',
                  txs.maybeWhen(
                    data: (l) => faNumber(l.length),
                    orElse: () => '—',
                  ),
                  AppColors.ink,
                ),
                const SizedBox(width: 10),
                _statBox('کارمزد وُدّا', '۱۵٪', AppColors.ink),
              ],
            ),
          ),
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 0, 20, 12),
            child: Text(
              'تراکنش‌ها',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
            ),
          ),
          txs.when(
            loading: () => const Center(
              child: CircularProgressIndicator(color: AppColors.olive600),
            ),
            error: (e, _) => Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: AppErrorView(
                error: e,
                onRetry: () => ref.invalidate(transactionsProvider),
              ),
            ),
            data: (list) {
              if (list.isEmpty) {
                return const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 20),
                  child: Text(
                    'تراکنشی نیست',
                    style: TextStyle(color: AppColors.ink3),
                  ),
                );
              }
              return Column(
                children: list.map((tx) {
                  return Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(18),
                        boxShadow: const [
                          BoxShadow(color: Color(0x0A2E3622), blurRadius: 4),
                        ],
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 42,
                            height: 42,
                            decoration: BoxDecoration(
                              color: tx.credit
                                  ? AppColors.olive100
                                  : AppColors.goldBg,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Icon(
                              tx.credit
                                  ? LucideIcons.coins
                                  : LucideIcons.download,
                              size: 21,
                              color: tx.credit
                                  ? AppColors.olive700
                                  : const Color(0xFF9A7426),
                            ),
                          ),
                          const SizedBox(width: 13),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  tx.title,
                                  style: const TextStyle(
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(height: 3),
                                Text(
                                  tx.date,
                                  style: const TextStyle(
                                    fontSize: 11.5,
                                    color: AppColors.ink4,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Text(
                            '${tx.credit ? "+" : "\u2212"}${faNumber(tx.amount.abs())}',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              color: tx.credit
                                  ? AppColors.olive700
                                  : AppColors.ink,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _statBox(String label, String value, Color valueColor) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(18),
          boxShadow: const [BoxShadow(color: Color(0x0A2E3622), blurRadius: 4)],
        ),
        child: Column(
          children: [
            Text(
              value,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: valueColor,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: const TextStyle(fontSize: 11.5, color: AppColors.ink3),
            ),
          ],
        ),
      ),
    );
  }
}
