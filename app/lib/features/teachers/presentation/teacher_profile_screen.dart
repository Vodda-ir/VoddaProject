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
        error: (error, _) => AppErrorView(
          error: error,
          onRetry: () => ref.invalidate(_teacherByIdProvider(id)),
        ),
        data: (value) => RefreshIndicator(
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
                    VoddaAvatar(size: 88, ring: true, verified: value.verified),
                    const SizedBox(height: 12),
                    Text(
                      value.name,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: AppColors.ink,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      value.tag,
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
                    value.reviews > 0
                        ? faDigits(value.rating.toStringAsFixed(1))
                        : '—',
                    'امتیاز',
                  ),
                  _stat(
                    LucideIcons.messageCircle,
                    faNumber(value.reviews),
                    'نظر',
                  ),
                  _stat(
                    LucideIcons.calendarCheck,
                    faNumber(value.sessions),
                    'جلسه',
                  ),
                ],
              ),
              const SizedBox(height: 20),
              const Text(
                'دربارهٔ استاد',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: AppColors.ink,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                value.bio.isEmpty ? 'اطلاعاتی ثبت نشده است.' : value.bio,
                style: const TextStyle(
                  fontSize: 14,
                  height: 1.7,
                  color: AppColors.ink2,
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'خدمات تأییدشده',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: AppColors.ink,
                ),
              ),
              const SizedBox(height: 8),
              if (value.services.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 20),
                  child: Text(
                    'این استاد فعلاً خدمت قابل رزروی ندارد.',
                    style: TextStyle(color: AppColors.ink3),
                  ),
                )
              else
                ...value.services.map(
                  (service) => Card(
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
                        service.title,
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                      subtitle: Text('${faNumber(service.duration)} دقیقه'),
                      trailing: Text(
                        toman(service.price),
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
      bottomNavigationBar: teacher.valueOrNull == null
          ? null
          : Padding(
              padding: const EdgeInsets.all(16),
              child: SizedBox(
                height: 52,
                child: ElevatedButton(
                  onPressed: teacher.valueOrNull!.services.isEmpty
                      ? null
                      : () => context.push('/book/$id'),
                  child: Text(
                    teacher.valueOrNull!.services.isEmpty
                        ? 'خدمت قابل رزرو وجود ندارد'
                        : 'رزرو جلسه',
                  ),
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
          Text(label, style: const TextStyle(fontSize: 12, color: AppColors.ink3)),
        ],
      ),
    ),
  );
}
