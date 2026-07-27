import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/fa.dart';
import '../../../core/widgets/app_error.dart';
import '../../teachers/data/teacher_repository.dart';
import '../../teachers/domain/teacher.dart';
import '../data/session_repository.dart';
import '../domain/booking_slots.dart';

final _teacherProvider = FutureProvider.family<Teacher, int>(
  (ref, id) => ref.watch(teacherRepositoryProvider).byId(id),
);

class BookingScreen extends ConsumerStatefulWidget {
  const BookingScreen({super.key, required this.teacherId});

  final int teacherId;

  @override
  ConsumerState<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends ConsumerState<BookingScreen> {
  Service? _service;
  DateTime? _date;
  BookingSlot? _slot;
  List<BookingWorkRange> _workTimes = const [];
  bool _loadingWorkTimes = true;
  bool _saving = false;
  String _loadError = '';

  @override
  void initState() {
    super.initState();
    _fetchWorkTimes();
  }

  Future<void> _fetchWorkTimes() async {
    setState(() {
      _loadingWorkTimes = true;
      _loadError = '';
    });
    try {
      final dio = ref.read(dioClientProvider).dio;
      final response = await dio.get(
        '/teachers/${widget.teacherId}/work-times',
      );
      final raw = response.data is Map
          ? (response.data['data'] as List? ?? const [])
          : const [];
      final ranges = raw
          .map(
            (item) => BookingWorkRange.fromJson(
              Map<String, dynamic>.from(item as Map),
            ),
          )
          .where((range) => range.active)
          .toList();
      if (mounted) setState(() => _workTimes = ranges);
    } catch (_) {
      if (mounted) {
        setState(() {
          _workTimes = const [];
          _loadError = 'زمان‌های کاری استاد دریافت نشد.';
        });
      }
    } finally {
      if (mounted) setState(() => _loadingWorkTimes = false);
    }
  }

  List<({DateTime date, List<BookingSlot> slots})> _availableDates() {
    final selected = _service;
    if (selected == null) return const [];
    final now = DateTime.now();
    return nextBookingDates(count: 14, now: now)
        .map(
          (date) => (
            date: date,
            slots: generateBookingSlots(
              workTimes: _workTimes,
              durationMinutes: selected.duration,
              date: date,
              now: now,
              leadMinutes: 5,
            ),
          ),
        )
        .where((item) => item.slots.isNotEmpty)
        .toList();
  }

  List<BookingSlot> _slotsForSelectedDate() {
    final selectedDate = _date;
    if (selectedDate == null) return const [];
    for (final item in _availableDates()) {
      if (_sameDate(item.date, selectedDate)) return item.slots;
    }
    return const [];
  }

  @override
  Widget build(BuildContext context) {
    final teacher = ref.watch(_teacherProvider(widget.teacherId));
    return Scaffold(
      appBar: AppBar(
        title: const Text('رزرو جلسه'),
        leading: IconButton(
          tooltip: 'بازگشت',
          icon: const Icon(LucideIcons.arrowRight),
          onPressed: context.pop,
        ),
      ),
      body: teacher.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppColors.olive600),
        ),
        error: (error, _) => AppErrorView(
          error: error,
          onRetry: () => ref.invalidate(_teacherProvider(widget.teacherId)),
        ),
        data: _buildContent,
      ),
    );
  }

  Widget _buildContent(Teacher teacher) {
    final services = teacher.services.where((service) => service.active).toList();
    final availableDates = _availableDates();
    final dateSlots = _slotsForSelectedDate();

    return SafeArea(
      child: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
              children: [
                _TeacherSummary(teacher: teacher),
                const SizedBox(height: 18),
                _SectionCard(
                  number: 1,
                  title: 'انتخاب خدمت',
                  child: services.isEmpty
                      ? const _EmptyMessage(
                          text: 'این استاد فعلاً خدمت تأییدشده‌ای ندارد.',
                        )
                      : Column(
                          children: services
                              .map(
                                (service) => _ServiceTile(
                                  service: service,
                                  selected: _service?.id == service.id,
                                  onTap: () => setState(() {
                                    _service = service;
                                    _date = null;
                                    _slot = null;
                                  }),
                                ),
                              )
                              .toList(),
                        ),
                ),
                const SizedBox(height: 14),
                _SectionCard(
                  number: 2,
                  title: 'انتخاب تاریخ و ساعت',
                  child: _service == null
                      ? const _EmptyMessage(
                          text: 'ابتدا یک خدمت را انتخاب کنید.',
                        )
                      : _loadingWorkTimes
                      ? const Center(
                          child: Padding(
                            padding: EdgeInsets.all(20),
                            child: CircularProgressIndicator(
                              color: AppColors.olive600,
                            ),
                          ),
                        )
                      : _loadError.isNotEmpty
                      ? Column(
                          children: [
                            _EmptyMessage(text: _loadError),
                            TextButton.icon(
                              onPressed: _fetchWorkTimes,
                              icon: const Icon(LucideIcons.refreshCw, size: 17),
                              label: const Text('تلاش دوباره'),
                            ),
                          ],
                        )
                      : availableDates.isEmpty
                      ? const _EmptyMessage(
                          text:
                              'در ۱۴ روز آینده زمان قابل رزروی برای این خدمت وجود ندارد.',
                        )
                      : Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            SizedBox(
                              height: 76,
                              child: ListView.separated(
                                scrollDirection: Axis.horizontal,
                                itemCount: availableDates.length,
                                separatorBuilder: (_, _) =>
                                    const SizedBox(width: 9),
                                itemBuilder: (_, index) {
                                  final item = availableDates[index];
                                  return _DateTile(
                                    date: item.date,
                                    count: item.slots.length,
                                    selected: _date != null &&
                                        _sameDate(_date!, item.date),
                                    onTap: () => setState(() {
                                      _date = item.date;
                                      _slot = null;
                                    }),
                                  );
                                },
                              ),
                            ),
                            if (_date != null) ...[
                              const SizedBox(height: 18),
                              Wrap(
                                spacing: 9,
                                runSpacing: 9,
                                children: dateSlots
                                    .map(
                                      (slot) => _SlotChip(
                                        slot: slot,
                                        selected:
                                            _slot?.start == slot.start,
                                        onTap: () =>
                                            setState(() => _slot = slot),
                                      ),
                                    )
                                    .toList(),
                              ),
                            ],
                          ],
                        ),
                ),
                const SizedBox(height: 14),
                _SectionCard(
                  number: 3,
                  title: 'بررسی نهایی',
                  child: _service == null || _slot == null
                      ? const _EmptyMessage(
                          text:
                              'پس از انتخاب خدمت و زمان، خلاصهٔ رزرو نمایش داده می‌شود.',
                        )
                      : _BookingSummary(
                          teacher: teacher,
                          service: _service!,
                          slot: _slot!,
                        ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
            child: SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: _service == null || _slot == null || _saving
                    ? null
                    : () => _submit(teacher),
                child: _saving
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2.3,
                        ),
                      )
                    : const Text('ثبت درخواست رزرو'),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _submit(Teacher teacher) async {
    final service = _service;
    final slot = _slot;
    if (service == null || slot == null) return;

    setState(() => _saving = true);
    final success = await ref.read(sessionRepositoryProvider).book(
          teacherId: teacher.id,
          serviceId: service.id,
          at: slot.start,
        );
    if (mounted) setState(() => _saving = false);
    if (!mounted || !success) return;

    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => AlertDialog(
        icon: const Icon(
          LucideIcons.checkCircle,
          size: 44,
          color: AppColors.olive600,
        ),
        title: const Text('درخواست جلسه ثبت شد'),
        content: const Text(
          'تأیید، رد یا بازگشت وجه را از بخش «جلسات من» پیگیری کنید.',
          textAlign: TextAlign.center,
        ),
        actionsAlignment: MainAxisAlignment.center,
        actions: [
          FilledButton(
            onPressed: () {
              Navigator.of(dialogContext).pop();
              context.go('/sessions');
            },
            child: const Text('مشاهدهٔ جلسات من'),
          ),
        ],
      ),
    );
  }
}

