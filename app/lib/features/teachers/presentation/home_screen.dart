import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/app_error.dart';
import '../../../core/widgets/ui.dart';
import '../../../core/widgets/vodda_avatar.dart';
import '../../auth/data/user_repository.dart';
import '../../teacher/presentation/role_sheet.dart';
import '../data/teacher_repository.dart';
import '../domain/teacher.dart';
import 'widgets/teacher_card.dart';

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
              _Header(),
              SizedBox(height: 220),
              Center(
                child: CircularProgressIndicator(color: AppColors.olive600),
              ),
            ],
          ),
          error: (error, _) => ListView(
            children: [
              const _Header(),
              const _HeroRequest(),
              SizedBox(
                height: 180,
                child: AppErrorView(
                  error: error,
                  onRetry: () => ref.invalidate(teachersProvider('')),
                ),
              ),
            ],
          ),
          data: (teachers) => _content(context, teachers),
        ),
      ),
    );
  }

  Widget _content(BuildContext context, List<Teacher> teachers) {
    final men = teachers.where((teacher) => !teacher.female).toList();
    final women = teachers.where((teacher) => teacher.female).toList();
    final featured = teachers.isEmpty ? null : teachers.first;

    return ListView(
      padding: const EdgeInsets.only(bottom: 24),
      children: [
        const _Header(),
        const _HeroRequest(),
        const SizedBox(height: 22),
        const _QuickCategories(),
        const SizedBox(height: 26),
        if (teachers.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 20, vertical: 44),
            child: EmptyState(
              icon: LucideIcons.users,
              title: 'هنوز استادی منتشر نشده',
              sub: 'پس از تأیید اولین استاد، پروفایل او در این بخش نمایش داده می‌شود.',
            ),
          )
        else ...[
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
              itemCount: men.isEmpty ? teachers.length : men.length,
              separatorBuilder: (_, _) => const SizedBox(width: 14),
              itemBuilder: (_, index) {
                final teacher = men.isEmpty ? teachers[index] : men[index];
                return TeacherCard(
                  teacher: teacher,
                  onTap: () => context.push('/teacher/${teacher.id}'),
                );
              },
            ),
          ),
          if (featured != null) ...[
            const SizedBox(height: 26),
            _FeaturedTeacher(
              teacher: featured,
              onTap: () => context.push('/teacher/${featured.id}'),
            ),
          ],
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
                itemBuilder: (_, index) => TeacherCard(
                  teacher: women[index],
                  onTap: () => context.push('/teacher/${women[index].id}'),
                ),
              ),
            ),
          ],
        ],
      ],
    );
  }
}

class _Header extends ConsumerWidget {
  const _Header();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final me = ref.watch(meProvider);
    final firstName = me.maybeWhen(
      data: (user) => user.name.trim().isEmpty
          ? 'دوست'
          : user.name.trim().split(' ').first,
      orElse: () => '',
    );
    final isTeacher = me.maybeWhen(
      data: (user) => user.isTeacher,
      orElse: () => false,
    );
    final avatarUrl = me.maybeWhen(
      data: (user) => user.avatarUrl,
      orElse: () => null,
    );

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
      child: Row(
        children: [
          GestureDetector(
            onTap: isTeacher
                ? () => showModalBottomSheet<void>(
                    context: context,
                    backgroundColor: Colors.transparent,
                    builder: (_) => const RoleSheet(isTeacher: false),
                  )
                : null,
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
                    Text(
                      '$firstName جان 🌿',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: AppColors.ink,
                      ),
                    ),
                    if (isTeacher)
                      const Text(
                        'برای تغییر پنل روی پروفایل بزنید',
                        style: TextStyle(
                          fontSize: 11.5,
                          color: AppColors.olive700,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
          const Spacer(),
          IconButton.filledTonal(
            tooltip: 'تراکنش‌های کیف پول',
            onPressed: () => context.go('/wallet'),
            icon: const Icon(LucideIcons.walletCards, size: 20),
          ),
        ],
      ),
    );
  }
}

class _HeroRequest extends StatelessWidget {
  const _HeroRequest();

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
                Icon(
                  LucideIcons.sparkles,
                  size: 18,
                  color: AppColors.goldSoft,
                ),
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
              'استاد قرآن و مداحی‌ات را\nپیدا و زمان آزادش را رزرو کن',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                height: 1.5,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'پروفایل استادان تأییدشده و خدمات قابل رزرو را ببین.',
              style: TextStyle(
                fontSize: 13,
                color: Colors.white70,
                height: 1.7,
              ),
            ),
            const SizedBox(height: 16),
            FilledButton.tonalIcon(
              onPressed: () => context.go('/search'),
              icon: const Icon(LucideIcons.search, size: 18),
              label: const Text('جستجوی استاد'),
              style: FilledButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: AppColors.olive700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickCategories extends StatelessWidget {
  const _QuickCategories();

  @override
  Widget build(BuildContext context) {
    const categories = [
      (
        LucideIcons.bookOpen,
        'آموزش قرآن',
        'روخوانی، تجوید و حفظ',
        AppColors.olive100,
        AppColors.olive700,
      ),
      (
        LucideIcons.mic,
        'مداحی',
        'صوت، لحن و اجرا',
        AppColors.clayBg,
        AppColors.clay,
      ),
    ];
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: categories.map((category) {
          return Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 5),
              child: InkWell(
                borderRadius: BorderRadius.circular(24),
                onTap: () => context.go('/search'),
                child: Container(
                  padding: const EdgeInsets.fromLTRB(12, 15, 12, 13),
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
                          color: category.$4,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Icon(
                          category.$1,
                          size: 25,
                          color: category.$5,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        category.$2,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: AppColors.ink,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        category.$3,
                        textAlign: TextAlign.center,
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
      child: InkWell(
        borderRadius: BorderRadius.circular(30),
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
                          LucideIcons.badgeCheck,
                          size: 15,
                          color: AppColors.goldSoft,
                        ),
                        SizedBox(width: 5),
                        Text(
                          'پروفایل تأییدشده',
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
                      [teacher.tag, teacher.city]
                          .where((value) => value.isNotEmpty)
                          .join(' · '),
                      style: const TextStyle(
                        fontSize: 12.5,
                        color: Colors.white70,
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'مشاهدهٔ خدمات و زمان‌های قابل رزرو',
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(
                LucideIcons.chevronLeft,
                color: Colors.white70,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
