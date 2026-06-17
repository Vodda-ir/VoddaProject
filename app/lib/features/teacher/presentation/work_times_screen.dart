import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/app_error.dart';
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
  bool _saving = false;
  List<Map<String, dynamic>> _slots = [];
  List<Map<String, dynamic>>? _originalSlots;

  bool get _dirty {
    if (_originalSlots == null) return false;
    if (_slots.length != _originalSlots!.length) return true;
    final a = _slots
        .map((s) => '${s['weekday']}-${s['from']}-${s['to']}')
        .toSet();
    final b = _originalSlots!
        .map((s) => '${s['weekday']}-${s['from']}-${s['to']}')
        .toSet();
    return !a.containsAll(b) || !b.containsAll(a);
  }

  @override
  Widget build(BuildContext context) {
    final workTimes = ref.watch(myWorkTimesProvider);
    return PopScope(
      canPop: !_dirty,
      onPopInvokedWithResult: (didPop, _) => _onPop(didPop),
      child: Scaffold(
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
              child: RefreshIndicator(
                color: AppColors.olive600,
                onRefresh: () async {
                  ref.invalidate(myWorkTimesProvider);
                  await ref.read(myWorkTimesProvider.future);
                },
                child: workTimes.when(
                  loading: () => ListView(
                    children: const [
                      SizedBox(height: 160),
                      Center(
                        child: CircularProgressIndicator(
                          color: AppColors.olive600,
                        ),
                      ),
                    ],
                  ),
                  error: (e, _) => ListView(
                    children: [
                      SizedBox(
                        height: 160,
                        child: AppErrorView(
                          error: e,
                          onRetry: () => ref.invalidate(myWorkTimesProvider),
                        ),
                      ),
                    ],
                  ),
                  data: (slots) {
                    _originalSlots ??= List.from(slots);
                    _slots = slots;
                    return ListView(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      children: List.generate(
                        7,
                        (weekday) => _dayCard(weekday, slots),
                      ),
                    );
                  },
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(20),
              child: SizedBox(
                height: 52,
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: (!_dirty || _saving) ? null : _save,
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
      ),
    );
  }

  void _onPop(bool didPop) {
    if (!didPop && _dirty) _confirmLeave();
  }

  Widget _dayCard(int weekday, List<Map<String, dynamic>> slots) {
    final daySlots = slots.where((s) => s['weekday'] == weekday).toList();
    final hasSlots = daySlots.isNotEmpty;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        boxShadow: const [BoxShadow(color: Color(0x0A2E3622), blurRadius: 4)],
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
                  color: hasSlots ? AppColors.ink : AppColors.ink4,
                ),
              ),
              GestureDetector(
                onTap: () => _showAddRangeDialog(weekday),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 7,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.olive50,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        LucideIcons.plus,
                        size: 14,
                        color: AppColors.olive700,
                      ),
                      SizedBox(width: 4),
                      Text(
                        'افزودن بازه',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: AppColors.olive700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          if (hasSlots) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: daySlots.map((s) => _slotChip(s, weekday)).toList(),
            ),
          ],
          if (!hasSlots)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                'تعطیل',
                style: TextStyle(fontSize: 12.5, color: AppColors.ink4),
              ),
            ),
        ],
      ),
    );
  }

  Widget _slotChip(Map<String, dynamic> s, int weekday) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        color: AppColors.olive50,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          GestureDetector(
            onTap: () => _showEditRangeDialog(weekday, s),
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
          const SizedBox(width: 6),
          GestureDetector(
            onTap: () {
              _slots.removeWhere(
                (x) =>
                    x['weekday'] == weekday &&
                    x['from'] == s['from'] &&
                    x['to'] == s['to'],
              );
              setState(() {});
            },
            child: const Icon(LucideIcons.x, size: 14, color: AppColors.ink3),
          ),
        ],
      ),
    );
  }

  Future<void> _showAddRangeDialog(int weekday) async {
    TimeOfDay from = const TimeOfDay(hour: 8, minute: 0);
    TimeOfDay to = const TimeOfDay(hour: 20, minute: 0);
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => _TimeRangeDialog(
        weekday: weekday,
        dayName: _dayNames[weekday],
        initialFrom: from,
        initialTo: to,
        existingSlots: _slots,
        onSave: (f, t) {
          from = f;
          to = t;
        },
      ),
    );
    if (result == true) {
      final fMin = from.hour * 60 + from.minute;
      final tMin = to.hour * 60 + to.minute;
      if (tMin <= fMin) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('ساعت پایان باید بعد از شروع باشد')),
          );
        }
        return;
      }
      for (final s in _slots.where((x) => x['weekday'] == weekday)) {
        final sf = _parseMin((s['from'] ?? '').toString()),
            st = _parseMin((s['to'] ?? '').toString());
        if (sf < tMin && st > fMin) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('این بازه با بازهٔ دیگری تداخل دارد'),
              ),
            );
          }
          return;
        }
      }
      setState(() {
        _slots.add({'weekday': weekday, 'from': _fmt(from), 'to': _fmt(to)});
      });
    }
  }

  Future<void> _showEditRangeDialog(
    int weekday,
    Map<String, dynamic> slot,
  ) async {
    final initialFrom = _parseTime(slot['from'] ?? '08:00');
    final initialTo = _parseTime(slot['to'] ?? '20:00');
    TimeOfDay from = TimeOfDay(
      hour: initialFrom ~/ 60,
      minute: initialFrom % 60,
    );
    TimeOfDay to = TimeOfDay(hour: initialTo ~/ 60, minute: initialTo % 60);
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => _TimeRangeDialog(
        weekday: weekday,
        dayName: _dayNames[weekday],
        initialFrom: from,
        initialTo: to,
        existingSlots: _slots,
        editingSlot: slot,
        onSave: (f, t) {
          from = f;
          to = t;
        },
      ),
    );
    if (result == true) {
      final fMin = from.hour * 60 + from.minute;
      final tMin = to.hour * 60 + to.minute;
      if (tMin <= fMin) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('ساعت پایان باید بعد از شروع باشد')),
          );
        }
        return;
      }
      for (final s in _slots.where((x) => x['weekday'] == weekday)) {
        if (s == slot) continue;
        final sf = _parseMin((s['from'] ?? '').toString()),
            st = _parseMin((s['to'] ?? '').toString());
        if (sf < tMin && st > fMin) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('این بازه با بازهٔ دیگری تداخل دارد'),
              ),
            );
          }
          return;
        }
      }
      setState(() {
        slot['from'] = _fmt(from);
        slot['to'] = _fmt(to);
      });
    }
  }

  /// Parse "HH:MM" to total minutes.
  int _parseTime(String s) {
    final p = s.trim().split(':');
    if (p.length < 2) return 0;
    return (int.tryParse(p[0]) ?? 0) * 60 + (int.tryParse(p[1]) ?? 0);
  }

  String _fmt(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  /// Safely parse "HH:MM" to total minutes. Returns 0 for unexpected input.
  int _parseMin(String s) {
    final p = s.trim().split(':');
    if (p.length < 2) return 0;
    final h = int.tryParse(p[0]) ?? 0;
    final m = int.tryParse(p[1]) ?? 0;
    return h * 60 + m;
  }

  void _confirmLeave() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('تغییرات ذخیره نشده'),
        content: const Text(
          'تغییرات شما ذخیره نشده است. آیا مطمئنید می‌خواهید خارج شوید؟',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('انصراف'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pop(context);
            },
            child: const Text('خروج بدون ذخیره'),
          ),
        ],
      ),
    );
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    final ok = await ref.read(teacherRepositoryProvider).saveWorkTimes(_slots);
    if (ok) {
      _originalSlots = List.from(_slots);
      ref.invalidate(myWorkTimesProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('زمان\u200Cهای کاری با موفقیت ذخیره شد'),
            backgroundColor: AppColors.olive600,
            duration: Duration(seconds: 2),
          ),
        );
      }
    }
    if (mounted) setState(() => _saving = false);
  }
}

