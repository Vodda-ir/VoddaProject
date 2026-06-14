import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../data/teacher_repository.dart';
import 'widgets/teacher_card.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final teachers = ref.watch(teachersProvider(''));

    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.only(bottom: 24),
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text('سلام 👋', style: TextStyle(fontSize: 14, color: AppColors.ink3)),
                      SizedBox(height: 2),
                      Text('بیایید استاد قرآن‌تان را پیدا کنید',
                          style: TextStyle(fontSize: 19, fontWeight: FontWeight.w800, color: AppColors.ink)),
                    ],
                  ),
                ),
                const CircleAvatar(radius: 22, backgroundColor: AppColors.olive100, child: Text('👤')),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: GestureDetector(
              onTap: () => context.go('/search'),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(18),
                  boxShadow: const [BoxShadow(color: Color(0x0A2E3622), blurRadius: 6)],
                ),
                child: Row(
                  children: const [
                    Icon(Icons.search, color: AppColors.ink3),
                    SizedBox(width: 10),
                    Text('جستجوی استاد یا تخصص…', style: TextStyle(color: AppColors.ink3)),
                  ],
                ),
              ),
            ),
          ),
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 24, 20, 12),
            child: Text('اساتید برتر',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.ink)),
          ),
          teachers.when(
            loading: () => const Padding(
              padding: EdgeInsets.all(40),
              child: Center(child: CircularProgressIndicator(color: AppColors.olive600)),
            ),
            error: (e, _) => Padding(
              padding: const EdgeInsets.all(20),
              child: Text('خطا در دریافت اطلاعات: $e', style: const TextStyle(color: AppColors.rose)),
            ),
            data: (list) => SizedBox(
              height: 200,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                itemCount: list.length,
                separatorBuilder: (context, index) => const SizedBox(width: 14),
                itemBuilder: (_, i) => TeacherCard(
                  teacher: list[i],
                  onTap: () => context.go('/teacher/${list[i].id}'),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
