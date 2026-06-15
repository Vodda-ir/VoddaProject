import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/vodda_avatar.dart';
import '../../auth/data/auth_repository.dart';
import '../../auth/data/user_repository.dart';

class ProfileTab extends ConsumerWidget {
  const ProfileTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final me = ref.watch(meProvider);
    final rows = <(IconData, String)>[
      (Icons.person_outline, 'ویرایش پروفایل'),
      (Icons.favorite_border, 'اساتید دلخواه'),
      (Icons.account_balance_wallet_outlined, 'کیف پول و تراکنش‌ها'),
      (Icons.notifications_none, 'اعلان‌ها'),
      (Icons.shield_outlined, 'حریم خصوصی و امنیت'),
      (Icons.help_outline, 'پشتیبانی و قوانین'),
    ];

    Future<void> logout() async {
      await ref.read(authRepositoryProvider).logout();
      ref.invalidate(meProvider);
      if (context.mounted) context.go('/login');
    }

    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.only(bottom: 24),
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 12, 20, 18),
            child: Text('پروفایل', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
          ),
          // user card
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 22),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(24), boxShadow: const [BoxShadow(color: Color(0x0A2E3622), blurRadius: 6)]),
              child: Row(
                children: [
                  const VoddaAvatar(size: 62, ring: true),
                  const SizedBox(width: 14),
                  Expanded(
                    child: me.when(
                      loading: () => const Text('در حال بارگذاری…', style: TextStyle(color: AppColors.ink3)),
                      error: (_, _) => const Text('—'),
                      data: (u) => Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(u.name.isEmpty ? 'کاربر وُدّا' : u.name, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
                          const SizedBox(height: 3),
                          Row(children: [
                            const Icon(Icons.location_on_outlined, size: 13, color: AppColors.ink3),
                            const SizedBox(width: 4),
                            Text(u.city.isEmpty ? '—' : u.city, style: const TextStyle(fontSize: 12.5, color: AppColors.ink3)),
                          ]),
                        ],
                      ),
                    ),
                  ),
                  Container(
                    width: 40, height: 40,
                    decoration: BoxDecoration(color: AppColors.olive50, borderRadius: BorderRadius.circular(12)),
                    child: const Icon(Icons.edit_outlined, size: 19, color: AppColors.olive700),
                  ),
                ],
              ),
            ),
          ),
          // switch to teacher (shown only for teacher-role accounts)
          me.maybeWhen(
            data: (u) => u.isTeacher
                ? Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 22),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(color: AppColors.olive50, borderRadius: BorderRadius.circular(24), border: Border.all(color: AppColors.olive100)),
                      child: Row(
                        children: [
                          Container(width: 46, height: 46, decoration: BoxDecoration(color: AppColors.olive600, borderRadius: BorderRadius.circular(14)), child: const Icon(Icons.workspace_premium_outlined, color: Colors.white)),
                          const SizedBox(width: 13),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('ورود به حساب استاد', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
                                SizedBox(height: 3),
                                Text('جلسات و درآمدتان را مدیریت کنید.', style: TextStyle(fontSize: 12, color: AppColors.ink2, height: 1.6)),
                              ],
                            ),
                          ),
                          const Icon(Icons.sync, size: 20, color: AppColors.olive600),
                        ],
                      ),
                    ),
                  )
                : const SizedBox.shrink(),
            orElse: () => const SizedBox.shrink(),
          ),
          // menu
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 20),
            decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(24), boxShadow: const [BoxShadow(color: Color(0x0A2E3622), blurRadius: 6)]),
            child: Column(
              children: [
                for (var i = 0; i < rows.length; i++)
                  Container(
                    decoration: BoxDecoration(border: i < rows.length - 1 ? const Border(bottom: BorderSide(color: AppColors.sand100)) : null),
                    child: ListTile(
                      leading: Icon(rows[i].$1, color: AppColors.olive600, size: 21),
                      title: Text(rows[i].$2, style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600)),
                      trailing: const Icon(Icons.chevron_left, color: AppColors.ink4),
                      onTap: () {},
                    ),
                  ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 6),
            child: SizedBox(
              width: double.infinity,
              child: TextButton.icon(
                onPressed: logout,
                icon: const Icon(Icons.logout, size: 19),
                label: const Text('خروج از حساب'),
                style: TextButton.styleFrom(foregroundColor: AppColors.rose, backgroundColor: AppColors.clayBg, padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
              ),
            ),
          ),
          const Center(child: Padding(padding: EdgeInsets.only(top: 10), child: Text('وُدّا · نسخهٔ ۱٫۰٫۰', style: TextStyle(fontSize: 11, color: AppColors.ink4)))),
        ],
      ),
    );
  }
}
