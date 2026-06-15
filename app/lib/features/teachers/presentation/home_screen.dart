import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/app_error.dart';
import '../../../core/widgets/ui.dart';
import '../../../core/widgets/vodda_avatar.dart';
import '../../auth/data/user_repository.dart';
import '../../teacher/presentation/role_sheet.dart';
import '../data/teacher_repository.dart';
import '../domain/teacher.dart';
import 'widgets/teacher_card.dart';

/// Home screen, matching docs/design/vodda-screens-home.jsx.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final teachersAsync = ref.watch(teachersProvider(''));

    return SafeArea(
      child: RefreshIndicator(
        color: AppColors.olive600,
        onRefresh: () async {
          ref.invalidate(teachersProvider(''));
          ref.invalidate(meProvider);
          await ref.read(teachersProvider('').future);
        },
        child: teachersAsync.when(
          loading: () => ListView(
            children: const [
              SizedBox(height: 280),
              Center(
                child: CircularProgressIndicator(color: AppColors.olive600),
              ),
            ],
          ),
          error: (e, _) => ListView(
            children: [
              const _Header(),
              SizedBox(
                height: 120,
                child: AppErrorView(
                  error: e,
                  onRetry: () => ref.invalidate(teachersProvider('')),
                ),
              ),
            ],
          ),
          data: (teachers) => _content(context, ref, teachers),
        ),
      ),
    );
  }

  Widget _content(BuildContext context, WidgetRef ref, List<Teacher> teachers) {
    final recommended = teachers.where((t) => !t.female).toList();
    final women = teachers.where((t) => t.female).toList();
    final featured = teachers.length > 1
        ? teachers[1]
        : (teachers.isNotEmpty ? teachers.first : null);

    return ListView(
      padding: const EdgeInsets.only(bottom: 24),
      children: [
        const _Header(),
        _HeroRequest(onRequest: () => context.go('/search')),
        const SizedBox(height: 22),
        // followed teachers strip
        SizedBox(
          height: 86,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 20),
            itemCount: teachers.length,
            separatorBuilder: (_, _) => const SizedBox(width: 14),
            itemBuilder: (_, i) {
              final t = teachers[i];
              return GestureDetector(
                onTap: () => context.push('/teacher/${t.id}'),
                child: SizedBox(
                  width: 60,
                  child: Column(
                    children: [
                      VoddaAvatar(size: 58, ring: true, verified: t.verified),
                      const SizedBox(height: 6),
                      Text(
                        t.name.split(' ').first,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.ink2,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 24),
        _QuickCats(onPick: () => context.go('/search')),
        const SizedBox(height: 26),
        SectionHeader(
          title: 'اساتید پیشنهادی',
          action: 'مشاهدهٔ همه',
          onAction: () => context.go('/search'),
        ),
        SizedBox(
          height: 200,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 20),
            itemCount: recommended.length,
            separatorBuilder: (_, _) => const SizedBox(width: 14),
            itemBuilder: (_, i) => TeacherCard(
              teacher: recommended[i],
              onTap: () => context.push('/teacher/${recommended[i].id}'),
            ),
          ),
        ),
        const SizedBox(height: 26),
        if (featured != null)
          _FeaturedTeacher(
            teacher: featured,
            onTap: () => context.push('/teacher/${featured.id}'),
          ),
        if (women.isNotEmpty) ...[
          const SizedBox(height: 26),
          SectionHeader(
            title: 'اساتید بانو',
            action: 'مشاهدهٔ همه',
            onAction: () => context.go('/search'),
          ),
          SizedBox(
            height: 200,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              itemCount: women.length,
              separatorBuilder: (_, _) => const SizedBox(width: 14),
              itemBuilder: (_, i) => TeacherCard(
                teacher: women[i],
                onTap: () => context.push('/teacher/${women[i].id}'),
              ),
            ),
          ),
        ],
      ],
    );
  }
}

class _Header extends ConsumerWidget {
  const _Header();

  void _showRoleSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => const RoleSheet(isTeacher: false),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final me = ref.watch(meProvider);
    final first = me.maybeWhen(
      data: (u) => u.name.isEmpty ? 'دوست' : u.name.split(' ').first,
      orElse: () => '',
    );
    final isTeacher = me.maybeWhen(
      data: (u) => u.isTeacher,
      orElse: () => false,
    );
    final avatarUrl = me.maybeWhen(
      data: (u) => u.avatarUrl,
      orElse: () => null,
    );

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          GestureDetector(
            onTap: isTeacher ? () => _showRoleSheet(context) : null,
            child: Row(
              children: [
                VoddaAvatar(size: 46, ring: true, imageUrl: avatarUrl),
                const SizedBox(width: 11),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'وقت بخیر،',
                      style: TextStyle(fontSize: 13, color: AppColors.ink3),
                    ),
                    if (!isTeacher)
                      Text(
                        '$first جان 🌿',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: AppColors.ink,
                        ),
                      )
                    else
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '$first جان 🌿',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              color: AppColors.ink,
                            ),
                          ),
                          const Row(
                            children: [
                              Text(
                                'تغییر حساب',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.olive700,
                                ),
                              ),
                              SizedBox(width: 4),
                              Icon(
                                LucideIcons.refreshCw,
                                size: 14,
                                color: AppColors.olive600,
                              ),
                            ],
                          ),
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
                const Icon(LucideIcons.bell, size: 21, color: AppColors.ink2),
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
}