class _TeacherSummary extends StatelessWidget {
  const _TeacherSummary({required this.teacher});
  final Teacher teacher;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        boxShadow: const [
          BoxShadow(color: Color(0x0A2E3622), blurRadius: 8),
        ],
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 28,
            backgroundColor: AppColors.olive100,
            child: Text(
              teacher.name.trim().isEmpty ? 'و' : teacher.name.trim()[0],
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppColors.olive700,
              ),
            ),
          ),
          const SizedBox(width: 13),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  teacher.name,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  teacher.tag,
                  style: const TextStyle(
                    fontSize: 12.5,
                    color: AppColors.olive700,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.number,
    required this.title,
    required this.child,
  });

  final int number;
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.sand200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 28,
                height: 28,
                alignment: Alignment.center,
                decoration: const BoxDecoration(
                  color: AppColors.olive600,
                  shape: BoxShape.circle,
                ),
                child: Text(
                  faNumber(number),
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(width: 9),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}

class _ServiceTile extends StatelessWidget {
  const _ServiceTile({
    required this.service,
    required this.selected,
    required this.onTap,
  });

  final Service service;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 9),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(13),
          decoration: BoxDecoration(
            color: selected ? AppColors.olive50 : AppColors.sand50,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: selected ? AppColors.olive600 : AppColors.sand200,
              width: selected ? 1.6 : 1,
            ),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      service.title,
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '${faNumber(service.duration)} دقیقه',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.ink3,
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                toman(service.price),
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  color: AppColors.olive700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DateTile extends StatelessWidget {
  const _DateTile({
    required this.date,
    required this.count,
    required this.selected,
    required this.onTap,
  });

  final DateTime date;
  final int count;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(15),
      onTap: onTap,
      child: Container(
        width: 92,
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? AppColors.olive600 : AppColors.sand50,
          borderRadius: BorderRadius.circular(15),
          border: Border.all(
            color: selected ? AppColors.olive600 : AppColors.sand200,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              _weekday(date),
              style: TextStyle(
                fontSize: 12,
                color: selected ? Colors.white : AppColors.ink2,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              '${faNumber(date.day)} · ${faNumber(count)} زمان',
              style: TextStyle(
                fontSize: 10.5,
                color: selected ? Colors.white70 : AppColors.ink3,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SlotChip extends StatelessWidget {
  const _SlotChip({
    required this.slot,
    required this.selected,
    required this.onTap,
  });

  final BookingSlot slot;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      selected: selected,
      onSelected: (_) => onTap(),
      label: Text('${slot.startLabel} تا ${slot.endLabel}'),
      selectedColor: AppColors.olive600,
      labelStyle: TextStyle(
        color: selected ? Colors.white : AppColors.ink2,
        fontWeight: FontWeight.w700,
      ),
    );
  }
}

class _BookingSummary extends StatelessWidget {
  const _BookingSummary({
    required this.teacher,
    required this.service,
    required this.slot,
  });

  final Teacher teacher;
  final Service service;
  final BookingSlot slot;

  @override
  Widget build(BuildContext context) {
    final rows = [
      ('استاد', teacher.name),
      ('خدمت', service.title),
      ('تاریخ', '${_weekday(slot.start)} ${faNumber(slot.start.day)}'),
      ('ساعت', '${slot.startLabel} تا ${slot.endLabel}'),
      ('مدت', '${faNumber(service.duration)} دقیقه'),
      ('مبلغ', toman(service.price)),
    ];
    return Column(
      children: [
        ...rows.map(
          (row) => Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  row.$1,
                  style: const TextStyle(color: AppColors.ink3),
                ),
                Flexible(
                  child: Text(
                    row.$2,
                    textAlign: TextAlign.end,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
          ),
        ),
        const Divider(),
        const Text(
          'مبلغ هنگام ثبت رزرو از کیف پول کسر می‌شود. رد درخواست یا لغو مجاز باعث بازگشت وجه خواهد شد.',
          style: TextStyle(
            fontSize: 12,
            color: AppColors.ink3,
            height: 1.8,
          ),
        ),
      ],
    );
  }
}

class _EmptyMessage extends StatelessWidget {
  const _EmptyMessage({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Text(
        text,
        style: const TextStyle(color: AppColors.ink3, height: 1.7),
      ),
    );
  }
}

bool _sameDate(DateTime left, DateTime right) =>
    left.year == right.year &&
    left.month == right.month &&
    left.day == right.day;

String _weekday(DateTime date) {
  const names = [
    'دوشنبه',
    'سه‌شنبه',
    'چهارشنبه',
    'پنج‌شنبه',
    'جمعه',
    'شنبه',
    'یک‌شنبه',
  ];
  return names[date.weekday - 1];
}
