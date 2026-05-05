import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/utils/formatters.dart';
import '../../auth/auth_provider.dart';
import '../domain/vodda_models.dart';
import '../vodda_provider.dart';
import 'vodda_shared.dart';

enum VoddaTab {
  home,
  search,
  bookings,
  messages,
  profile,
}

class VoddaAppShell extends ConsumerStatefulWidget {
  final VoddaTab initialTab;

  const VoddaAppShell({
    super.key,
    this.initialTab = VoddaTab.home,
  });

  @override
  ConsumerState<VoddaAppShell> createState() => _VoddaAppShellState();
}

class _VoddaAppShellState extends ConsumerState<VoddaAppShell> {
  late VoddaTab _currentTab;

  @override
  void initState() {
    super.initState();
    _currentTab = widget.initialTab;
  }

  @override
  void didUpdateWidget(covariant VoddaAppShell oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialTab != widget.initialTab) {
      _currentTab = widget.initialTab;
    }
  }

  @override
  Widget build(BuildContext context) {
    final tabs = [
      _HomeTab(onOpenTeacher: _openTeacher, onJumpToTab: _setTab),
      _SearchTab(onOpenTeacher: _openTeacher),
      _BookingsTab(onOpenBooking: _openBooking, onOpenTeacher: _openTeacher),
      _MessagesTab(onOpenTeacherChat: _openChat),
      _ProfileTab(onJumpToTab: _setTab),
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF3F6FB),
      extendBody: true,
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFFF5F7FB), Color(0xFFEFF3F8)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: SafeArea(
          child: IndexedStack(
            index: _currentTab.index,
            children: tabs,
          ),
        ),
      ),
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.fromLTRB(18, 0, 18, 18),
        child: _BottomNav(
          currentTab: _currentTab,
          onChanged: _setTab,
        ),
      ),
    );
  }

  void _setTab(VoddaTab tab) {
    setState(() => _currentTab = tab);
  }

  void _openTeacher(Teacher teacher) {
    context.push('/teachers/${teacher.id}');
  }

  void _openBooking(BookingRecord booking) {
    context.push('/bookings/${booking.id}', extra: booking);
  }

  void _openChat(Teacher teacher) {
    context.push('/chat/${teacher.id}', extra: teacher);
  }
}

class _HomeTab extends ConsumerWidget {
  final ValueChanged<Teacher> onOpenTeacher;
  final ValueChanged<VoddaTab> onJumpToTab;