class _TimeRangeDialog extends StatefulWidget {
  const _TimeRangeDialog({
    required this.weekday,
    required this.dayName,
    required this.initialFrom,
    required this.initialTo,
    required this.existingSlots,
    this.editingSlot,
    required this.onSave,
  });

  final int weekday;
  final String dayName;
  final TimeOfDay initialFrom;
  final TimeOfDay initialTo;
  final List<Map<String, dynamic>> existingSlots;
  final Map<String, dynamic>? editingSlot;
  final void Function(TimeOfDay from, TimeOfDay to) onSave;

  @override
  State<_TimeRangeDialog> createState() => _TimeRangeDialogState();
}

class _TimeRangeDialogState extends State<_TimeRangeDialog> {
  late TimeOfDay _from;
  late TimeOfDay _to;

  @override
  void initState() {
    super.initState();
    _from = widget.initialFrom;
    _to = widget.initialTo;
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.editingSlot != null;
    return Directionality(
      textDirection: TextDirection.rtl,
      child: AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          '${isEdit ? 'ویرایش' : 'افزودن'} بازه - ${widget.dayName}',
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _timePickerButton(
                  label: 'از',
                  time: _from,
                  onTap: () => _pickTime(true),
                ),
                const Text(
                  'تا',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.ink3,
                  ),
                ),
                _timePickerButton(
                  label: 'تا',
                  time: _to,
                  onTap: () => _pickTime(false),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: AppColors.olive50,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                '${_from.format(context)} تا ${_to.format(context)}',
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: AppColors.olive700,
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text(
              'انصراف',
              style: TextStyle(color: AppColors.ink3),
            ),
          ),
          ElevatedButton(
            onPressed: () {
              widget.onSave(_from, _to);
              Navigator.pop(context, true);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.olive600,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: Text(isEdit ? 'ذخیره' : 'افزودن'),
          ),
        ],
      ),
    );
  }

  Widget _timePickerButton({
    required String label,
    required TimeOfDay time,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        decoration: BoxDecoration(
          color: AppColors.olive50,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.olive200),
        ),
        child: Column(
          children: [
            Text(
              label,
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: AppColors.ink3,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              time.format(context),
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: AppColors.olive700,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickTime(bool isFrom) async {
    final initial = isFrom ? _from : _to;
    final t = await showTimePicker(context: context, initialTime: initial);
    if (t != null) {
      setState(() {
        if (isFrom) {
          _from = t;
        } else {
          _to = t;
        }
      });
    }
  }
}
