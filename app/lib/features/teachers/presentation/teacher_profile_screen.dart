import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/fa.dart';
import '../../../core/widgets/app_error.dart';
import '../../../core/widgets/vodda_avatar.dart';
import '../data/teacher_repository.dart';
import '../domain/teacher.dart';

final _teacherByIdProvider = FutureProvider.family<Teacher, int>(
  (ref, id) => ref.watch(teacherRepositoryProvider).byId(id),
);

class TeacherProfileScreen extends ConsumerWidget {
  const TeacherProfileScreen({super.key, required this.id});
  final int id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final teacher = ref.watch(_teacherByIdProvider(id));

    return Scaffold(
      appBar: AppBar(
        title: const Text('پروفایل استاد'),
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowRight),
          onPressed: () => context.pop(),
        ),
      ),
      body: teacher.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppColors.olive600),
        ),
        error: (e, _) => AppErrorView(
          error: e,
          onRetry: () => ref.invalidate(_teacherByIdProvider(id)),
        ),
        data: (t) => RefreshIndicator(
          color: AppColors.olive600,
          onRefresh: () async {
            ref.invalidate(_teacherByIdProvider(id));
            await ref.read(_teacherByIdProvider(id).future);
          },
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Center(
                child: Column(
                  children: [
                    VoddaAvatar(size: 88, ring: true, verified: t.verified),
                    const SizedBox(height: 12),
                    Text(
                      t.name,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: AppColors.ink,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      t.tag,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.olive600,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  _stat(
                    LucideIcons.star,
                    faDigits(t.rating.toStringAsFixed(1)),
                    'امتیاز',
                  ),
                  _stat(
                    LucideIcons.calendarCheck,
                    faNumber(t.sessions),
                    'جلسه',
                  ),
                  _stat(
                    LucideIcons.users,
                    faNumber(t.followers),
                    'دنبال‌کننده',
                  ),
                ],
              ),
              const SizedBox(height: 20),
              const Text(
                'درباره استاد',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: AppColors.ink,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                t.bio,
                style: const TextStyle(
                  fontSize: 14,
                  height: 1.7,
                  color: AppColors.ink2,
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'خدمات',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: AppColors.ink,
                ),
              ),
              const SizedBox(height: 8),
              ...t.services.map(
                (s) => Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  child: ListTile(
                    leading: Container(
                      width: 44,
                      height: 44,
                      decoration: const BoxDecoration(
                        color: AppColors.olive100,
                        borderRadius: BorderRadius.all(Radius.circular(12)),
                      ),
                      child: const Icon(
                        LucideIcons.bookOpen,
                        color: AppColors.olive600,
                      ),
                    ),
                    title: Text(
                      s.title,
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    subtitle: Text('${faNumber(s.duration)} دقیقه'),
                    trailing: Text(
                      toman(s.price),
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        color: AppColors.olive700,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: Padding(
        padding: const EdgeInsets.all(16),
        child: SizedBox(
          height: 52,
          child: ElevatedButton(
            onPressed: () => context.push('/book/$id'),
            child: const Text('رزرو جلسه'),
          ),
        ),
      ),
    );
  }

  Widget _stat(IconData icon, String value, String label) => Expanded(
    child: Container(
      margin: const EdgeInsets.symmetric(horizontal: 4),
      padding: const EdgeInsets.symmetric(vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        children: [
          Icon(icon, color: AppColors.olive500, size: 22),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: AppColors.ink,
            ),
          ),
          Text(
            label,
            style: const TextStyle(fontSize: 12, color: AppColors.ink3),
          ),
        ],
      ),
    ),
  );
}
