import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/fa.dart';
import '../../../core/widgets/app_error.dart';
import '../../../core/widgets/ui.dart';
import '../data/teacher_repository.dart';
import '../domain/teacher.dart';
import 'widgets/teacher_card.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _searchController = TextEditingController();
  Timer? _debounce;
  String _query = '';
  String _field = '';
  String _city = '';
  bool? _female;

  static const _fields = [
    ('', 'همه'),
    ('آموزش قرآن کریم', 'آموزش قرآن'),
    ('مداحی اهل‌بیت', 'مداحی'),
  ];

  TeacherSearchFilter get _filter => TeacherSearchFilter(
        query: _query,
        field: _field,
        city: _city,
        female: _female,
        limit: 50,
      );

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _onQueryChanged(String value) {
    setState(() {});
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () {
      if (!mounted) return;
      setState(() => _query = value.trim());
    });
  }

  @override
  Widget build(BuildContext context) {
    final filter = _filter;
    final teachers = ref.watch(teacherSearchProvider(filter));
    final hasAdvancedFilter = _city.isNotEmpty || _female != null;

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
                const SizedBox(height: 5),
                const Text(
                  'نام، تخصص، شهر و جنسیت استاد را جستجو کنید.',
                  style: TextStyle(fontSize: 12.5, color: AppColors.ink3),
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
                          controller: _searchController,
                          onChanged: _onQueryChanged,
                          textInputAction: TextInputAction.search,
                          decoration: InputDecoration(
                            hintText: 'نام استاد یا تخصص…',
                            prefixIcon: const Icon(
                              LucideIcons.search,
                              color: AppColors.ink3,
                            ),
                            suffixIcon: _searchController.text.isEmpty
                                ? null
                                : IconButton(
                                    tooltip: 'پاک کردن جستجو',
                                    onPressed: () {
                                      _debounce?.cancel();
                                      _searchController.clear();
                                      setState(() => _query = '');
                                    },
                                    icon: const Icon(
                                      LucideIcons.x,
                                      size: 19,
                                      color: AppColors.ink3,
                                    ),
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
                    Badge(
                      isLabelVisible: hasAdvancedFilter,
                      child: IconButton.filled(
                        tooltip: 'فیلتر شهر و جنسیت',
                        onPressed: _showFilters,
                        style: IconButton.styleFrom(
                          fixedSize: const Size(50, 50),
                          backgroundColor: AppColors.olive600,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        icon: const Icon(Icons.tune),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          SizedBox(
            height: 40,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              itemCount: _fields.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (_, index) {
                final item = _fields[index];
                return VChip(
                  label: item.$2,
                  active: _field == item.$1,
                  onTap: () => setState(() => _field = item.$1),
                );
              },
            ),
          ),
          if (hasAdvancedFilter)
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 10, 20, 0),
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  if (_city.isNotEmpty)
                    InputChip(
                      label: Text('شهر: $_city'),
                      onDeleted: () => setState(() => _city = ''),
                    ),
                  if (_female != null)
                    InputChip(
                      label: Text(_female! ? 'استاد خانم' : 'استاد آقا'),
                      onDeleted: () => setState(() => _female = null),
                    ),
                ],
              ),
            ),
          const SizedBox(height: 14),
          Expanded(
            child: RefreshIndicator(
              color: AppColors.olive600,
              onRefresh: () async {
                ref.invalidate(teacherSearchProvider(filter));
                await ref.read(teacherSearchProvider(filter).future);
              },
              child: teachers.when(
                loading: () => ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: const [
                    SizedBox(height: 220),
                    Center(
                      child: CircularProgressIndicator(
                        color: AppColors.olive600,
                      ),
                    ),
                  ],
                ),
                error: (error, _) => ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: [
                    SizedBox(
                      height: 260,
                      child: AppErrorView(
                        error: error,
                        onRetry: () =>
                            ref.invalidate(teacherSearchProvider(filter)),
                      ),
                    ),
                  ],
                ),
                data: _results,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _showFilters() async {
    final cityController = TextEditingController(text: _city);
    var selectedFemale = _female;
    final result = await showModalBottomSheet<({String city, bool? female})>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setSheetState) => Padding(
          padding: EdgeInsets.fromLTRB(
            20,
            8,
            20,
            MediaQuery.viewInsetsOf(context).bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'فیلترهای جستجو',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 18),
              TextField(
                controller: cityController,
                decoration: const InputDecoration(
                  labelText: 'شهر',
                  prefixIcon: Icon(LucideIcons.mapPin),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'جنسیت استاد',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  ChoiceChip(
                    label: const Text('فرقی ندارد'),
                    selected: selectedFemale == null,
                    onSelected: (_) =>
                        setSheetState(() => selectedFemale = null),
                  ),
                  ChoiceChip(
                    label: const Text('آقا'),
                    selected: selectedFemale == false,
                    onSelected: (_) =>
                        setSheetState(() => selectedFemale = false),
                  ),
                  ChoiceChip(
                    label: const Text('خانم'),
                    selected: selectedFemale == true,
                    onSelected: (_) =>
                        setSheetState(() => selectedFemale = true),
                  ),
                ],
              ),
              const SizedBox(height: 22),
              FilledButton(
                onPressed: () => Navigator.of(context).pop(
                  (
                    city: cityController.text.trim(),
                    female: selectedFemale,
                  ),
                ),
                child: const Text('اعمال فیلتر'),
              ),
              TextButton(
                onPressed: () => Navigator.of(context).pop(
                  (city: '', female: null),
                ),
                child: const Text('پاک کردن فیلترها'),
              ),
            ],
          ),
        ),
      ),
    );
    cityController.dispose();
    if (result == null || !mounted) return;
    setState(() {
      _city = result.city;
      _female = result.female;
    });
  }

  Widget _results(List<Teacher> teachers) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Text(
            '${faNumber(teachers.length)} استاد یافت شد',
            style: const TextStyle(fontSize: 13, color: AppColors.ink3),
          ),
        ),
        if (teachers.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 60),
            child: Center(
              child: Text(
                'نتیجه‌ای با این فیلترها یافت نشد.',
                style: TextStyle(color: AppColors.ink3),
              ),
            ),
          )
        else
          for (final teacher in teachers)
            Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: TeacherCard(
                teacher: teacher,
                wide: true,
                onTap: () => context.push('/teacher/${teacher.id}'),
              ),
            ),
      ],
    );
  }
}
