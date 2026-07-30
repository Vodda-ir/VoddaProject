import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/fa.dart';
import '../../../core/widgets/app_error.dart';
import '../../../core/widgets/ui.dart';
import '../../../core/widgets/vodda_avatar.dart';
import '../../auth/data/user_repository.dart';
import '../../auth/domain/user.dart';
import '../../sessions/data/session_repository.dart';
import '../../sessions/domain/session.dart';
import 'role_sheet.dart';

class TeacherDashboard extends ConsumerWidget {
  const TeacherDashboard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final me = ref.watch(meProvider);
    final upcoming = ref.watch(myTeacherSessionsProvider('upcoming'));
    final pending = ref.watch(myTeacherSessionsProvider('pending'));

    return SafeArea(
      child: RefreshIndicator(
        color: AppColors.olive600,
        onRefresh: () async {
          ref.invalidate(meProvider);
          ref.invalidate(myTeacherSessionsProvider('upcoming'));
          ref.invalidate(myTeacherSessionsProvider('pending'));
          await Future.wait([
            ref.read(meProvider.future),
            ref.read(myTeacherSessionsProvider('upcoming').future),
          ]);
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.only(bottom: 24),
          children: [
            _TeacherHeader(me: me),
            const SizedBox(height: 18),
            me.when(
              loading: () => const Padding(
                padding: EdgeInsets.all(40),
                child: Center(
                  child: CircularProgressIndicator(color: AppColors.olive600),
                ),
              ),
              error: (error, _) => Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: AppErrorView(
                  error: error,
                  onRetry: () => ref.invalidate(meProvider),
                ),
              ),
              data: (user) => _AccountSummary(user: user),
            ),
            const SizedBox(height: 22),
            pending.when(
              loading: () => const SizedBox.shrink(),
              error: (error, _) => Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: AppErrorView(
                  error: error,
                  compact: true,
                  onRetry: () =>
                      ref.invalidate(myTeacherSessionsProvider('pending')),
                ),
              ),
              data: (items) => _RequestsBanner(count: items.length),
            ),
            const SizedBox(height: 22),
            upcoming.when(
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(horizontal: 20),
                child: LinearProgressIndicator(color: AppColors.olive600),
              ),
              error: (error, _) => Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: AppErrorView(
                  error: error,
                  compact: true,
                  onRetry: () =>
                      ref.invalidate(myTeacherSessionsProvider('upcoming')),
                ),
              ),
              data: (items) {
                final confirmed = items
                    .where((session) => session.status == 'confirmed')
                    .toList()
                  ..sort((left, right) =>
                      left.scheduledAt.compareTo(right.scheduledAt));
                return confirmed.isEmpty
                    ? const SizedBox.shrink()
                    : _NextSession(session: confirmed.first);
              },
            ),
            const SizedBox(height: 22),
            SectionHeader(title: 'مدیریت سریع'),
            const _QuickManage(),
          ],
        ),
      ),
    );
  }
}

class _TeacherHeader extends StatelessWidget {
  const _TeacherHeader({required this.me});
  final AsyncValue<AppUser> me;

