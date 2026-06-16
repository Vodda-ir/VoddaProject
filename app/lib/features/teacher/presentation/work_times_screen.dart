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
  bool _saving = false;
  int? _addingDay;
  TimeOfDay? _from, _to;
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
              child: workTimes.when(
                loading: () => const Center(
                  child: CircularProgressIndicator(color: AppColors.olive600),
                ),
                error: (e, _) => Center(
                  child: Text('خطا', style: TextStyle(color: AppColors.rose)),
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
    final adding = _addingDay == weekday;
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
              _Toggle(
                on: hasSlots,
                onChanged: (on) {
                  if (on) {
                    setState(() => _addingDay = weekday);
                  } else {
                    _slots.removeWhere((s) => s['weekday'] == weekday);
                    setState(() {});
                  }
                },
              ),
            ],
          ),
          if (hasSlots) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ...daySlots.map((s) => _slotChip(s, weekday)),
                if (adding)
                  _addForm(weekday)
                else
                  GestureDetector(
                    onTap: () => setState(() => _addingDay = weekday),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 7,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.sand100,
                        borderRadius: BorderRadius.circular(999),
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
          if (adding && !hasSlots) ...[
            const SizedBox(height: 12),
            _addForm(weekday),
          ],
        ],
      ),
    );
  }

  Widget _slotChip(Map<String, dynamic> s, int weekday) {
    return GestureDetector(
      onTap: () {
        _slots.removeWhere(
          (x) =>
              x['weekday'] == weekday &&
              x['from'] == s['from'] &&
              x['to'] == s['to'],
        );
        setState(() {});
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: AppColors.olive50,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(LucideIcons.clock, size: 14, color: AppColors.olive700),
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
    );
  }

  Widget _addForm(int weekday) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.olive500),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _timeBtn(
                _from != null ? _from!.format(context) : 'از',
                () => _pickTime(true),
              ),
              const SizedBox(width: 8),
              _timeBtn(
                _to != null ? _to!.format(context) : 'تا',
                () => _pickTime(false),
              ),
              const Spacer(),
              IconButton(
                icon: const Icon(LucideIcons.check, color: AppColors.olive600),
                onPressed: () => _saveSlot(weekday),
              ),
              IconButton(
                icon: const Icon(LucideIcons.x, color: AppColors.ink3),
                onPressed: () {
                  _from = null;
                  _to = null;
                  setState(() => _addingDay = null);
                },
              ),
            ],
          ),
          if (_from != null && _to != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                '${_from!.format(context)} تا ${_to!.format(context)}',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppColors.olive700,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _timeBtn(String label, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: AppColors.olive50,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          label,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppColors.olive700,
          ),
        ),
      ),
    );
  }

  Future<void> _pickTime(bool isFrom) async {
    final initial = isFrom
        ? const TimeOfDay(hour: 8, minute: 0)
        : const TimeOfDay(hour: 20, minute: 0);
    final t = await showTimePicker(context: context, initialTime: initial);
    if (t != null) setState(() => isFrom ? _from = t : _to = t);
  }

  void _saveSlot(int weekday) {
    if (_from == null || _to == null) return;
    final fMin = _from!.hour * 60 + _from!.minute;
    final tMin = _to!.hour * 60 + _to!.minute;
    if (tMin <= fMin) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('ساعت پایان باید بعد از شروع باشد')),
      );
      return;
    }
    for (final s in _slots.where((x) => x['weekday'] == weekday)) {
      final sf = _parseMin((s['from'] ?? '').toString()),
          st = _parseMin((s['to'] ?? '').toString());
      if (sf < tMin && st > fMin) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('این بازه با بازهٔ دیگری تداخل دارد')),
        );
        return;
      }
    }
    _slots.add({'weekday': weekday, 'from': _fmt(_from!), 'to': _fmt(_to!)});
    _from = null;
    _to = null;
    setState(() => _addingDay = null);
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
