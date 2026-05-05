import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/utils/formatters.dart';
import '../../auth/auth_provider.dart';
import '../data/vodda_repository.dart';
import '../domain/vodda_models.dart';
import '../vodda_provider.dart';
import 'vodda_shared.dart';

class BookingSelection {
  final Teacher teacher;
  final DateTime selectedDate;
  final String selectedStart;
  final String selectedEnd;
  final String note;

  const BookingSelection({
    required this.teacher,
    required this.selectedDate,
    required this.selectedStart,
    required this.selectedEnd,
    required this.note,
  });
}

class TeacherDetailScreen extends ConsumerWidget {
  final int teacherId;

  const TeacherDetailScreen({
    super.key,
    required this.teacherId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final teacherAsync = ref.watch(teacherDetailProvider(teacherId));

    return teacherAsync.when(
      data: (teacher) => VoddaPageScaffold(
        title: teacher.name,
        body: ListView(
          padding: const EdgeInsets.fromLTRB(18, 10, 18, 24),
          children: [
            VoddaTeacherHeroCard(teacher: teacher, expanded: true),
            const SizedBox(height: 18),
            VoddaSectionCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'درباره استاد',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    teacher.bio.isEmpty ? 'توضیحی برای این استاد ثبت نشده است.' : teacher.bio,
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: const Color(0xFF647087),
                          height: 1.9,
                        ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            VoddaSectionCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'بازه‌های پیشنهادی',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: teacher.availabilitySlots
                        .map(
                          (slot) => Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF6FAF7),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: const Color(0xFFDCEBDF)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  weekdayLabelFromIndex(slot.dayOfWeek),
                                  style: const TextStyle(
                                    color: Color(0xFF11254B),
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '${formatTimeLabel(slot.startTime)} تا ${formatTimeLabel(slot.endTime)}',
                                  style: const TextStyle(
                                    color: Color(0xFF5C6B82),
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        )
                        .toList(),
                  ),
                ],
              ),
            ),
          ],
        ),
        bottomBar: Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () => context.push('/chat/${teacher.id}', extra: teacher),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(56),
                  foregroundColor: const Color(0xFF2C964A),
                  side: const BorderSide(color: Color(0xFF2C964A), width: 1.4),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                ),
                child: const Text('پروفایل و پیام'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: FilledButton(
                onPressed: () => context.push('/teachers/${teacher.id}/schedule'),
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(56),
                  backgroundColor: const Color(0xFF2F9446),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                ),
                child: const Text('انتخاب'),
              ),
            ),
          ],
        ),
      ),
      loading: () => const VoddaLoadingScaffold(title: 'در حال دریافت اطلاعات استاد'),
      error: (error, _) => VoddaErrorScaffold(
        title: 'خطا در دریافت استاد',
        message: describeError(error, 'اطلاعات استاد دریافت نشد.'),
      ),
    );
  }
}

class BookingScheduleScreen extends ConsumerStatefulWidget {
  final int teacherId;

  const BookingScheduleScreen({
    super.key,
    required this.teacherId,
  });

  @override
  ConsumerState<BookingScheduleScreen> createState() => _BookingScheduleScreenState();
}

class _BookingScheduleScreenState extends ConsumerState<BookingScheduleScreen> {
  int _selectedDayOffset = 0;
  String? _selectedStart;
  String? _selectedEnd;
  final TextEditingController _noteController = TextEditingController();

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final teacherAsync = ref.watch(teacherDetailProvider(widget.teacherId));