  const _HomeTab({
    required this.onOpenTeacher,
    required this.onJumpToTab,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);
    final teachersAsync = ref.watch(teachersProvider);
    final teachers = teachersAsync.asData?.value ?? const <Teacher>[];
    final bookings = ref.watch(myBookingsProvider).asData?.value ?? const <BookingRecord>[];
    final notifications = ref.watch(notificationsProvider).asData?.value ?? const <VoddaNotification>[];
    final wallet = ref.watch(walletSnapshotProvider).asData?.value;
    final unreadCount = notifications.where((item) => !item.isRead).length;

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(teachersProvider);
        ref.invalidate(myBookingsProvider);
        ref.invalidate(walletSnapshotProvider);
        ref.invalidate(notificationsProvider);
      },
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(18, 16, 18, 110),
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      'سلام، ${auth.user?.name.isNotEmpty == true ? auth.user!.name : 'دوست عزیز'}',
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                            color: const Color(0xFF6A768B),
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'به وُدّا خوش آمدید',
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            color: const Color(0xFF11254B),
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Container(
                width: 54,
                height: 54,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x12081E32),
                      blurRadius: 24,
                      offset: Offset(0, 12),
                    ),
                  ],
                ),
                padding: const EdgeInsets.all(10),
                child: Image.asset('assets/images/logo.png'),
              ),
            ],
          ),
          const SizedBox(height: 18),
          _HomeHeroBanner(
            roleLabelText: roleLabel(auth.user?.activeRole ?? 'learner'),
            unreadCount: unreadCount,
            onPrimaryTap: () => onJumpToTab(VoddaTab.search),
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: VoddaInfoStatCard(
                  icon: Icons.account_balance_wallet_outlined,
                  iconColor: const Color(0xFF2F9446),
                  label: 'کیف پول',
                  value: formatCurrency(wallet?.balance ?? 0),
                  accent: const Color(0xFFEAF9EF),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: VoddaInfoStatCard(
                  icon: Icons.inventory_2_outlined,
                  iconColor: const Color(0xFF5E89FF),
                  label: 'سفارش‌ها',
                  value: toPersianDigits(bookings.length.toString()),
                  accent: const Color(0xFFEFF4FF),
                ),
              ),
            ],
          ),
          const SizedBox(height: 22),
          VoddaSectionTitle(
            title: 'خدمات سریع',
            actionLabel: 'جستجو',
            onTap: () => onJumpToTab(VoddaTab.search),
          ),
          const SizedBox(height: 12),
          Row(
            children: const [
              Expanded(
                child: VoddaServiceTile(
                  title: 'مشاوره تلفنی',
                  icon: Icons.support_agent_rounded,
                  color: Color(0xFF68C47D),
                ),
              ),
              SizedBox(width: 12),
              Expanded(
                child: VoddaServiceTile(
                  title: 'مشاوره آنلاین',
                  icon: Icons.video_camera_front_outlined,
                  color: Color(0xFFEEF2FF),
                  iconColor: Color(0xFF2F9446),
                  textColor: Color(0xFF11254B),
                ),
              ),
              SizedBox(width: 12),
              Expanded(
                child: VoddaServiceTile(
                  title: 'آموزش آنلاین',
                  icon: Icons.play_circle_outline_rounded,
                  color: Color(0xFFEEF2FF),
                  iconColor: Color(0xFF5E89FF),
                  textColor: Color(0xFF11254B),
                ),
              ),
            ],
          ),
          const SizedBox(height: 22),
          const VoddaPromoBanner(
            title: 'صفحه قرآن',
            subtitle: 'ویژه قرائت قرآن کریم',
            background: Color(0xFF0F8E8B),
          ),
          const SizedBox(height: 22),
          VoddaSectionTitle(
            title: 'اساتید پیشنهادی',
            actionLabel: 'مشاهده همه',
            onTap: () => onJumpToTab(VoddaTab.search),
          ),
          const SizedBox(height: 12),
          if (teachersAsync.isLoading && teachers.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 32),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (teachers.isEmpty)
            const VoddaEmptyStateCard(
              title: 'استادی پیدا نشد',
              subtitle: 'بعد از اجرای بک‌اند و سید، این بخش با داده واقعی پر می‌شود.',
            )
          else
            SizedBox(
              height: 262,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: math.min(teachers.length, 6),
                separatorBuilder: (_, __) => const SizedBox(width: 14),
                itemBuilder: (context, index) {
                  final teacher = teachers[index];
                  return SizedBox(
                    width: 218,
                    child: VoddaTeacherCard(
                      teacher: teacher,
                      onTap: () => onOpenTeacher(teacher),
                    ),
                  );
                },
              ),
            ),
          const SizedBox(height: 22),
          const VoddaPromoBanner(
            title: 'معرفی اساتید',
            subtitle: 'ویدیو و رزومه مدرسان و اساتید',
            background: Color(0xFF3A4E6C),
          ),
        ],
      ),
    );
  }
}

class _SearchTab extends ConsumerStatefulWidget {
  final ValueChanged<Teacher> onOpenTeacher;

  const _SearchTab({
    required this.onOpenTeacher,
  });

  @override
  ConsumerState<_SearchTab> createState() => _SearchTabState();
}

class _SearchTabState extends ConsumerState<_SearchTab> {
  final TextEditingController _searchController = TextEditingController();
  bool _mapMode = false;
  int _selectedCategory = 0;