  @override
  Widget build(BuildContext context) {
    final name = me.maybeWhen(
      data: (user) => user.name.isEmpty ? 'استاد' : user.name.split(' ').first,
      orElse: () => '',
    );
    final avatarUrl = me.maybeWhen(
      data: (user) => user.avatarUrl,
      orElse: () => null,
    );
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => showModalBottomSheet(
          context: context,
          backgroundColor: Colors.transparent,
          builder: (_) => const RoleSheet(isTeacher: true),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            children: [
              VoddaAvatar(size: 46, ring: true, imageUrl: avatarUrl),
              const SizedBox(width: 11),
              Expanded(
                child: Column(
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
                        Icon(
                          LucideIcons.refreshCw,
                          size: 15,
                          color: AppColors.olive600,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AccountSummary extends StatelessWidget {
  const _AccountSummary({required this.user});
  final AppUser user;

  @override
  Widget build(BuildContext context) {
    final rating = user.teacherReviews > 0
        ? user.teacherRating.toStringAsFixed(1)
        : '—';
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        children: [
          Container(
            width: double.infinity,
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
                  'موجودی قابل برداشت',
                  style: TextStyle(fontSize: 13, color: Colors.white70),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Text(
                      faNumber(user.wallet),
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
                Row(
                  children: [
                    _Metric(label: 'امتیاز', value: '$rating ★'),
                    const _Divider(),
                    _Metric(
                      label: 'نظرها',
                      value: faNumber(user.teacherReviews),
                    ),
                    const _Divider(),
                    _Metric(
                      label: 'جلسات',
                      value: faNumber(user.teacherSessions),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          const Text(
            'آمار دوره‌ای درآمد تا زمان وجود گزارش واقعی نمایش داده نمی‌شود.',
            style: TextStyle(
              fontSize: 11.5,
              color: AppColors.ink3,
              height: 1.6,
            ),
          ),
        ],
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Expanded(
        child: Column(
          children: [
            Text(
              label,
              style: const TextStyle(fontSize: 11, color: Colors.white60),
            ),
            const SizedBox(height: 3),
            Text(
              value,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w800,
                color: Colors.white,
              ),
            ),
          ],
        ),
      );
}

class _Divider extends StatelessWidget {
  const _Divider();

  @override
  Widget build(BuildContext context) =>
      Container(width: 1, height: 34, color: Colors.white24);
}

class _RequestsBanner extends StatelessWidget {
  const _RequestsBanner({required this.count});
  final int count;

  @override
  Widget build(BuildContext context) {
    if (count == 0) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: InkWell(
        borderRadius: BorderRadius.circular(24),
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
              const Icon(
                LucideIcons.messageSquare,
                size: 27,
                color: AppColors.gold,
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${faNumber(count)} درخواست جدید',
                      style: const TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF7A5E1E),
                      ),
                    ),
                    const Text(
                      'برای تأیید یا رد، لمس کنید',
                      style: TextStyle(
                        fontSize: 12,
                        color: Color(0xFF9A7426),
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(
                LucideIcons.chevronLeft,
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
                            session.learnerName,
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
                    const VChip(label: 'تأییدشده', active: true),
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
                        LucideIcons.calendar,
                        size: 16,
                        color: AppColors.olive500,
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          session.hasOfficialLocalTime
                              ? '${_faLocalDate(session.localDate)} · ${faDigits(session.localStart)} تا ${faDigits(session.localEnd)}'
                              : 'زمان رسمی جلسه دریافت نشد',
                          style: const TextStyle(
                            fontSize: 12.5,
                            color: AppColors.ink2,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
                OutlinedButton(
                  onPressed: () => context.go('/t/sessions'),
                  child: const Text('مشاهدهٔ جزئیات جلسه'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _QuickManage extends StatelessWidget {
  const _QuickManage();

  @override
  Widget build(BuildContext context) {
    final items = [
      (LucideIcons.bookOpen, 'خدمات من', '/t/services'),
      (LucideIcons.clock, 'زمان‌های کاری', '/t/worktimes'),
      (LucideIcons.wallet, 'کیف پول', '/t/wallet'),
      (LucideIcons.calendar, 'همهٔ جلسات', '/t/sessions'),
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
        children: items
            .map(
              (item) => InkWell(
                borderRadius: BorderRadius.circular(18),
                onTap: () => context.push(item.$3),
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
                        child: Icon(
                          item.$1,
                          size: 21,
                          color: AppColors.olive700,
                        ),
                      ),
                      const SizedBox(width: 11),
                      Expanded(
                        child: Text(
                          item.$2,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            )
            .toList(),
      ),
    );
  }
}

String _faLocalDate(String value) {
  final parts = value.split('-');
  if (parts.length != 3) return value;
  return faDigits('${parts[0]}/${parts[1]}/${parts[2]}');
}