    return teacherAsync.when(
      data: (teacher) {
        final selectedDate = DateTime.now().add(Duration(days: _selectedDayOffset));
        final timeOptions = buildTimeOptions(teacher, selectedDate);
        final effectiveStart = timeOptions.contains(_selectedStart) ? _selectedStart : null;
        final effectiveEnd = effectiveStart == null ? null : plusThirtyMinutes(effectiveStart);

        return VoddaPageScaffold(
          title: 'ثبت زمان جلسه',
          body: ListView(
            padding: const EdgeInsets.fromLTRB(18, 10, 18, 24),
            children: [
              VoddaCompactTeacherHeader(teacher: teacher),
              const SizedBox(height: 18),
              VoddaSectionCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'تاریخ جلسه',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 98,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: 7,
                        separatorBuilder: (_, __) => const SizedBox(width: 10),
                        itemBuilder: (context, index) {
                          final date = DateTime.now().add(Duration(days: index));
                          final selected = _selectedDayOffset == index;
                          return GestureDetector(
                            onTap: () {
                              setState(() {
                                _selectedDayOffset = index;
                                _selectedStart = null;
                                _selectedEnd = null;
                              });
                            },
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 180),
                              width: 102,
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: selected ? const Color(0xFF2F9446) : Colors.white,
                                borderRadius: BorderRadius.circular(22),
                                border: Border.all(
                                  color: selected ? const Color(0xFF2F9446) : const Color(0xFFE0E7F1),
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    weekdayLabelFromIndex(date.weekday % 7),
                                    style: TextStyle(
                                      color: selected ? Colors.white : const Color(0xFF67748A),
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  const Spacer(),
                                  Text(
                                    formatShortDateLabel(date),
                                    style: TextStyle(
                                      color: selected ? Colors.white : const Color(0xFF10224A),
                                      fontSize: 18,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              VoddaSectionCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'ساعت‌های قابل انتخاب',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                    const SizedBox(height: 12),
                    if (timeOptions.isEmpty)
                      const Text(
                        'برای این روز، بازه ثبت‌شده‌ای وجود ندارد. یک روز دیگر را انتخاب کنید.',
                        style: TextStyle(color: Color(0xFF68758A), height: 1.8),
                      )
                    else
                      Wrap(
                        spacing: 10,
                        runSpacing: 10,
                        children: timeOptions.map((time) {
                          final busy = isPseudoBusy(selectedDate, time);
                          final selected = _selectedStart == time;
                          return GestureDetector(
                            onTap: busy
                                ? null
                                : () {
                                    setState(() {
                                      _selectedStart = time;
                                      _selectedEnd = plusThirtyMinutes(time);
                                    });
                                  },
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 160),
                              width: 98,
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                              decoration: BoxDecoration(
                                color: busy
                                    ? const Color(0xFFFFE8E8)
                                    : selected
                                        ? const Color(0xFF34A853)
                                        : const Color(0xFFF7FAFD),
                                borderRadius: BorderRadius.circular(18),
                                border: Border.all(
                                  color: busy
                                      ? const Color(0xFFFF5B5B)
                                      : selected
                                          ? const Color(0xFF34A853)
                                          : const Color(0xFFE1E8F2),
                                ),
                              ),
                              child: Center(
                                child: Text(
                                  formatTimeLabel(time),
                                  style: TextStyle(
                                    color: busy
                                        ? const Color(0xFFD21F1F)
                                        : selected
                                            ? Colors.white
                                            : const Color(0xFF273247),
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              VoddaSectionCard(
                child: TextField(
                  controller: _noteController,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    labelText: 'توضیحات جلسه',
                    hintText: 'مثلاً هدف جلسه، نوع مراسم یا نکات موردنظر را بنویسید...',
                  ),
                ),
              ),
            ],
          ),
          bottomBar: FilledButton(
            onPressed: effectiveStart == null || effectiveEnd == null
                ? null
                : () {
                    context.push(
                      '/booking/confirm',
                      extra: BookingSelection(
                        teacher: teacher,
                        selectedDate: selectedDate,
                        selectedStart: effectiveStart!,
                        selectedEnd: effectiveEnd!,
                        note: _noteController.text.trim(),
                      ),
                    );
                  },
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(56),
              backgroundColor: const Color(0xFF2F9446),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            ),
            child: const Text('مرحله بعد'),
          ),
        );
      },
      loading: () => const VoddaLoadingScaffold(title: 'در حال آماده‌سازی زمان‌های جلسه'),
      error: (error, _) => VoddaErrorScaffold(
        title: 'زمان‌بندی در دسترس نیست',
        message: describeError(error, 'زمان‌های این استاد دریافت نشد.'),
      ),
    );
  }
}

class BookingConfirmationScreen extends ConsumerStatefulWidget {
  final BookingSelection selection;

  const BookingConfirmationScreen({
    super.key,
    required this.selection,
  });

  @override
  ConsumerState<BookingConfirmationScreen> createState() => _BookingConfirmationScreenState();
}

class _BookingConfirmationScreenState extends ConsumerState<BookingConfirmationScreen> {
  final TextEditingController _couponController = TextEditingController();
  bool _submitting = false;
  String _paymentMethod = 'online';

  @override
  void dispose() {
    _couponController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final wallet = ref.watch(walletSnapshotProvider).asData?.value;
    final teacher = widget.selection.teacher;

    return VoddaPageScaffold(
      title: 'تایید سفارش',
      body: ListView(
        padding: const EdgeInsets.fromLTRB(18, 10, 18, 24),
        children: [
          VoddaCompactTeacherHeader(teacher: teacher),
          const SizedBox(height: 18),
          VoddaSectionCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 148,
                    height: 148,
                    decoration: BoxDecoration(
                      color: const Color(0xFFE5F5EA),
                      borderRadius: BorderRadius.circular(42),
                    ),
                    child: const Icon(
                      Icons.menu_book_rounded,
                      size: 72,
                      color: Color(0xFF2F9446),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  teacher.specialty,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        color: const Color(0xFF11254B),
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: 18),
                Row(
                  children: [
                    Expanded(
                      child: VoddaInfoStatCard(
                        icon: Icons.schedule_rounded,
                        iconColor: const Color(0xFFFF5858),
                        label: 'ساعت',
                        value:
                            '${formatTimeLabel(widget.selection.selectedStart)} تا ${formatTimeLabel(widget.selection.selectedEnd)}',
                        accent: const Color(0xFFF6FBF8),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: VoddaInfoStatCard(
                        icon: Icons.calendar_month_rounded,
                        iconColor: const Color(0xFF2F9446),
                        label: 'تاریخ',
                        value: formatDateLabel(widget.selection.selectedDate),
                        accent: const Color(0xFFF6FBF8),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          VoddaSectionCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  controller: _couponController,
                  decoration: const InputDecoration(
                    labelText: 'کد تخفیف',
                    hintText: 'اگر کد دارید اینجا وارد کنید',
                    prefixIcon: Icon(Icons.workspace_premium_outlined),
                  ),
                ),
                if (widget.selection.note.isNotEmpty) ...[
                  const SizedBox(height: 14),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF7FAFE),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text(
                      widget.selection.note,
                      style: const TextStyle(
                        color: Color(0xFF617084),
                        height: 1.8,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 18),
          VoddaSectionCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'روش پرداخت را انتخاب کنید',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: 12),
                Text(
                  formatCurrency(teacher.pricePer30Min),
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        color: const Color(0xFF2F9446),
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: 14),
                VoddaPaymentMethodTile(
                  title: 'پرداخت آنلاین',
                  subtitle: 'پرداخت با کارت‌های عضو شتاب',
                  icon: Icons.credit_card_rounded,
                  selected: _paymentMethod == 'online',
                  onTap: () => setState(() => _paymentMethod = 'online'),
                ),
                const SizedBox(height: 10),
                VoddaPaymentMethodTile(
                  title: 'پرداخت با کیف پول',
                  subtitle: 'اعتبار شما: ${formatCurrency(wallet?.balance ?? 0)}',
                  icon: Icons.account_balance_wallet_outlined,
                  selected: _paymentMethod == 'wallet',
                  onTap: () => setState(() => _paymentMethod = 'wallet'),
                ),
                const SizedBox(height: 10),
                VoddaPaymentMethodTile(
                  title: 'پرداخت با امتیاز',
                  subtitle: 'فعلاً غیرفعال',
                  icon: Icons.diamond_outlined,
                  enabled: false,
                  selected: _paymentMethod == 'points',
                  onTap: () => setState(() => _paymentMethod = 'points'),
                ),
              ],
            ),
          ),
        ],
      ),
      bottomBar: FilledButton(
        onPressed: _submitting ? null : _submit,
        style: FilledButton.styleFrom(
          minimumSize: const Size.fromHeight(56),
          backgroundColor: const Color(0xFF2F9446),
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        ),
        child: Text(_submitting ? 'در حال ثبت سفارش...' : 'ثبت سفارش'),
      ),
    );
  }

  Future<void> _submit() async {
    setState(() => _submitting = true);
    final repository = ref.read(voddaRepositoryProvider);
    final messenger = ScaffoldMessenger.of(context);

    try {
      final booking = await repository.createBooking(
        BookingDraft(
          teacherProfileId: widget.selection.teacher.id,
          teacherName: widget.selection.teacher.name,
          pricePer30Min: widget.selection.teacher.pricePer30Min,
          slotDate: widget.selection.selectedDate,
          slotStart: widget.selection.selectedStart,
          slotEnd: widget.selection.selectedEnd,
          notes: widget.selection.note,
          paymentMethod: _paymentMethod,
          couponCode: _couponController.text.trim().isEmpty ? null : _couponController.text.trim(),
        ),
      );

      ref.invalidate(myBookingsProvider);
      ref.invalidate(notificationsProvider);
      if (!mounted) {
        return;
      }
      context.go('/booking/success', extra: booking);
    } catch (error) {
      messenger.showSnackBar(
        SnackBar(content: Text(describeError(error, 'ثبت سفارش ناموفق بود.'))),
      );
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }
}

class BookingSuccessScreen extends StatelessWidget {
  final BookingRecord booking;

  const BookingSuccessScreen({
    super.key,
    required this.booking,
  });

  @override
  Widget build(BuildContext context) {
    return VoddaPageScaffold(
      title: 'تکمیل سفارش',
      body: Center(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 10, 24, 24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 210,
                height: 210,
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF4FF),
                  borderRadius: BorderRadius.circular(46),
                ),
                child: const Icon(
                  Icons.inventory_2_outlined,
                  size: 100,
                  color: Color(0xFF2F9446),
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'سفارش شما ثبت شد!',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const SizedBox(height: 12),
              Text(
                'کد پیگیری: ${toPersianDigits(booking.id.toString())}',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      color: const Color(0xFF11254B),
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const SizedBox(height: 18),
              Text(
                'با مراجعه به صفحه سفارش‌ها می‌توانید وضعیت این درخواست را مشاهده کنید.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: const Color(0xFF627085),
                      height: 1.9,
                    ),
              ),
            ],
          ),
        ),
      ),
      bottomBar: FilledButton(
        onPressed: () => context.go('/app?tab=bookings'),
        style: FilledButton.styleFrom(
          minimumSize: const Size.fromHeight(56),
          backgroundColor: const Color(0xFF2F9446),
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        ),
        child: const Text('بازگشت به سفارش‌ها'),
      ),
    );
  }
}

class BookingDetailScreen extends ConsumerStatefulWidget {
  final BookingRecord booking;

  const BookingDetailScreen({
    super.key,
    required this.booking,
  });

  @override
  ConsumerState<BookingDetailScreen> createState() => _BookingDetailScreenState();
}

class _BookingDetailScreenState extends ConsumerState<BookingDetailScreen> {
  bool _processing = false;

  @override
  Widget build(BuildContext context) {
    final isTeacherView = ref.watch(authStateProvider).user?.activeRole == 'teacher';
    final teacherAsync = ref.watch(teacherDetailProvider(widget.booking.teacherProfileId));

    return teacherAsync.when(
      data: (teacher) => VoddaPageScaffold(
        title: 'جزئیات سفارش',
        body: ListView(
          padding: const EdgeInsets.fromLTRB(18, 10, 18, 24),
          children: [
            VoddaStatusBanner(status: widget.booking.status),
            const SizedBox(height: 18),
            VoddaSectionCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    teacher.specialty,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                  ),
                  const SizedBox(height: 10),
                  VoddaMetaRow(icon: Icons.calendar_today_rounded, text: formatDateLabel(widget.booking.slotDate)),
                  VoddaMetaRow(
                    icon: Icons.alarm_rounded,
                    text: '${formatTimeLabel(widget.booking.slotStart)} تا ${formatTimeLabel(widget.booking.slotEnd)}',
                  ),
                  VoddaMetaRow(icon: Icons.location_on_outlined, text: teacherDistrict(teacher.id)),
                  VoddaMetaRow(icon: Icons.payments_outlined, text: formatCurrency(teacher.pricePer30Min)),
                ],
              ),
            ),
            const SizedBox(height: 18),
            VoddaTeacherHeroCard(teacher: teacher),
            const SizedBox(height: 18),
            VoddaSectionCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'توضیحات درخواست',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    widget.booking.notes.isEmpty ? 'توضیحی برای این سفارش ثبت نشده است.' : widget.booking.notes,
                    style: const TextStyle(
                      color: Color(0xFF667388),
                      height: 1.9,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        bottomBar: isTeacherView && widget.booking.status == 'pending'
            ? Row(
                children: [
                  Expanded(
                    child: FilledButton(
                      onPressed: _processing ? null : () => _processBooking(approved: false),
                      style: FilledButton.styleFrom(
                        minimumSize: const Size.fromHeight(56),
                        backgroundColor: const Color(0xFF8F2626),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                      ),
                      child: Text(_processing ? '...' : 'رد درخواست'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      onPressed: _processing ? null : () => _processBooking(approved: true),
                      style: FilledButton.styleFrom(
                        minimumSize: const Size.fromHeight(56),
                        backgroundColor: const Color(0xFF1F7A33),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                      ),
                      child: Text(_processing ? '...' : 'قبول درخواست'),
                    ),
                  ),
                ],
              )
            : widget.booking.status == 'completed'
                ? Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => context.push('/teachers/${teacher.id}'),
                          style: OutlinedButton.styleFrom(
                            minimumSize: const Size.fromHeight(56),
                            foregroundColor: const Color(0xFF2F9446),
                            side: const BorderSide(color: Color(0xFF2F9446), width: 1.4),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                          ),
                          child: const Text('پروفایل استاد'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: FilledButton(
                          onPressed: () => context.push('/bookings/${widget.booking.id}/rate', extra: widget.booking),
                          style: FilledButton.styleFrom(
                            minimumSize: const Size.fromHeight(56),
                            backgroundColor: const Color(0xFF2F9446),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                          ),
                          child: const Text('شرکت در نظرسنجی'),
                        ),
                      ),
                    ],
                  )
                : FilledButton(
                    onPressed: () => context.push('/chat/${teacher.id}', extra: teacher),
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(56),
                      backgroundColor: const Color(0xFF2F9446),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                    ),
                    child: const Text('پیام به استاد'),
                  ),
      ),
      loading: () => const VoddaLoadingScaffold(title: 'در حال دریافت جزئیات سفارش'),
      error: (error, _) => VoddaErrorScaffold(
        title: 'خطا در نمایش سفارش',
        message: describeError(error, 'جزئیات سفارش قابل نمایش نیست.'),
      ),
    );
  }

  Future<void> _processBooking({required bool approved}) async {
    setState(() => _processing = true);
    final repository = ref.read(voddaRepositoryProvider);
    final messenger = ScaffoldMessenger.of(context);

    try {
      if (approved) {
        await repository.acceptBooking(widget.booking.id);
      } else {
        await repository.rejectBooking(widget.booking.id, reason: 'به دلیل تداخل زمانی');
      }
      ref.invalidate(teacherBookingsProvider);
      ref.invalidate(myBookingsProvider);
      ref.invalidate(notificationsProvider);
      if (!mounted) {
        return;
      }
      context.go('/app?tab=bookings');
    } catch (error) {
      messenger.showSnackBar(
        SnackBar(content: Text(describeError(error, 'عملیات سفارش انجام نشد.'))),
      );
    } finally {
      if (mounted) {
        setState(() => _processing = false);
      }
    }
  }
}

class BookingRatingScreen extends ConsumerStatefulWidget {
  final BookingRecord booking;

  const BookingRatingScreen({
    super.key,
    required this.booking,
  });

  @override
  ConsumerState<BookingRatingScreen> createState() => _BookingRatingScreenState();
}

class _BookingRatingScreenState extends ConsumerState<BookingRatingScreen> {
  int _selectedScore = 4;
  bool _submitting = false;

  static const _ratingLabels = {
    1: 'بد بود',
    2: 'بد نبود',
    3: 'خوب',
    4: 'عالی',
    5: 'بسیار عالی',
  };

  static const _ratingEmojis = {
    1: '🙁',
    2: '🙂',
    3: '😊',
    4: '😍',
    5: '🤗',
  };

  @override
  Widget build(BuildContext context) {
    return VoddaPageScaffold(
      title: 'نظرسنجی سفارش',
      body: ListView(
        padding: const EdgeInsets.fromLTRB(18, 24, 18, 24),
        children: [
          Center(
            child: CircleAvatar(
              radius: 52,
              backgroundColor: const Color(0xFFD7ECD8),
              child: Text(
                initials(widget.booking.teacherName),
                style: const TextStyle(
                  color: Color(0xFF1A7838),
                  fontSize: 28,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            widget.booking.teacherName,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: 6),
          const Text(
            'قاری قرآن',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Color(0xFF7C879B),
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 26),
          VoddaSectionCard(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: List.generate(5, (index) {
                final score = index + 1;
                final selected = _selectedScore == score;
                return GestureDetector(
                  onTap: () => setState(() => _selectedScore = score),
                  child: SizedBox(
                    width: 62,
                    child: Column(
                      children: [
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 150),
                          width: 62,
                          height: 62,
                          decoration: BoxDecoration(
                            color: selected ? const Color(0xFFFFF4CC) : const Color(0xFFFFF9E7),
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: selected ? const Color(0xFFE9B400) : const Color(0xFFF1E6B8),
                              width: selected ? 2.2 : 1.1,
                            ),
                          ),
                          child: Center(
                            child: Text(
                              _ratingEmojis[score]!,
                              style: const TextStyle(fontSize: 28),
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _ratingLabels[score]!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: Color(0xFF57657C),
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),
            ),
          ),
        ],
      ),
      bottomBar: Row(
        children: [
          Expanded(
            child: OutlinedButton(
              onPressed: _submitting ? null : () => context.pop(),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(56),
                foregroundColor: const Color(0xFF2F9446),
                side: const BorderSide(color: Color(0xFF2F9446), width: 1.3),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              ),
              child: const Text('فعلاً نه'),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: FilledButton(
              onPressed: _submitting ? null : _submit,
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(56),
                backgroundColor: const Color(0xFF2F9446),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              ),
              child: Text(_submitting ? 'در حال ثبت...' : 'ثبت نظر'),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _submit() async {
    setState(() => _submitting = true);
    final messenger = ScaffoldMessenger.of(context);

    try {
      await ref.read(voddaRepositoryProvider).submitRating(
            bookingId: widget.booking.id,
            score: _selectedScore,
            comment: _ratingLabels[_selectedScore]!,
          );
      ref.invalidate(teachersProvider);
      ref.invalidate(myBookingsProvider);
      if (!mounted) {
        return;
      }
      context.go('/app?tab=bookings');
    } catch (error) {
      messenger.showSnackBar(
        SnackBar(content: Text(describeError(error, 'ثبت نظر انجام نشد.'))),
      );
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }
}

class TeacherChatScreen extends ConsumerStatefulWidget {
  final int teacherId;
  final Teacher? teacher;

  const TeacherChatScreen({
    super.key,
    required this.teacherId,
    this.teacher,
  });

  @override
  ConsumerState<TeacherChatScreen> createState() => _TeacherChatScreenState();
}

class _TeacherChatScreenState extends ConsumerState<TeacherChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final List<_ChatMessage> _localMessages = [
    const _ChatMessage(text: 'سلام، امکانش هست مبلغ رو بگم به ما تخفیف بدید؟', isMine: false, time: '12:00'),
    const _ChatMessage(text: 'سلام مشکلی نیست، چقدر باشه؟', isMine: true, time: '12:32'),
    const _ChatMessage(text: '۳۰۰۰۰۰ تومان باشه خوبه', isMine: false, time: '13:18'),
    const _ChatMessage(text: 'بسیار خوب، قبول شد.', isMine: true, time: '13:21'),
  ];

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final teacherAsync = widget.teacher != null
        ? AsyncValue<Teacher>.data(widget.teacher!)
        : ref.watch(teacherDetailProvider(widget.teacherId));

    return teacherAsync.when(
      data: (teacher) => Scaffold(
        backgroundColor: const Color(0xFF6E8E5E),
        body: Stack(
          children: [
            Positioned.fill(
              child: Opacity(
                opacity: 0.16,
                child: GridPaper(
                  color: const Color(0xFF2B5535),
                  interval: 42,
                  subdivisions: 1,
                ),
              ),
            ),
            SafeArea(
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
                    child: Row(
                      children: [
                        IconButton(
                          onPressed: () => context.pop(),
                          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white),
                        ),
                        const Spacer(),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              teacher.name,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 26,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            Text(
                              teacher.specialty,
                              style: const TextStyle(
                                color: Color(0xFFDDE7D9),
                                fontSize: 18,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(width: 12),
                        VoddaAvatarBubble(name: teacher.name, size: 66),
                      ],
                    ),
                  ),
                  Expanded(
                    child: ListView.separated(
                      padding: const EdgeInsets.fromLTRB(18, 24, 18, 18),
                      itemCount: _localMessages.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 22),
                      itemBuilder: (context, index) {
                        final message = _localMessages[index];
                        return Align(
                          alignment: message.isMine ? Alignment.centerRight : Alignment.centerLeft,
                          child: ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 310),
                            child: Column(
                              crossAxisAlignment: message.isMine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
                                  decoration: BoxDecoration(
                                    color: message.isMine ? const Color(0xFF48C869) : const Color(0xFF2E8A45),
                                    borderRadius: BorderRadius.circular(24),
                                  ),
                                  child: Text(
                                    message.text,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 18,
                                      height: 1.8,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  formatTimeLabel(message.time),
                                  style: const TextStyle(color: Colors.white70, fontSize: 16),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  SafeArea(
                    top: false,
                    minimum: const EdgeInsets.fromLTRB(18, 0, 18, 18),
                    child: Row(
                      children: [
                        Expanded(
                          child: Container(
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(26),
                            ),
                            child: TextField(
                              controller: _messageController,
                              decoration: const InputDecoration(
                                hintText: 'پیام خود را بنویسید',
                                border: InputBorder.none,
                                contentPadding: EdgeInsets.symmetric(horizontal: 20, vertical: 18),
                              ),
                              onSubmitted: (_) => _sendLocalMessage(),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        CircleAvatar(
                          radius: 30,
                          backgroundColor: Colors.white,
                          child: IconButton(
                            onPressed: _sendLocalMessage,
                            icon: const Icon(Icons.mic_none_rounded, color: Color(0xFF5E677A)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      loading: () => const VoddaLoadingScaffold(title: 'در حال باز کردن گفتگو'),
      error: (error, _) => VoddaErrorScaffold(
        title: 'گفتگو آماده نیست',
        message: describeError(error, 'اطلاعات استاد برای گفتگو پیدا نشد.'),
      ),
    );
  }

  void _sendLocalMessage() {
    final text = _messageController.text.trim();
    if (text.isEmpty) {
      return;
    }
    setState(() {
      final now = DateTime.now();
      _localMessages.add(
        _ChatMessage(
          text: text,
          isMine: false,
          time: '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}',
        ),
      );
    });
    _messageController.clear();
  }
}

class _ChatMessage {
  final String text;
  final bool isMine;
  final String time;

  const _ChatMessage({
    required this.text,
    required this.isMine,
    required this.time,
  });
}
