import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/fa.dart';
import '../../../core/widgets/app_error.dart';
import '../../../core/widgets/ui.dart';
import '../data/teacher_repository.dart';
import '../domain/teacher.dart';
import 'widgets/teacher_card.dart';

/// Search/Explore screen, matching docs/design/vodda-screens-home.jsx.
class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  String _q = '';
  String _field = 'all';

  static const _fields = [
    ('all', 'همه'),
    ('آموزش قرآن کریم', 'آموزش قرآن'),
    ('مداحی اهل‌بیت', 'مداحی'),
  ];

  @override
  Widget build(BuildContext context) {
    final teachersAsync = ref.watch(teachersProvider(''));

    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 6, 20, 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'جستجوی استاد',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: const [
                            BoxShadow(color: Color(0x0A2E3622), blurRadius: 4),
                          ],
                        ),
                        child: TextField(
                          onChanged: (v) => setState(() => _q = v.trim()),
                          decoration: const InputDecoration(
                            hintText: 'نام استاد یا تخصص…',
                            prefixIcon: Icon(
                              LucideIcons.search,
                              color: AppColors.ink3,
                            ),
                            border: InputBorder.none,
                            enabledBorder: InputBorder.none,
                            focusedBorder: InputBorder.none,
                            filled: false,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Container(
                      width: 50,
                      height: 50,
                      decoration: BoxDecoration(
                        color: AppColors.olive600,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: const [
                          BoxShadow(color: Color(0x475E6E43), blurRadius: 10),
                        ],
                      ),
                      child: const Icon(Icons.tune, color: Colors.white),
                    ),
                  ],
                ),
              ],
            ),
          ),
          // field chips
          SizedBox(
            height: 38,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              children: [
                for (final f in _fields) ...[
                  VChip(
                    label: f.$2,
                    active: _field == f.$1,
                    onTap: () => setState(() => _field = f.$1),
                  ),
                  const SizedBox(width: 8),
                ],
                const VChip(label: 'امتیاز بالا', icon: LucideIcons.star),
                const SizedBox(width: 8),
                const VChip(
                  label: 'نزدیک من',
                  icon: LucideIcons.mapPin,
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: RefreshIndicator(
              color: AppColors.olive600,
              onRefresh: () async {
                ref.invalidate(teachersProvider(''));
                await ref.read(teachersProvider('').future);
              },
              child: teachersAsync.when(
                loading: () => ListView(
                  children: const [
                    SizedBox(height: 200),
                    Center(
                      child: CircularProgressIndicator(color: AppColors.olive600),
                    ),
                  ],
                ),
                error: (e, _) => ListView(
                  children: [
                    SizedBox(
                      height: 200,
                      child: AppErrorView(
                        error: e,
                        onRetry: () => ref.invalidate(teachersProvider('')),
                      ),
                    ),
                  ],
                ),
                data: (all) {
                  final list = all.where((t) {
                    final byField = _field == 'all' || t.field == _field;
                    final byQuery =
                        _q.isEmpty || t.name.contains(_q) || t.tag.contains(_q);
                    return byField && byQuery;
                  }).toList();
                  return _results(list);
                },
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _results(List<Teacher> list) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Text(
            '${faNumber(list.length)} استاد یافت شد',
            style: const TextStyle(fontSize: 13, color: AppColors.ink3),
          ),
        ),
        if (list.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 60),
            child: Center(
              child: Text(
                'نتیجه‌ای یافت نشد',
                style: TextStyle(color: AppColors.ink3),
              ),
            ),
          )
        else
          for (final t in list)
            Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: TeacherCard(
                teacher: t,
                wide: true,
                onTap: () => context.push('/teacher/${t.id}'),
              ),
            ),
      ],
    );
  }
}
