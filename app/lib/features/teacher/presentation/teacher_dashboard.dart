import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/fa.dart';
import '../../../core/widgets/ui.dart';
import '../../../core/widgets/vodda_avatar.dart';
import '../../auth/data/user_repository.dart';
import '../../sessions/data/session_repository.dart';
import '../../sessions/domain/session.dart';
import 'role_sheet.dart';

/// Teacher Dashboard — matches vodda-teacher-a.jsx TeacherDashboard.
class TeacherDashboard extends ConsumerWidget {
  const TeacherDashboard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final me = ref.watch(meProvider);
    final sessions = ref.watch(mySessionsProvider('upcoming'));
    final nextSession = sessions.maybeWhen(
      data: (list) => list.isNotEmpty ? list.first : null,
      orElse: () => null,
    );

    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.only(bottom: 24),
        children: [
          _TeacherHeader(me: me),
          const SizedBox(height: 20),
          // Earnings hero
          _EarningsHero(),
          const SizedBox(height: 22),
          // Pending requests banner
          _RequestsBanner(),
          const SizedBox(height: 22),
          // Next session
          if (nextSession != null && nextSession.status == 'confirmed')
            _NextSession(session: nextSession),
          // Quick manage
          const SizedBox(height: 22),
          SectionHeader(title: 'مدیریت سریع'),
          const _QuickManage(),
        ],
      ),
    );
  }
}

class _TeacherHeader extends ConsumerWidget {
  const _TeacherHeader({required this.me});
  final AsyncValue<dynamic> me;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final name = me.maybeWhen(
      data: (u) => u.name.isEmpty ? 'استاد' : u.name.split(' ').first,
      orElse: () => '',
    );
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          GestureDetector(
            onTap: () => _showRoleSheet(context),
            child: Row(
              children: [
                const VoddaAvatar(size: 46, ring: true, verified: true),
                const SizedBox(width: 11),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'پنل استاد · $name',
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.ink3,
                      ),
                    ),
                    const Row(
                      children: [
                        Text(
                          'تغییر حساب',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            color: AppColors.olive700,
                          ),
                        ),
                        SizedBox(width: 5),
                        Icon(Icons.sync, size: 15, color: AppColors.olive600),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(14),
              boxShadow: const [
                BoxShadow(color: Color(0x0A2E3622), blurRadius: 4),
              ],
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                const Icon(
                  Icons.notifications_none,
                  size: 21,
                  color: AppColors.ink2,
                ),
                Positioned(
                  top: 11,
                  right: 12,
                  child: Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: AppColors.clay,
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.surface, width: 2),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showRoleSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => const RoleSheet(isTeacher: true),
    );
  }
}

class _EarningsHero extends StatelessWidget {
  const _EarningsHero();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
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
              'درآمد این ماه',
              style: TextStyle(fontSize: 13, color: Colors.white70),
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                Text(
                  faDigits('3,650,000'),
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
            const SizedBox(height: 16),
            Row(
              children: [
                _earnCol('امروز', '۲۴۰ هزار'),
                Container(width: 1, height: 30, color: Colors.white24),
                const SizedBox(width: 18),
                _earnCol('این هفته', '۱,۱۲۰ هزار'),
                Container(width: 1, height: 30, color: Colors.white24),
                const SizedBox(width: 18),
                _earnCol('امتیاز', '۴٫۸ ★'),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _earnCol(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 11, color: Colors.white60),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w800,
            color: Colors.white,
          ),
        ),
      ],
    );
  }
}

class _RequestsBanner extends ConsumerWidget {
  const _RequestsBanner();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: GestureDetector(
        onTap: () => context.go('/t/requests'),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.goldBg,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: AppColors.goldSoft),
          ),
          child: Row(
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Stack(
                  children: [
                    const Center(
                      child: Icon(
                        Icons.message,
                        size: 24,
                        color: AppColors.gold,
                      ),
                    ),
                    Positioned(
                      top: -5,
                      right: -5,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5),
                        constraints: const BoxConstraints(
                          minWidth: 20,
                          minHeight: 20,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.clay,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.goldBg, width: 2),
                        ),
                        child: const Center(
                          child: Text(
                            '۳',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 13),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '۳ درخواست جدید',
                      style: TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF7A5E1E),
                      ),
                    ),
                    Text(
                      'برای تأیید یا رد، لمس کنید',
                      style: TextStyle(
                        fontSize: 12,
                        color: Color(0xFF9A7426),
                        height: 1.6,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(
                Icons.chevron_left,
                size: 20,
                color: Color(0xFF9A7426),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NextSession extends StatelessWidget {
  const _NextSession({required this.session});
  final Session session;

  @override
  Widget build(BuildContext context) {
    final d = session.scheduledAt;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(
          title: 'جلسهٔ بعدی شما',
          action: 'همهٔ جلسات',
          onAction: () => context.go('/t/sessions'),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Container(
            padding: const EdgeInsets.all(15),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(24),
              boxShadow: const [
                BoxShadow(color: Color(0x0A2E3622), blurRadius: 6),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    const VoddaAvatar(size: 46),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            session.teacherName,
                            style: const TextStyle(
                              fontSize: 14.5,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            session.service,
                            style: const TextStyle(
                              fontSize: 12.5,
                              color: AppColors.ink2,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 11,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.olive100,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: const Text(
                        'تأیید شده',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: AppColors.olive700,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 13),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 11,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.sand50,
                    borderRadius: BorderRadius.circular(13),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.calendar_today_outlined,
                        size: 16,
                        color: AppColors.olive500,
                      ),
                      const SizedBox(width: 5),
                      Text(
                        '${faDigits('${d.day}')} ${_monthName(d.month)}',
                        style: const TextStyle(
                          fontSize: 12.5,
                          color: AppColors.ink2,
                        ),
                      ),
                      const SizedBox(width: 14),
                      const Icon(
                        Icons.access_time,
                        size: 16,
                        color: AppColors.olive500,
                      ),
                      const SizedBox(width: 5),
                      Text(
                        faDigits(
                          '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}',
                        ),
                        style: const TextStyle(
                          fontSize: 12.5,
                          color: AppColors.ink2,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 13),
                SizedBox(
                  height: 48,
                  child: ElevatedButton.icon(
                    onPressed: () {},
                    icon: const Icon(Icons.call, size: 19),
                    label: const Text('شروع جلسه'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  String _monthName(int m) {
    const names = [
      'فروردین',
      'اردیبهشت',
      'خرداد',
      'تیر',
      'مرداد',
      'شهریور',
      'مهر',
      'آبان',
      'آذر',
      'دی',
      'بهمن',
      'اسفند',
    ];
    return names[m - 1];
  }
}

class _QuickManage extends StatelessWidget {
  const _QuickManage();

  @override
  Widget build(BuildContext context) {
    final items = [
      (Icons.menu_book, 'خدمات من', () => context.push('/t/services')),
      (Icons.access_time, 'زمان‌های کاری', () => context.push('/t/worktimes')),
      (
        Icons.account_balance_wallet_outlined,
        'کیف پول',
        () => context.go('/t/wallet'),
      ),
      (Icons.star_outline, 'نظرات قرآن‌آموزان', () {}),
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: GridView.count(
        crossAxisCount: 2,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        childAspectRatio: 2.3,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        children: items.map((item) {
          return GestureDetector(
            onTap: item.$3,
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
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: AppColors.olive100,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(item.$1, size: 21, color: AppColors.olive700),
                  ),
                  const SizedBox(width: 11),
                  Text(
                    item.$2,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}
