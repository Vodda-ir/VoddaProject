import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

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
    final txs = ref.watch(transactionsProvider);

    Future<void> charge(int amount) async {
      await ref.read(walletRepositoryProvider).charge(amount);
      ref.invalidate(transactionsProvider);
    }

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
            child: Text('کیف پول', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 22),
            child: Container(
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                gradient: const LinearGradient(begin: Alignment.topRight, end: Alignment.bottomLeft, colors: [AppColors.olive800, AppColors.olive600]),
                borderRadius: BorderRadius.circular(30),
                boxShadow: const [BoxShadow(color: Color(0x475E6E43), blurRadius: 28, offset: Offset(0, 10))],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('موجودی کیف پول', style: TextStyle(fontSize: 13, color: Colors.white70)),
                  const SizedBox(height: 7),
                  me.when(
                    loading: () => const Text('—', style: TextStyle(fontSize: 30, fontWeight: FontWeight.w800, color: Colors.white)),
                    error: (_, _) => const Text('—', style: TextStyle(fontSize: 30, fontWeight: FontWeight.w800, color: Colors.white)),
                    data: (u) => Text.rich(TextSpan(children: [
                      TextSpan(text: faNumber(u.wallet), style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w800, color: Colors.white)),
                      const TextSpan(text: '  تومان', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.white70)),
                    ])),
                  ),
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
            child: Row(
              children: [50000, 100000, 200000].map((a) {
                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4.5),
                    child: GestureDetector(
                      onTap: () => charge(a),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(14), boxShadow: const [BoxShadow(color: Color(0x0A2E3622), blurRadius: 6)]),
                        child: Text('${faNumber(a ~/ 1000)} هزار ت', textAlign: TextAlign.center, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.ink2)),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 0, 20, 13),
            child: Text('تراکنش‌ها', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          ),
          txs.when(
            loading: () => const Padding(padding: EdgeInsets.all(30), child: Center(child: CircularProgressIndicator(color: AppColors.olive600))),
            error: (e, _) => AppErrorView(error: e, compact: true, onRetry: () => ref.invalidate(transactionsProvider)),
            data: (list) => Column(
              children: list.map((x) => Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(18), boxShadow: const [BoxShadow(color: Color(0x0A2E3622), blurRadius: 6)]),
                  child: Row(
                    children: [
                      Container(
                        width: 42, height: 42,
                        decoration: BoxDecoration(color: x.credit ? AppColors.olive100 : AppColors.clayBg, borderRadius: BorderRadius.circular(12)),
                        child: Icon(x.credit ? Icons.south_west : Icons.north_east, size: 20, color: x.credit ? AppColors.olive700 : AppColors.clay),
                      ),
                      const SizedBox(width: 13),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(x.title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                            const SizedBox(height: 3),
                            Text(faDigits(x.date), style: const TextStyle(fontSize: 11.5, color: AppColors.ink4)),
                          ],
                        ),
                      ),
                      Text('${x.credit ? '+' : '−'}${faNumber(x.amount.abs())}', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: x.credit ? AppColors.olive700 : AppColors.ink)),
                    ],
                  ),
                ),
              )).toList(),
            ),
          ),
        ],
      ),
      ),
    );
  }
}