class _HeroRequest extends StatelessWidget {
  const _HeroRequest({required this.onRequest});
  final VoidCallback onRequest;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Container(
        padding: const EdgeInsets.fromLTRB(22, 22, 22, 20),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topRight,
            end: Alignment.bottomLeft,
            colors: [
              AppColors.olive700,
              AppColors.olive600,
              AppColors.olive500,
            ],
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
            const Row(
              children: [
                Icon(LucideIcons.sparkles, size: 18, color: AppColors.goldSoft),
                SizedBox(width: 7),
                Text(
                  'به وُدّا خوش آمدید',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Colors.white70,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            const Text(
              'استاد قرآن و مداحی‌ات را\nهمین حالا پیدا کن',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                height: 1.5,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'یک جلسهٔ آموزشی صوتی با بهترین اساتید، تنها با چند لمس.',
              style: TextStyle(
                fontSize: 13,
                color: Colors.white70,
                height: 1.7,
              ),
            ),
            const SizedBox(height: 16),
            GestureDetector(
              onTap: onRequest,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 13,
                ),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: const [
                    CircleAvatar(
                      radius: 12,
                      backgroundColor: AppColors.olive600,
                      child: Icon(
                        LucideIcons.plus,
                        size: 16,
                        color: Colors.white,
                      ),
                    ),
                    SizedBox(width: 9),
                    Text(
                      'درخواست وُدّا',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: AppColors.olive700,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickCats extends StatelessWidget {
  const _QuickCats({required this.onPick});
  final VoidCallback onPick;

  @override
  Widget build(BuildContext context) {
    final cats = [
      (
        LucideIcons.bookOpen,
        'آموزش قرآن',
        '۱۲۰+ استاد',
        AppColors.olive100,
        AppColors.olive700,
      ),
      (LucideIcons.mic, 'مداحی', '۴۰+ استاد', AppColors.clayBg, AppColors.clay),
      (
        LucideIcons.phoneCall,
        'مشاورهٔ صوتی',
        'گفت‌وگوی زنده',
        AppColors.goldBg,
        const Color(0xFF9A7426),
      ),
    ];
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: cats.map((c) {
          return Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 5),
              child: GestureDetector(
                onTap: onPick,
                child: Container(
                  padding: const EdgeInsets.fromLTRB(10, 15, 10, 13),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: const [
                      BoxShadow(color: Color(0x0A2E3622), blurRadius: 4),
                    ],
                  ),
                  child: Column(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: c.$4,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Icon(c.$1, size: 25, color: c.$5),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        c.$2,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: AppColors.ink,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        c.$3,
                        style: const TextStyle(
                          fontSize: 10.5,
                          color: AppColors.ink4,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _FeaturedTeacher extends StatelessWidget {
  const _FeaturedTeacher({required this.teacher, required this.onTap});
  final Teacher teacher;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.topRight,
              end: Alignment.bottomLeft,
              colors: [AppColors.olive900, AppColors.olive800],
            ),
            borderRadius: BorderRadius.circular(30),
            boxShadow: const [
              BoxShadow(
                color: Color(0x122E3622),
                blurRadius: 22,
                offset: Offset(0, 6),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 78,
                height: 96,
                decoration: BoxDecoration(
                  color: Colors.white12,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: Colors.white24),
                ),
                child: Center(
                  child: Text(
                    teacher.field.contains('مداحی') ? '🎤' : '📖',
                    style: const TextStyle(fontSize: 36),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(
                          LucideIcons.award,
                          size: 15,
                          color: AppColors.goldSoft,
                        ),
                        SizedBox(width: 5),
                        Text(
                          'استاد منتخب هفته',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: AppColors.goldSoft,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 7),
                    Text(
                      teacher.name,
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '${teacher.tag} · ${teacher.city}',
                      style: const TextStyle(
                        fontSize: 12.5,
                        color: Colors.white70,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 7,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white24,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(LucideIcons.plus, size: 15, color: Colors.white),
                          SizedBox(width: 6),
                          Text(
                            'دنبال کردن',
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
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
