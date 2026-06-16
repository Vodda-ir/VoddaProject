import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/fa.dart';
import '../../../core/widgets/app_error.dart';
import '../../teachers/data/teacher_repository.dart';
import '../../teachers/domain/teacher.dart';
import '../data/session_repository.dart';

final _teacherProvider = FutureProvider.family<Teacher, int>(
  (ref, id) => ref.watch(teacherRepositoryProvider).byId(id),
);

/// 4-step booking flow: service → date & time → confirm → success.
class BookingScreen extends ConsumerStatefulWidget {
  const BookingScreen({super.key, required this.teacherId});
  final int teacherId;

  @override
  ConsumerState<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends ConsumerState<BookingScreen> {
  int _step = 1;
  Service? _service;
  int _dayOffset = 1;
  String? _slot;
  bool _saving = false;
  List<Map<String, dynamic>> _workTimes = [];
  bool _loadingSlots = false;

  @override
  void initState() {
    super.initState();
    _fetchWorkTimes();
  }

  Future<void> _fetchWorkTimes() async {
    setState(() => _loadingSlots = true);
    try {
      final dio = ref.read(dioClientProvider).dio;
      final res = await dio.get('/teachers/${widget.teacherId}/work-times');
      final raw = (res.data is Map) ? (res.data['data'] as List?) : null;
      _workTimes =
          raw?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
    } catch (_) {
      _workTimes = [];
    } finally {
      if (mounted) setState(() => _loadingSlots = false);
    }
  }

  /// Generate available 30-min slots for the selected day from teacher's work times.
  List<String> _availableSlots() {
    final d = DateTime.now().add(Duration(days: _dayOffset));
    // Persian week: 0=Sat … 6=Fri.  Dart weekday 1=Mon → Persian 2
    final persianWeekday = (d.weekday + 1) % 7;

    final slots = <String>[];
    for (final w in _workTimes) {
      // Compare weekday as int, tolerating String-encoded numbers from JSON.
      final wd = w['weekday'];
      if (wd == null) continue;
      if ((wd is int ? wd : int.tryParse(wd.toString())) != persianWeekday)
        continue;

      final fromRaw = w['from'];
      final toRaw = w['to'];
      if (fromRaw == null || toRaw == null) continue;
      final from = _parseMin(fromRaw.toString());
      final to = _parseMin(toRaw.toString());
      if (from == null || to == null || to <= from) continue;
      for (int m = from; m + 30 <= to; m += 30) {
        final h = m ~/ 60;
        final min = m % 60;
        slots.add(
          '${h.toString().padLeft(2, '0')}:${min.toString().padLeft(2, '0')}',
        );
      }
    }
    return slots;
  }

  /// Parses a time string like "14:00" or "14:00:00" into total minutes.
  /// Returns null for malformed input instead of crashing.
  int? _parseMin(String s) {
    final p = s.trim().split(':');
    if (p.length < 2) return null;
    final h = int.tryParse(p[0]);
    final m = int.tryParse(p[1]);
    if (h == null || m == null) return null;
    return h * 60 + m;
  }

  @override
  Widget build(BuildContext context) {
    final teacher = ref.watch(_teacherProvider(widget.teacherId));
    return Scaffold(
      appBar: AppBar(
        title: const Text('رزرو جلسه'),
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowRight),
          onPressed: () =>
              _step > 1 && _step < 4 ? setState(() => _step--) : context.pop(),
        ),
      ),
      body: teacher.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppColors.olive600),
        ),
        error: (e, _) => AppErrorView(
          error: e,
          onRetry: () => ref.invalidate(_teacherProvider(widget.teacherId)),
        ),
        data: (t) => _service == null && t.services.isNotEmpty && _step == 1
            ? _build(t)
            : _build(t),
      ),
    );
  }

  Widget _build(Teacher t) {
    if (_step == 4) return _success(t);
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: List.generate(3, (i) {
              return Expanded(
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  height: 4,
                  decoration: BoxDecoration(
                    color: (i + 1) <= _step
                        ? AppColors.olive600
                        : AppColors.sand200,
                    borderRadius: BorderRadius.circular(9),
                  ),
                ),
              );
            }),
          ),
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            children: [
              if (_step == 1) ..._serviceStep(t),
              if (_step == 2) ..._timeStep(t),
              if (_step == 3) ..._confirmStep(t),
            ],
          ),
        ),
        _bottomBar(t),
      ],
    );
  }

  List<Widget> _serviceStep(Teacher t) => [
    const Text(
      'یک خدمت را انتخاب کنید',
      style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
    ),
    const SizedBox(height: 14),
    ...t.services.where((s) => s.active).map((s) {
      final sel = _service?.id == s.id;
      return GestureDetector(
        onTap: () => setState(() => _service = s),
        child: Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(15),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: sel ? AppColors.olive600 : AppColors.sand200,
              width: sel ? 1.8 : 1,
            ),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      s.title,
                      style: const TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${faNumber(s.duration)} دقیقه',
                      style: const TextStyle(
                        fontSize: 12.5,
                        color: AppColors.ink3,
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                toman(s.price),
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: AppColors.olive700,
                ),
              ),
            ],
          ),
        ),
      );
    }),
  ];

  List<Widget> _timeStep(Teacher t) => [
    const Text(
      'روز را انتخاب کنید',
      style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
    ),
    const SizedBox(height: 14),
    SizedBox(
      height: 78,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: 7,
        separatorBuilder: (_, _) => const SizedBox(width: 10),
        itemBuilder: (_, i) {
          final d = DateTime.now().add(Duration(days: i + 1));
          final sel = _dayOffset == i + 1;
          return GestureDetector(
            onTap: () => setState(() {
              _dayOffset = i + 1;
              _slot = null;
            }),
            child: Container(
              width: 60,
              decoration: BoxDecoration(
                color: sel ? AppColors.olive600 : AppColors.surface,
                borderRadius: BorderRadius.circular(16),
                boxShadow: const [
                  BoxShadow(color: Color(0x0A2E3622), blurRadius: 6),
                ],
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    _weekday(d),
                    style: TextStyle(
                      fontSize: 12,
                      color: sel ? Colors.white70 : AppColors.ink3,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    faNumber(d.day),
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: sel ? Colors.white : AppColors.ink,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    ),
    const SizedBox(height: 22),
    const Text(
      'ساعت را انتخاب کنید',
      style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
    ),
    const SizedBox(height: 14),
    if (_loadingSlots)
      const Center(child: CircularProgressIndicator(color: AppColors.olive600))
    else ...[
      if (_availableSlots().isEmpty)
        const Text(
          'این روز زمان خالی ندارد',
          style: TextStyle(color: AppColors.ink3),
        )
      else
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: _availableSlots().map((s) {
            final sel = _slot == s;
            return GestureDetector(
              onTap: () => setState(() => _slot = s),
              child: Container(
                width: 78,
                padding: const EdgeInsets.symmetric(vertical: 12),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: sel ? AppColors.olive600 : AppColors.surface,
                  borderRadius: BorderRadius.circular(13),
                  border: Border.all(
                    color: sel ? AppColors.olive600 : AppColors.sand200,
                  ),
                ),
                child: Text(
                  s,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: sel ? Colors.white : AppColors.ink2,
                  ),
                ),
              ),
            );
          }).toList(),
        ),
    ],
  ];

  List<Widget> _confirmStep(Teacher t) {
    final d = DateTime.now().add(Duration(days: _dayOffset));
    final rows = [
      ('استاد', t.name),
      ('خدمت', _service?.title ?? '—'),
      ('تاریخ', '${_weekday(d)} ${faNumber(d.day)}'),
      ('ساعت', _slot ?? '—'),
      ('مدت', '${faNumber(_service?.duration ?? 30)} دقیقه'),
      ('مبلغ', toman(_service?.price ?? 0)),
    ];
    return [
      const Text(
        'تأیید و پرداخت',
        style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
      ),
      const SizedBox(height: 14),
      Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(18),
          boxShadow: const [BoxShadow(color: Color(0x0A2E3622), blurRadius: 6)],
        ),
        child: Column(
          children: rows
              .map(
                (r) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 9),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        r.$1,
                        style: const TextStyle(
                          fontSize: 13.5,
                          color: AppColors.ink3,
                        ),
                      ),
                      Text(
                        r.$2,
                        style: const TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              )
              .toList(),
        ),
      ),
      const SizedBox(height: 12),
      const Text(
        'مبلغ از کیف پول شما کسر و تا تأیید استاد نگهداری می‌شود.',
        style: TextStyle(fontSize: 12, color: AppColors.ink3, height: 1.7),
      ),
    ];
  }

  Widget _success(Teacher t) => Center(
    child: Padding(
      padding: const EdgeInsets.all(28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 84,
            height: 84,
            decoration: const BoxDecoration(
              color: AppColors.olive100,
              shape: BoxShape.circle,
            ),
            child: const Icon(
              LucideIcons.checkCircle,
              size: 46,
              color: AppColors.olive600,
            ),
          ),
          const SizedBox(height: 18),
          const Text(
            'درخواست شما ثبت شد',
            style: TextStyle(fontSize: 19, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          const Text(
            'پس از تأیید استاد، جلسه در بخش «جلسات من» نمایش داده می‌شود.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 13, color: AppColors.ink3, height: 1.8),
          ),
          const SizedBox(height: 26),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              onPressed: () => context.go('/sessions'),
              child: const Text('مشاهدهٔ جلسات من'),
            ),
          ),
        ],
      ),
    ),
  );

  Widget _bottomBar(Teacher t) {
    final canNext = _step == 1
        ? _service != null
        : _step == 2
        ? _slot != null
        : true;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton(
            onPressed: !canNext || _saving ? null : () => _next(t),
            child: _saving
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                      color: Colors.white,
                      strokeWidth: 2.4,
                    ),
                  )
                : Text(_step == 3 ? 'ثبت و ارسال درخواست' : 'ادامه'),
          ),
        ),
      ),
    );
  }

  Future<void> _next(Teacher t) async {
    if (_step < 3) {
      setState(() => _step++);
      return;
    }
    // step 3 → book
    setState(() => _saving = true);
    final d = DateTime.now().add(Duration(days: _dayOffset));
    final parts = _slot!.split(':');
    final at = DateTime(
      d.year,
      d.month,
      d.day,
      int.parse(parts[0]),
      int.parse(parts[1]),
    );
    final ok = await ref
        .read(sessionRepositoryProvider)
        .book(teacherId: t.id, serviceId: _service!.id, at: at);
    if (mounted && ok) {
      setState(() => _step = 4);
    }
    if (mounted) setState(() => _saving = false);
  }

  static String _weekday(DateTime d) {
    const names = [
      'دوشنبه',
      'سه‌شنبه',
      'چهارشنبه',
      'پنج‌شنبه',
      'جمعه',
      'شنبه',
      'یک‌شنبه',
    ];
    return names[(d.weekday - 1) % 7];
  }
}
