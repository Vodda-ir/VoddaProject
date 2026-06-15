import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_colors.dart';
import '../data/teacher_repository.dart';

class WorkTimesScreen extends ConsumerStatefulWidget {
  const WorkTimesScreen({super.key});
  @override
  ConsumerState<WorkTimesScreen> createState() => _WorkTimesScreenState();
}

class _WorkTimesScreenState extends ConsumerState<WorkTimesScreen> {
  static const _dayNames = [
    'شنبه',
    'یکشنبه',
    'دوشنبه',
    'سه‌شنبه',
    'چهارشنبه',
    'پنج‌شنبه',
    'جمعه',
  ];
  final _fromCtrl = TextEditingController();
  final _toCtrl = TextEditingController();
  bool _saving = false;
  int? _addingDay;
  List<Map<String, dynamic>> _slots = [];

  @override
  Widget build(BuildContext context) {
    final workTimes = ref.watch(myWorkTimesProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('زمان‌های کاری')),
      body: Column(
        children: [
          const Padding(
            padding: EdgeInsets.all(20),
            child: Text(
              'روزها و ساعت‌هایی که برای برگزاری جلسه در دسترس هستید را مشخص کنید.',
              style: TextStyle(
                fontSize: 13,
                color: AppColors.ink3,
                height: 1.9,
              ),
            ),
          ),
          Expanded(
            child: workTimes.when(
              loading: () => const Center(
                child: CircularProgressIndicator(color: AppColors.olive600),
              ),
              error: (e, _) => Center(
                child: Text('خطا', style: TextStyle(color: AppColors.rose)),
              ),
              data: (slots) {
                _slots = slots;
                return ListView(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  children: List.generate(7, (weekday) {
                    final daySlots = slots
                        .where((s) => s['weekday'] == weekday)
                        .toList();
                    final hasSlots = daySlots.isNotEmpty;
                    final adding = _addingDay == weekday;
                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(18),
                        boxShadow: const [
                          BoxShadow(color: Color(0x0A2E3622), blurRadius: 4),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                _dayNames[weekday],
                                style: TextStyle(
                                  fontSize: 14.5,
                                  fontWeight: FontWeight.w700,
                                  color: hasSlots
                                      ? AppColors.ink
                                      : AppColors.ink4,
                                ),
                              ),
                              _Toggle(
                                on: hasSlots,
                                onChanged: (on) => on
                                    ? setState(() => _addingDay = weekday)
                                    : _removeDay(weekday),
                              ),
                            ],
                          ),
                          if (hasSlots || adding) ...[
                            const SizedBox(height: 12),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                ...daySlots.map(
                                  (s) => Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 7,
                                    ),
                                    decoration: BoxDecoration(
                                      color: AppColors.olive50,
                                      borderRadius: BorderRadius.circular(999),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(
                                          LucideIcons.clock,
                                          size: 14,
                                          color: AppColors.olive700,
                                        ),
                                        const SizedBox(width: 6),
                                        Text(
                                          '${s['from']} تا ${s['to']}',
                                          style: const TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w600,
                                            color: AppColors.olive700,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                if (adding)
                                  Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: AppColors.surface,
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                        color: AppColors.olive500,
                                      ),
                                    ),
                                    child: Row(
                                      children: [
                                        Expanded(
                                          child: TextField(
                                            controller: _fromCtrl,
                                            decoration: const InputDecoration(
                                              hintText: 'از (۱۶:۰۰)',
                                              border: InputBorder.none,
                                              isDense: true,
                                            ),
                                          ),
                                        ),
                                        const Text(
                                          ' تا ',
                                          style: TextStyle(
                                            color: AppColors.ink3,
                                          ),
                                        ),
                                        Expanded(
                                          child: TextField(
                                            controller: _toCtrl,
                                            decoration: const InputDecoration(
                                              hintText: 'تا (۲۰:۰۰)',
                                              border: InputBorder.none,
                                              isDense: true,
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        IconButton(
                                          icon: const Icon(
                                            LucideIcons.check,
                                            color: AppColors.olive600,
                                          ),
                                          onPressed: () {
                                            final f = _fromCtrl.text.trim(),
                                                t = _toCtrl.text.trim();
                                            if (f.isEmpty || t.isEmpty) return;
                                            _slots.add({
                                              'weekday': weekday,
                                              'from': f,
                                              'to': t,
                                            });
                                            _fromCtrl.clear();
                                            _toCtrl.clear();
                                            setState(() => _addingDay = null);
                                          },
                                        ),
                                        IconButton(
                                          icon: const Icon(
                                            LucideIcons.x,
                                            color: AppColors.ink3,
                                          ),
                                          onPressed: () =>
                                              setState(() => _addingDay = null),
                                        ),
                                      ],
                                    ),
                                  ),
                                if (!adding && hasSlots)
                                  GestureDetector(
                                    onTap: () =>
                                        setState(() => _addingDay = weekday),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 12,
                                        vertical: 7,
                                      ),
                                      decoration: BoxDecoration(
                                        color: AppColors.sand100,
                                        borderRadius: BorderRadius.circular(
                                          999,
                                        ),
                                      ),
                                      child: const Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(
                                            LucideIcons.plus,
                                            size: 14,
                                            color: AppColors.ink3,
                                          ),
                                          SizedBox(width: 4),
                                          Text(
                                            'بازه',
                                            style: TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w700,
                                              color: AppColors.ink3,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    );
                  }),
                );
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: SizedBox(
              height: 52,
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _saving ? null : _save,
                icon: _saving
                    ? const SizedBox(
                        width: 19,
                        height: 19,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(LucideIcons.check, size: 19),
                label: Text(_saving ? 'در حال ذخیره...' : 'ذخیرهٔ تغییرات'),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _removeDay(int weekday) {
    _slots.removeWhere((s) => s['weekday'] == weekday);
    setState(() {});
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await ref.read(teacherRepositoryProvider).saveWorkTimes(_slots);
      ref.invalidate(myWorkTimesProvider);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  void dispose() {
    _fromCtrl.dispose();
    _toCtrl.dispose();
    super.dispose();
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
