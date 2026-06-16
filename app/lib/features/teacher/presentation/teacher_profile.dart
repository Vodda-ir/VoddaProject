import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/fa.dart';
import '../../../core/widgets/vodda_avatar.dart';
import '../../auth/data/user_repository.dart';
import '../data/teacher_repository.dart';

/// Teacher profile / management screen.
class TeacherProfile extends ConsumerWidget {
  const TeacherProfile({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final me = ref.watch(meProvider);
    final services = ref.watch(myServicesProvider);
    final workTimes = ref.watch(myWorkTimesProvider);

    final name = me.maybeWhen(data: (u) => u.name, orElse: () => 'استاد وُدّا');
    final avatarUrl = me.maybeWhen(
      data: (u) => u.avatarUrl,
      orElse: () => null,
    );
    final tag = me.maybeWhen(data: (u) => u.teacherTag, orElse: () => 'مدرس');
    final available = me.maybeWhen(
      data: (u) => u.teacherAvailable,
      orElse: () => true,
    );

    final serviceCount = services.maybeWhen(
      data: (l) =>
          '${faNumber(l.where((s) => s['active'] == true).length)} خدمت فعال',
      orElse: () => '— خدمت',
    );
    final workDayCount = workTimes.maybeWhen(
      data: (l) =>
          '${faNumber(l.map((w) => w['weekday']).toSet().length)} روز فعال',
      orElse: () => '— روز',
    );

    final reviewCount = me.maybeWhen(
      data: (u) => '${faNumber(u.teacherReviews)} نظر',
      orElse: () => '— نظر',
    );

    final rows = [
      (
        LucideIcons.bookOpen,
        'خدمات من',
        serviceCount,
        () => context.push('/t/services'),
      ),
      (
        LucideIcons.clock,
        'زمان\u200Cهای کاری',
        workDayCount,
        () => context.push('/t/worktimes'),
      ),
      (LucideIcons.mic, 'نمونه\u200Cکارها', '—', null as void Function()?),
      (LucideIcons.star, 'نظرات قرآن\u200Cآموزان', reviewCount, null),
    ];

    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.only(bottom: 24),
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 12, 20, 16),
            child: Text(
              'پروفایل استاد',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
            ),
          ),
          // Identity card
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 18),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(24),
                boxShadow: const [
                  BoxShadow(color: Color(0x0A2E3622), blurRadius: 6),
                ],
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      VoddaAvatar(
                        size: 62,
                        ring: true,
                        verified: true,
                        imageUrl: avatarUrl,
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              name,
                              style: const TextStyle(
                                fontSize: 16.5,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              tag ?? 'مدرس',
                              style: const TextStyle(
                                fontSize: 12.5,
                                color: AppColors.olive600,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 7),
                            Row(
                              children: [
                                Icon(
                                  LucideIcons.star,
                                  size: 14,
                                  color: AppColors.gold,
                                ),
                                const SizedBox(width: 3),
                                const Text(
                                  '۴.۸',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w800,
                                    color: AppColors.gold,
                                  ),
                                ),
                                const Text(
                                  ' (۶۴ نظر)',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: AppColors.ink4,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      GestureDetector(
                        onTap: () => context.push('/profile/edit'),
                        child: Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: AppColors.olive50,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(
                            LucideIcons.pencil,
                            size: 19,
                            color: AppColors.olive700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 30, color: AppColors.sand100),
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'وضعیت پذیرش جلسه',
                              style: TextStyle(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            Text(
                              available
                                  ? 'آماده دریافت درخواست جدید'
                                  : 'موقتاً غیرفعال',
                              style: const TextStyle(
                                fontSize: 11.5,
                                color: AppColors.ink3,
                                height: 1.6,
                              ),
                            ),
                          ],
                        ),
                      ),
                      _Toggle(
                        on: available,
                        onChanged: (v) async {
                          final ok = await ref
                              .read(teacherRepositoryProvider)
                              .setAvailable(v);
                          if (ok) ref.invalidate(meProvider);
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          // Menu
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 20),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(24),
              boxShadow: const [
                BoxShadow(color: Color(0x0A2E3622), blurRadius: 6),
              ],
            ),
            child: Column(
              children: rows.map((r) {
                return Container(
                  decoration: BoxDecoration(
                    border: r != rows.last
                        ? const Border(
                            bottom: BorderSide(color: AppColors.sand100),
                          )
                        : null,
                  ),
                  child: ListTile(
                    leading: Icon(r.$1, color: AppColors.olive600, size: 21),
                    title: Text(
                      r.$2,
                      style: const TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          r.$3,
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.ink4,
                          ),
                        ),
                        const SizedBox(width: 6),
                        const Icon(
                          LucideIcons.chevronLeft,
                          size: 18,
                          color: AppColors.ink4,
                        ),
                      ],
                    ),
                    onTap: r.$4,
                  ),
                );
              }).toList(),
            ),
          ),
          // Switch back to learner
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 0),
            child: GestureDetector(
              onTap: () => context.go('/'),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.olive50,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: AppColors.olive100),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 46,
                      height: 46,
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Icon(
                        LucideIcons.refreshCw,
                        size: 22,
                        color: AppColors.olive700,
                      ),
                    ),
                    const SizedBox(width: 13),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'بازگشت به حساب قرآن‌آموز',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          SizedBox(height: 3),
                          Text(
                            'به‌عنوان قرآن‌آموز جلسه رزرو کنید',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppColors.ink2,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Icon(
                      LucideIcons.chevronLeft,
                      size: 20,
                      color: AppColors.olive500,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Toggle extends StatefulWidget {
  const _Toggle({required this.on, this.onChanged});
  final bool on;
  final ValueChanged<bool>? onChanged;

  @override
  State<_Toggle> createState() => _ToggleState();
}

class _ToggleState extends State<_Toggle> {
  late bool _on;

  @override
  void initState() {
    super.initState();
    _on = widget.on;
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        setState(() => _on = !_on);
        widget.onChanged?.call(_on);
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: 46,
        height: 28,
        decoration: BoxDecoration(
          color: _on ? AppColors.olive600 : AppColors.sand200,
          borderRadius: BorderRadius.circular(999),
        ),
        child: AnimatedAlign(
          duration: const Duration(milliseconds: 200),
          alignment: _on ? Alignment.centerRight : Alignment.centerLeft,
          child: Container(
            width: 22,
            height: 22,
            margin: const EdgeInsets.symmetric(horizontal: 3),
            decoration: const BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              boxShadow: [BoxShadow(color: Color(0x33000000), blurRadius: 2)],
            ),
          ),
        ),
      ),
    );
  }
}