  static const _categories = [
    'مشاوره تلفنی',
    'مشاوره آنلاین',
    'آموزش آنلاین',
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final teachersAsync = ref.watch(teachersProvider);
    final teachers = teachersAsync.asData?.value ?? const <Teacher>[];
    final query = _searchController.text.trim();
    final filtered = teachers.where((teacher) {
      if (query.isEmpty) {
        return true;
      }
      return teacher.name.contains(query) || teacher.specialty.contains(query);
    }).toList();

    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 110),
      children: [
        Text(
          'جستجو',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                color: const Color(0xFF11254B),
                fontWeight: FontWeight.w900,
              ),
        ),
        const SizedBox(height: 18),
        Row(
          children: List.generate(_categories.length, (index) {
            final selected = _selectedCategory == index;
            final icon = switch (index) {
              0 => Icons.call_outlined,
              1 => Icons.video_call_outlined,
              _ => Icons.ondemand_video_outlined,
            };
            return Expanded(
              child: Padding(
                padding: EdgeInsets.only(left: index == _categories.length - 1 ? 0 : 10),
                child: GestureDetector(
                  onTap: () => setState(() => _selectedCategory = index),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 160),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    decoration: BoxDecoration(
                      color: selected ? const Color(0xFF68C47D) : Colors.white,
                      borderRadius: BorderRadius.circular(26),
                    ),
                    child: Column(
                      children: [
                        Icon(icon, color: selected ? Colors.white : const Color(0xFF2F9446), size: 34),
                        const SizedBox(height: 10),
                        Text(
                          _categories[index],
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: selected ? Colors.white : const Color(0xFF11254B),
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          }),
        ),
        const SizedBox(height: 18),
        VoddaSectionCard(
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _searchController,
                  decoration: const InputDecoration(
                    hintText: 'جستجو در متخصص‌ها ...',
                    border: InputBorder.none,
                    filled: false,
                  ),
                  onChanged: (_) => setState(() {}),
                ),
              ),
              Container(
                width: 54,
                height: 54,
                decoration: BoxDecoration(
                  color: const Color(0xFF2F9446),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: const Icon(Icons.search_rounded, color: Colors.white),
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),
        VoddaSectionCard(
          padding: const EdgeInsets.all(8),
          child: Row(
            children: [
              Expanded(
                child: VoddaToggleTile(
                  label: 'لیست متخصص‌ها',
                  icon: Icons.group_add_outlined,
                  active: !_mapMode,
                  onTap: () => setState(() => _mapMode = false),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: VoddaToggleTile(
                  label: 'نمایش در نقشه',
                  icon: Icons.map_outlined,
                  active: _mapMode,
                  onTap: () => setState(() => _mapMode = true),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),
        if (teachersAsync.isLoading && teachers.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 48),
            child: Center(child: CircularProgressIndicator()),
          )
        else if (filtered.isEmpty)
          const VoddaEmptyStateCard(
            title: 'نتیجه‌ای پیدا نشد',
            subtitle: 'عبارت جستجو را تغییر بدهید یا فهرست استادها را دوباره بررسی کنید.',
          )
        else if (_mapMode)
          VoddaTeachersMapCard(
            teachers: filtered,
            onOpenTeacher: widget.onOpenTeacher,
          )
        else
          Column(
            children: filtered
                .map(
                  (teacher) => Padding(
                    padding: const EdgeInsets.only(bottom: 14),
                    child: VoddaTeacherListCard(
                      teacher: teacher,
                      onTap: () => widget.onOpenTeacher(teacher),
                    ),
                  ),
                )
                .toList(),
          ),
      ],
    );
  }
}

class _BookingsTab extends ConsumerWidget {
  final ValueChanged<BookingRecord> onOpenBooking;
  final ValueChanged<Teacher> onOpenTeacher;

  const _BookingsTab({
    required this.onOpenBooking,
    required this.onOpenTeacher,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);
    final isTeacher = auth.user?.activeRole == 'teacher';
    final bookingsAsync = isTeacher ? ref.watch(teacherBookingsProvider) : ref.watch(myBookingsProvider);
    final bookings = bookingsAsync.asData?.value ?? const <BookingRecord>[];
    final teachers = ref.watch(teachersProvider).asData?.value ?? const <Teacher>[];
    final notifications = ref.watch(notificationsProvider).asData?.value ?? const <VoddaNotification>[];
    final grouped = <String, List<BookingRecord>>{
      'pending': [],
      'accepted': [],
      'completed': [],
      'rejected': [],
    };

    for (final booking in bookings) {
      grouped.putIfAbsent(booking.status, () => []).add(booking);
    }

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(myBookingsProvider);
        ref.invalidate(teacherBookingsProvider);
        ref.invalidate(notificationsProvider);
      },
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(18, 16, 18, 110),
        children: [
          Text(
            isTeacher ? 'درخواست‌ها' : 'سفارش‌های من',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  color: const Color(0xFF11254B),
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: 18),
          VoddaSectionCard(
            child: Row(
              children: [
                Expanded(
                  child: VoddaMiniCounter(
                    label: 'در انتظار',
                    value: grouped['pending']!.length,
                    color: const Color(0xFF2F9446),
                  ),
                ),
                Expanded(
                  child: VoddaMiniCounter(
                    label: 'در حال انجام',
                    value: grouped['accepted']!.length,
                    color: const Color(0xFF4B82F1),
                  ),
                ),
                Expanded(
                  child: VoddaMiniCounter(
                    label: 'انجام شده',
                    value: grouped['completed']!.length,
                    color: const Color(0xFFBE9440),
                  ),
                ),
                Expanded(
                  child: VoddaMiniCounter(
                    label: 'لغوشده',
                    value: grouped['rejected']!.length,
                    color: const Color(0xFFAF5478),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          if (notifications.isNotEmpty)
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: const Color(0xFFE7F7E6),
                borderRadius: BorderRadius.circular(24),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 24,
                    backgroundColor: const Color(0xFF42B79A),
                    child: Text(
                      toPersianDigits(notifications.length.toString()),
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900),
                    ),
                  ),
                  const SizedBox(width: 14),
                  const Expanded(
                    child: Text(
                      'پیام‌ها و اعلان‌های دریافت‌شده',
                      style: TextStyle(
                        color: Color(0xFF11254B),
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  const Icon(Icons.chat_bubble_outline_rounded, color: Color(0xFF42B79A)),
                ],
              ),
            ),
          const SizedBox(height: 18),
          if (bookingsAsync.isLoading && bookings.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 48),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (bookings.isEmpty)
            const VoddaEmptyStateCard(
              title: 'سفارشی ثبت نشده',
              subtitle: 'بعد از انتخاب استاد و زمان جلسه، سفارش‌هایتان اینجا نمایش داده می‌شود.',
            )
          else
            ...['pending', 'accepted', 'completed', 'rejected'].map((status) {
              final items = grouped[status]!;
              return Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: VoddaBookingAccordion(
                  title: bookingStatusLabel(status),
                  initiallyExpanded: status == 'pending',
                  child: items.isEmpty
                      ? const Padding(
                          padding: EdgeInsets.all(18),
                          child: Text(
                            'آیتمی در این بخش نیست.',
                            style: TextStyle(color: Color(0xFF718096)),
                          ),
                        )
                      : Column(
                          children: items.map((booking) {
                            Teacher? teacher;
                            for (final item in teachers) {
                              if (item.id == booking.teacherProfileId) {
                                teacher = item;
                                break;
                              }
                            }
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 14),
                              child: VoddaBookingCard(
                                booking: booking,
                                teacher: teacher,
                                onOpen: () => onOpenBooking(booking),
                                onOpenTeacher: teacher == null ? null : () => onOpenTeacher(teacher),
                              ),
                            );
                          }).toList(),
                        ),
                ),
              );
            }),
        ],
      ),
    );
  }
}

class _MessagesTab extends ConsumerWidget {
  final ValueChanged<Teacher> onOpenTeacherChat;

  const _MessagesTab({
    required this.onOpenTeacherChat,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notificationsAsync = ref.watch(notificationsProvider);
    final notifications = notificationsAsync.asData?.value ?? const <VoddaNotification>[];
    final teachers = ref.watch(teachersProvider).asData?.value ?? const <Teacher>[];
    final conversationTeacher = teachers.isNotEmpty ? teachers.first : null;

    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 110),
      children: [
        Text(
          'پیام‌ها',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                color: const Color(0xFF11254B),
                fontWeight: FontWeight.w900,
              ),
        ),
        const SizedBox(height: 18),
        if (conversationTeacher != null)
          GestureDetector(
            onTap: () => onOpenTeacherChat(conversationTeacher),
            child: Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: const Color(0xFF5B8750),
                borderRadius: BorderRadius.circular(34),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Row(
                    children: [
                      VoddaAvatarBubble(name: conversationTeacher.name, size: 68),
                      const Spacer(),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            conversationTeacher.name,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 24,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          Text(
                            conversationTeacher.specialty,
                            style: const TextStyle(
                              color: Color(0xFFD2E4CF),
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                      decoration: BoxDecoration(
                        color: const Color(0xFF48C869),
                        borderRadius: BorderRadius.circular(24),
                      ),
                      child: const Text(
                        'سلام، مشکلی نیست، چقدر باشه؟',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        const SizedBox(height: 18),
        VoddaSectionTitle(
          title: 'اعلان‌های سیستم',
          actionLabel: 'به‌روزرسانی',
          onTap: () => ref.invalidate(notificationsProvider),
        ),
        const SizedBox(height: 12),
        if (notificationsAsync.isLoading && notifications.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 48),
            child: Center(child: CircularProgressIndicator()),
          )
        else if (notifications.isEmpty)
          const VoddaEmptyStateCard(
            title: 'اعلانی دریافت نشده',
            subtitle: 'اعلان‌های مربوط به سفارش، کیف پول و وضعیت استادها اینجا می‌آیند.',
          )
        else
          Column(
            children: notifications
                .map(
                  (notification) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: VoddaNotificationTile(notification: notification),
                  ),
                )
                .toList(),
          ),
      ],
    );
  }
}

class _ProfileTab extends ConsumerWidget {
  final ValueChanged<VoddaTab> onJumpToTab;

  const _ProfileTab({
    required this.onJumpToTab,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);
    final user = auth.user;
    final wallet = ref.watch(walletSnapshotProvider).asData?.value;
    final bookings = ref.watch(myBookingsProvider).asData?.value ?? const <BookingRecord>[];
    final notifications = ref.watch(notificationsProvider).asData?.value ?? const <VoddaNotification>[];
    final activeRole = user?.activeRole ?? 'learner';

    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 12, 18, 110),
      children: [
        Text(
          'پروفایل',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                color: const Color(0xFF11254B),
                fontWeight: FontWeight.w900,
              ),
        ),
        const SizedBox(height: 18),
        Container(
          padding: const EdgeInsets.fromLTRB(18, 26, 18, 24),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFFEFF5F4), Color(0xFFF8FBFF)],
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
            ),
            borderRadius: BorderRadius.circular(32),
          ),
          child: Column(
            children: [
              Stack(
                children: [
                  CircleAvatar(
                    radius: 48,
                    backgroundColor: Colors.white,
                    child: Text(
                      initials(user?.name ?? ''),
                      style: const TextStyle(
                        color: Color(0xFF2F9446),
                        fontSize: 30,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  Positioned(
                    bottom: 0,
                    left: 0,
                    child: CircleAvatar(
                      radius: 15,
                      backgroundColor: const Color(0xFF2BB06A),
                      child: const Icon(Icons.edit_rounded, color: Colors.white, size: 16),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Text(
                user?.name.isNotEmpty == true ? user!.name : user?.mobile ?? '-',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      color: const Color(0xFF11254B),
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const SizedBox(height: 4),
              Text(
                user?.mobile ?? '',
                style: const TextStyle(
                  color: Color(0xFF7F8898),
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                alignment: WrapAlignment.center,
                children: (user?.roles ?? const <String>[]).map((role) {
                  final selected = role == activeRole;
                  return ChoiceChip(
                    label: Text(roleLabel(role)),
                    selected: selected,
                    onSelected: selected
                        ? null
                        : (_) async {
                            final ok = await ref.read(authStateProvider.notifier).switchRole(role);
                            if (ok) {
                              ref.invalidate(myBookingsProvider);
                              ref.invalidate(teacherBookingsProvider);
                            }
                          },
                    labelStyle: TextStyle(
                      color: selected ? Colors.white : const Color(0xFF355A4C),
                      fontWeight: FontWeight.w700,
                    ),
                    selectedColor: const Color(0xFF2F9446),
                    backgroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                  );
                }).toList(),
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.3,
          children: [
            VoddaProfileMetricCard(
              title: 'تعداد سفارشات',
              value: toPersianDigits(bookings.length.toString()),
              icon: Icons.shopping_bag_outlined,
              tint: const Color(0xFFEFF4FF),
              iconColor: const Color(0xFF5D89FA),
            ),
            VoddaProfileMetricCard(
              title: 'در حال انجام',
              value: toPersianDigits(bookings.where((item) => item.status == 'accepted').length.toString()),
              icon: Icons.hourglass_top_rounded,
              tint: const Color(0xFFF0FBFF),
              iconColor: const Color(0xFF5BB4F2),
            ),
            VoddaProfileMetricCard(
              title: 'انجام شده',
              value: toPersianDigits(bookings.where((item) => item.status == 'completed').length.toString()),
              icon: Icons.verified_outlined,
              tint: const Color(0xFFFDF7EC),
              iconColor: const Color(0xFFB99445),
            ),
            VoddaProfileMetricCard(
              title: 'پیام‌های دریافتی',
              value: toPersianDigits(notifications.length.toString()),
              icon: Icons.chat_bubble_outline_rounded,
              tint: const Color(0xFFE7F9F5),
              iconColor: const Color(0xFF43B79A),
            ),
          ],
        ),
        const SizedBox(height: 18),
        VoddaSectionCard(
          child: Column(
            children: [
              VoddaProfileMenuTile(icon: Icons.person_outline_rounded, title: 'ویرایش مشخصات حساب کاربری', onTap: () {}),
              VoddaProfileMenuTile(
                icon: Icons.bookmark_border_rounded,
                title: 'لیست علاقه‌مندی‌ها',
                onTap: () => onJumpToTab(VoddaTab.search),
              ),
              VoddaProfileMenuTile(
                icon: Icons.account_balance_wallet_outlined,
                title: 'کیف پول و تراکنش‌ها',
                subtitle: wallet == null ? null : formatCurrency(wallet.balance),
                onTap: () => showWalletActions(context, ref, wallet?.balance ?? 0),
              ),
              VoddaProfileMenuTile(
                icon: Icons.support_agent_outlined,
                title: 'ارتباط با پشتیبانی',
                onTap: () => onJumpToTab(VoddaTab.messages),
              ),
              VoddaProfileMenuTile(icon: Icons.info_outline_rounded, title: 'درباره ما', onTap: () {}),
              VoddaProfileMenuTile(icon: Icons.rule_folder_outlined, title: 'قوانین و مقررات', onTap: () {}),
              VoddaProfileMenuTile(
                icon: Icons.logout_rounded,
                title: 'خروج حساب کاربری',
                onTap: () async {
                  await ref.read(authStateProvider.notifier).logout();
                  if (context.mounted) {
                    context.go('/login');
                  }
                },
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _BottomNav extends ConsumerWidget {
  final VoddaTab currentTab;
  final ValueChanged<VoddaTab> onChanged;

  const _BottomNav({
    required this.currentTab,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifications = ref.watch(notificationsProvider).asData?.value ?? const <VoddaNotification>[];
    final unread = notifications.where((item) => !item.isRead).length;
    final items = [
      (VoddaTab.home, Icons.home_outlined, Icons.home_rounded),
      (VoddaTab.search, Icons.search_rounded, Icons.search_rounded),
      (VoddaTab.bookings, Icons.menu_rounded, Icons.menu_rounded),
      (VoddaTab.messages, Icons.chat_bubble_outline_rounded, Icons.chat_bubble_rounded),
      (VoddaTab.profile, Icons.person_outline_rounded, Icons.person_rounded),
    ];

    return Container(
      height: 78,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(30),
        boxShadow: const [
          BoxShadow(
            color: Color(0x23081C30),
            blurRadius: 28,
            offset: Offset(0, 14),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: items.map((item) {
          final tab = item.$1;
          final selected = currentTab == tab;
          final icon = selected ? item.$3 : item.$2;
          final showBadge = tab == VoddaTab.messages && unread > 0;
          return GestureDetector(
            onTap: () => onChanged(tab),
            child: SizedBox(
              width: 56,
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 160),
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: selected ? const Color(0xFF2F9446) : Colors.transparent,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      icon,
                      color: selected ? Colors.white : const Color(0xFF141D25),
                      size: 28,
                    ),
                  ),
                  if (showBadge)
                    Positioned(
                      top: -2,
                      left: -2,
                      child: Container(
                        minWidth: 24,
                        height: 24,
                        padding: const EdgeInsets.symmetric(horizontal: 6),
                        decoration: const BoxDecoration(
                          color: Color(0xFF42B79A),
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: Text(
                            toPersianDigits(unread.toString()),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _HomeHeroBanner extends StatelessWidget {
  final String roleLabelText;
  final int unreadCount;
  final VoidCallback onPrimaryTap;

  const _HomeHeroBanner({
    required this.roleLabelText,
    required this.unreadCount,
    required this.onPrimaryTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(30),
        boxShadow: const [
          BoxShadow(
            color: Color(0x15081E32),
            blurRadius: 30,
            offset: Offset(0, 14),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  roleLabelText,
                  style: const TextStyle(
                    color: Color(0xFF2F9446),
                    fontSize: 28,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const Text(
                  'وُدّا',
                  style: TextStyle(
                    color: Color(0xFF2F9446),
                    fontSize: 28,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'پلتفرم تمیز و سریع برای رزرو استاد، مدیریت سفارش و پیگیری جلسات.',
                  textAlign: TextAlign.right,
                  style: TextStyle(
                    color: Color(0xFF617084),
                    height: 1.8,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 18),
                Row(
                  children: [
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: onPrimaryTap,
                        style: FilledButton.styleFrom(
                          backgroundColor: const Color(0xFF2F9446),
                          foregroundColor: Colors.white,
                          minimumSize: const Size.fromHeight(50),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                        ),
                        icon: const Icon(Icons.add_rounded),
                        label: const Text('درخواست وُدّا'),
                      ),
                    ),
                    if (unreadCount > 0) ...[
                      const SizedBox(width: 12),
                      CircleAvatar(
                        radius: 24,
                        backgroundColor: const Color(0xFF42B79A),
                        child: Text(
                          toPersianDigits(unreadCount.toString()),
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 14),
          Container(
            width: 114,
            height: 114,
            decoration: BoxDecoration(
              color: const Color(0xFFF1F6F3),
              borderRadius: BorderRadius.circular(26),
            ),
            child: const Icon(
              Icons.diversity_3_rounded,
              size: 64,
              color: Color(0xFF2F9446),
            ),
          ),
        ],
      ),
    );
  }
}
