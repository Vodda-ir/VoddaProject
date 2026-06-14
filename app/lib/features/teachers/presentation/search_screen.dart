import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../data/teacher_repository.dart';
import 'widgets/teacher_card.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final teachers = ref.watch(teachersProvider(_query));

    return SafeArea(
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
            child: TextField(
              autofocus: false,
              decoration: const InputDecoration(
                hintText: 'جستجوی استاد، تخصص یا شهر…',
                prefixIcon: Icon(Icons.search, color: AppColors.ink3),
              ),
              onSubmitted: (v) => setState(() => _query = v.trim()),
            ),
          ),
          Expanded(
            child: teachers.when(
              loading: () => const Center(child: CircularProgressIndicator(color: AppColors.olive600)),
              error: (e, _) => Center(child: Text('خطا: $e', style: const TextStyle(color: AppColors.rose))),
              data: (list) => list.isEmpty
                  ? const Center(child: Text('نتیجه‌ای یافت نشد', style: TextStyle(color: AppColors.ink3)))
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                      itemCount: list.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 14),
                      itemBuilder: (_, i) => TeacherCard(
                        teacher: list[i],
                        wide: true,
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
