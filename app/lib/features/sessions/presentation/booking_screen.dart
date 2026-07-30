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
  String? _localDate;
  BookingSlot? _slot;
  List<BookingSlot> _availability = const [];
  bool _loadingAvailability = false;
  bool _saving = false;
  String _availabilityError = '';

  List<_DateGroup> get _dateGroups {
    final grouped = <String, List<BookingSlot>>{};
    for (final slot in _availability) {
      grouped.putIfAbsent(slot.localDate, () => <BookingSlot>[]).add(slot);
    }
    return grouped.entries.map((entry) {
      entry.value.sort((left, right) => left.startAt.compareTo(right.startAt));
      return _DateGroup(
        localDate: entry.key,
        weekday: entry.value.first.weekday,
        slots: entry.value,
      );
    }).toList();
  }

  List<BookingSlot> get _selectedDateSlots {
    final key = _localDate;
    if (key == null) return const [];
    for (final group in _dateGroups) {
      if (group.localDate == key) return group.slots;
    }
    return const [];
  }

  Future<void> _chooseService(Service service) async {
    setState(() {
      _service = service;
      _localDate = null;
      _slot = null;
      _availability = const [];
      _availabilityError = '';
      _loadingAvailability = true;
    });

    try {
      final dio = ref.read(dioClientProvider).dio;
      final response = await dio.get(
        '/teachers/${widget.teacherId}/availability',
        queryParameters: {'service_id': service.id, 'days': 14},
      );
      final raw = response.data is Map
          ? (response.data['data'] as List? ?? const [])
          : const [];
      final slots = raw
          .map(
            (item) => BookingSlot.fromJson(
              Map<String, dynamic>.from(item as Map),
            ),
          )
          .toList();
      if (!mounted || _service?.id != service.id) return;
      setState(() => _availability = slots);
    } catch (_) {
      if (!mounted || _service?.id != service.id) return;
      setState(() {
        _availability = const [];
        _availabilityError = 'زمان‌های آزاد استاد دریافت نشد.';
      });
    } finally {
      if (mounted && _service?.id == service.id) {
        setState(() => _loadingAvailability = false);
      }
    }
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
    final groups = _dateGroups;

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
                                  onTap: () => _chooseService(service),
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
                      : _loadingAvailability
                      ? const Center(
                          child: Padding(
                            padding: EdgeInsets.all(20),
                            child: CircularProgressIndicator(
                              color: AppColors.olive600,
                            ),
                          ),
                        )
                      : _availabilityError.isNotEmpty
                      ? Column(
                          children: [
                            _EmptyMessage(text: _availabilityError),
                            TextButton.icon(
                              onPressed: () => _chooseService(_service!),
                              icon: const Icon(Icons.refresh, size: 18),
                              label: const Text('تلاش دوباره'),
                            ),
                          ],
                        )
                      : groups.isEmpty
                      ? const _EmptyMessage(
                          text:
                              'در ۱۴ روز آینده زمان آزاد و قابل رزروی برای این خدمت وجود ندارد.',
                        )
                      : Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            SizedBox(
                              height: 76,
                              child: ListView.separated(
                                scrollDirection: Axis.horizontal,
                                itemCount: groups.length,
                                separatorBuilder: (_, _) =>
                                    const SizedBox(width: 9),
                                itemBuilder: (_, index) {
                                  final group = groups[index];
                                  return _DateTile(
                                    group: group,
                                    selected: _localDate == group.localDate,
                                    onTap: () => setState(() {
                                      _localDate = group.localDate;
                                      _slot = null;
                                    }),
                                  );
                                },
                              ),
                            ),
                            if (_localDate != null) ...[
                              const SizedBox(height: 18),
                              Wrap(
                                spacing: 9,
                                runSpacing: 9,
                                children: _selectedDateSlots
                                    .map(
                                      (slot) => _SlotChip(
                                        slot: slot,
                                        selected:
                                            _slot?.startAt == slot.startAt,
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
          at: slot.startAt,
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

class _DateGroup {
  const _DateGroup({
    required this.localDate,
    required this.weekday,
    required this.slots,
  });

  final String localDate;
  final int weekday;
  final List<BookingSlot> slots;
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
    required this.group,
    required this.selected,
    required this.onTap,
  });

  final _DateGroup group;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final parts = group.localDate.split('-');
    final month = parts.length > 1 ? parts[1] : '';
    final day = parts.length > 2 ? parts[2] : '';
    return InkWell(
      borderRadius: BorderRadius.circular(15),
      onTap: onTap,
      child: Container(
        width: 102,
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
              _weekdayFromVodda(group.weekday),
              style: TextStyle(
                fontSize: 12,
                color: selected ? Colors.white : AppColors.ink2,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              '${faNumber(day)}/${faNumber(month)} · ${faNumber(group.slots.length)} زمان',
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
      label: Text('${slot.localStart} تا ${slot.localEnd}'),
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
    final dateParts = slot.localDate.split('-');
    final localDate = dateParts.length == 3
        ? '${faNumber(dateParts[2])}/${faNumber(dateParts[1])}/${faNumber(dateParts[0])}'
        : slot.localDate;
    final rows = [
      ('استاد', teacher.name),
      ('خدمت', service.title),
      ('تاریخ', '${_weekdayFromVodda(slot.weekday)} $localDate'),
      ('ساعت', '${slot.localStart} تا ${slot.localEnd}'),
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
          'زمان‌ها با timezone رسمی سامانه و تداخل جلسات فعال محاسبه شده‌اند. ممکن است تا لحظهٔ ثبت توسط کاربر دیگری رزرو شوند.',
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

String _weekdayFromVodda(int weekday) {
  const names = [
    'شنبه',
    'یک‌شنبه',
    'دوشنبه',
    'سه‌شنبه',
    'چهارشنبه',
    'پنج‌شنبه',
    'جمعه',
  ];
  return weekday >= 0 && weekday < names.length ? names[weekday] : 'روز';
}
