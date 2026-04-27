import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/auth_provider.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/verify_otp_screen.dart';
import '../../features/splash/presentation/splash_screen.dart';
import '../widgets/vodda_app_bar_title.dart';

bool _isAuthenticated(BuildContext context) {
  final auth = ProviderScope.containerOf(
    context,
    listen: false,
  ).read(authStateProvider);
  return auth.isAuthenticated;
}

final appRouter = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const SplashScreen(),
    ),
    GoRoute(
      path: '/dashboard',
      builder: (context, state) {
        if (!_isAuthenticated(context)) {
          return const LoginScreen();
        }
        return const DashboardPage();
      },
    ),
    GoRoute(
      path: '/login',
      builder: (context, state) {
        if (_isAuthenticated(context)) {
          return const DashboardPage();
        }
        return const LoginScreen();
      },
    ),
    GoRoute(
      path: '/login/verify',
      builder: (context, state) {
        if (_isAuthenticated(context)) {
          return const DashboardPage();
        }
        final mobile = state.uri.queryParameters['mobile'] ?? '';
        if (mobile.isEmpty) {
          return const LoginScreen();
        }
        return VerifyOtpScreen(mobile: mobile);
      },
    ),
    GoRoute(
      path: '/teachers',
      builder: (context, state) => const TeachersPage(),
    ),
    GoRoute(
      path: '/teachers/:id',
      builder: (context, state) {
        final id = int.tryParse(state.pathParameters['id'] ?? '') ?? 0;
        return TeacherDetailPage(teacherId: id);
      },
    ),
    GoRoute(
      path: '/bookings',
      builder: (context, state) => const BookingsPage(),
    ),
    GoRoute(
      path: '/wallet',
      builder: (context, state) => const WalletPage(),
    ),
    GoRoute(
      path: '/notifications',
      builder: (context, state) => const NotificationsPage(),
    ),
  ],
);

class DashboardPage extends ConsumerWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);

    if (!auth.isAuthenticated) {
      return const LoginScreen();
    }

    return Scaffold(
      appBar: AppBar(
        title: const VoddaAppBarTitle('وُدّا'),
        actions: [
          if (auth.isAuthenticated)
            IconButton(
              onPressed: () async {
                await ref.read(authStateProvider.notifier).logout();
                context.go('/login');
              },
              icon: const Icon(Icons.logout),
            ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 8),
            Center(
              child: Container(
                width: 92,
                height: 92,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  borderRadius: BorderRadius.circular(28),
                  boxShadow: [
                    BoxShadow(
                      color: Theme.of(context).colorScheme.shadow.withOpacity(0.08),
                      blurRadius: 24,
                      offset: const Offset(0, 12),
                    ),
                  ],
                ),
                child: Image.asset('assets/images/logo.png'),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'پلتفرم آموزش قرآن و مداحی',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'نسخه‌ی موبایل وُدّا برای ورود، رزرو جلسه، کیف پول و پیگیری اعلان‌ها.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            Text('کاربر: ${auth.user?.name.isNotEmpty == true ? auth.user!.name : auth.user?.mobile ?? ''}'),
            const SizedBox(height: 8),
            Text('نقش فعال: ${auth.user?.activeRole ?? '-'}'),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              children: (auth.user?.roles ?? const [])
                  .map(
                    (role) => OutlinedButton(
                      onPressed: role == auth.user?.activeRole
                          ? null
                          : () => ref.read(authStateProvider.notifier).switchRole(role),
                      child: Text('تغییر به $role'),
                    ),
                  )
                  .toList(),
            ),
            const SizedBox(height: 20),
            FilledButton.tonal(
              onPressed: () => context.go('/teachers'),
              child: const Text('مشاهده اساتید'),
            ),
            const SizedBox(height: 10),
            FilledButton.tonal(
              onPressed: () => context.go('/bookings'),
              child: const Text('جلسات من'),
            ),
            const SizedBox(height: 10),
            FilledButton.tonal(
              onPressed: () => context.go('/wallet'),
              child: const Text('کیف پول'),
            ),
            const SizedBox(height: 10),
            FilledButton.tonal(
              onPressed: () => context.go('/notifications'),
              child: const Text('اعلان‌ها'),
            ),
          ],
        ),
      ),
    );
  }
}

class TeachersPage extends ConsumerStatefulWidget {
  const TeachersPage({super.key});

  @override
  ConsumerState<TeachersPage> createState() => _TeachersPageState();
}

class _TeachersPageState extends ConsumerState<TeachersPage> {
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _items = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await ref.read(apiClientProvider).get('/teachers');
      final raw = (res['items'] as List<dynamic>? ?? const []);
      setState(() {
        _items = raw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      });
    } catch (_) {
      setState(() {
        _error = 'دریافت لیست اساتید ناموفق بود';
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const VoddaAppBarTitle('اساتید')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!))
              : ListView.separated(
                  padding: const EdgeInsets.all(12),
                  itemCount: _items.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final t = _items[index];
                    return ListTile(
                      tileColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      title: Text((t['name'] as String?)?.isNotEmpty == true ? t['name'] as String : 'استاد #${t['id']}'),
                      subtitle: Text('${t['specialty']} - ${t['level']}'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => context.go('/teachers/${t['id']}'),
                    );
                  },
                ),
    );
  }
}

class TeacherDetailPage extends ConsumerStatefulWidget {
  final int teacherId;
  const TeacherDetailPage({super.key, required this.teacherId});

  @override
  ConsumerState<TeacherDetailPage> createState() => _TeacherDetailPageState();
}

class _TeacherDetailPageState extends ConsumerState<TeacherDetailPage> {
  bool _loading = true;
  String? _error;
  Map<String, dynamic>? _teacher;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await ref.read(apiClientProvider).get('/teachers/${widget.teacherId}');
      setState(() {
        _teacher = res;
      });
    } catch (_) {
      setState(() {
        _error = 'دریافت اطلاعات استاد ناموفق بود';
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const VoddaAppBarTitle('جزئیات استاد')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!))
              : _teacher == null
                  ? const Center(child: Text('استاد یافت نشد'))
                  : Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            (_teacher!['name'] as String?)?.isNotEmpty == true
                                ? _teacher!['name'] as String
                                : 'استاد #${_teacher!['id']}',
                            style: Theme.of(context).textTheme.headlineSmall,
                          ),
                          const SizedBox(height: 8),
                          Text('${_teacher!['specialty']} - ${_teacher!['level']}'),
                          const SizedBox(height: 8),
                          Text('هزینه ۳۰ دقیقه: ${_teacher!['price_per_30min']} تومان'),
                          const SizedBox(height: 8),
                          Text('امتیاز: ${_teacher!['average_rating']}'),
                          const SizedBox(height: 16),
                          Text((_teacher!['bio'] as String?)?.isNotEmpty == true
                              ? _teacher!['bio'] as String
                              : 'بدون توضیح'),
                        ],
                      ),
                    ),
    );
  }
}

class BookingsPage extends ConsumerStatefulWidget {
  const BookingsPage({super.key});

  @override
  ConsumerState<BookingsPage> createState() => _BookingsPageState();
}

class _BookingsPageState extends ConsumerState<BookingsPage> {
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _bookings = const [];
  List<Map<String, dynamic>> _teachers = const [];

  int? _teacherProfileId;
  final TextEditingController _dateCtrl = TextEditingController();
  final TextEditingController _startCtrl = TextEditingController(text: '10:00:00');
  final TextEditingController _endCtrl = TextEditingController(text: '10:30:00');
  final TextEditingController _noteCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _dateCtrl.dispose();
    _startCtrl.dispose();
    _endCtrl.dispose();
    _noteCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final teachersRes = await ref.read(apiClientProvider).get('/teachers');
      final bookingsRes = await ref.read(apiClientProvider).get('/bookings/my');
      final teachersRaw = (teachersRes['items'] as List<dynamic>? ?? const []);
      final bookingsRaw = (bookingsRes['items'] as List<dynamic>? ?? const []);
      setState(() {
        _teachers = teachersRaw
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
        _bookings = bookingsRaw
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
      });
    } catch (_) {
      setState(() {
        _error = 'دریافت جلسات ناموفق بود';
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  Future<void> _createBooking() async {
    if (_teacherProfileId == null ||
        _dateCtrl.text.trim().isEmpty ||
        _startCtrl.text.trim().isEmpty ||
        _endCtrl.text.trim().isEmpty) {
      setState(() => _error = 'فرم رزرو کامل نیست');
      return;
    }
    try {
      await ref.read(apiClientProvider).post('/bookings', {
        'teacher_profile_id': _teacherProfileId,
        'slot_date': _dateCtrl.text.trim(),
        'slot_start': _startCtrl.text.trim(),
        'slot_end': _endCtrl.text.trim(),
        'notes': _noteCtrl.text.trim(),
      });
      _noteCtrl.clear();
      await _load();
    } catch (_) {
      setState(() {
        _error = 'ثبت رزرو ناموفق بود';
      });
    }
  }

  Future<void> _submitRating(int bookingId, int score) async {
    try {
      await ref.read(apiClientProvider).post('/ratings', {
        'booking_id': bookingId,
        'score': score,
        'comment': '',
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('امتیاز ثبت شد')),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('ثبت امتیاز ناموفق بود')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const VoddaAppBarTitle('جلسات من')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                children: [
                  if (_error != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Text(_error!),
                    ),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Text('رزرو جلسه جدید'),
                          const SizedBox(height: 8),
                          DropdownButtonFormField<int>(
                            value: _teacherProfileId,
                            items: _teachers
                              .map(
                                  (t) => DropdownMenuItem<int>(
                                    value: (t['id'] as num?)?.toInt(),
                                    child: Text(
                                      '${t['name'] ?? 'استاد #${t['id']}'} - ${t['specialty']}',
                                    ),
                                  ),
                                )
                                .toList(),
                            onChanged: (v) => setState(() => _teacherProfileId = v),
                            hint: const Text('انتخاب استاد'),
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _dateCtrl,
                            decoration: const InputDecoration(
                              labelText: 'تاریخ (YYYY-MM-DD)',
                            ),
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _startCtrl,
                            decoration: const InputDecoration(
                              labelText: 'زمان شروع (HH:MM:SS)',
                            ),
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _endCtrl,
                            decoration: const InputDecoration(
                              labelText: 'زمان پایان (HH:MM:SS)',
                            ),
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _noteCtrl,
                            decoration: const InputDecoration(labelText: 'توضیحات'),
                          ),
                          const SizedBox(height: 8),
                          FilledButton(
                            onPressed: _createBooking,
                            child: const Text('ثبت رزرو'),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Expanded(
                    child: _bookings.isEmpty
                        ? const Center(child: Text('جلسه‌ای ثبت نشده است'))
                        : ListView.separated(
                            itemCount: _bookings.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: 8),
                            itemBuilder: (context, index) {
                              final b = _bookings[index];
                              final status = (b['status'] as String?) ?? '';
                              return Container(
                                decoration: BoxDecoration(
                                  color: Theme.of(context)
                                      .colorScheme
                                      .surfaceContainerHighest,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                padding: const EdgeInsets.all(12),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('استاد: ${b['teacher_name'] ?? b['teacher_profile_id']}'),
                                    const SizedBox(height: 4),
                                    Text(
                                      '${b['slot_date']} ${b['slot_start']} - ${b['slot_end']} | $status',
                                    ),
                                    if (status == 'completed') ...[
                                      const SizedBox(height: 8),
                                      Wrap(
                                        spacing: 8,
                                        children: [
                                          OutlinedButton(
                                            onPressed: () => _submitRating(
                                              (b['id'] as num?)?.toInt() ?? 0,
                                              5,
                                            ),
                                            child: const Text('امتیاز 5'),
                                          ),
                                          OutlinedButton(
                                            onPressed: () => _submitRating(
                                              (b['id'] as num?)?.toInt() ?? 0,
                                              4,
                                            ),
                                            child: const Text('امتیاز 4'),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ],
                                ),
                              );
                            },
                          ),
                  ),
                ],
              ),
            ),
    );
  }
}

class WalletPage extends ConsumerStatefulWidget {
  const WalletPage({super.key});

  @override
  ConsumerState<WalletPage> createState() => _WalletPageState();
}

class _WalletPageState extends ConsumerState<WalletPage> {
  bool _loading = true;
  String? _error;
  int _balance = 0;
  List<Map<String, dynamic>> _transactions = const [];
  final TextEditingController _amountCtrl = TextEditingController(text: '100000');
  final TextEditingController _bankInfoCtrl =
      TextEditingController(text: '{"iban":"IR..."}');
  String? _referenceId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _amountCtrl.dispose();
    _bankInfoCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await ref.read(apiClientProvider).get('/wallet/transactions');
      final txRaw = (res['transactions'] as List<dynamic>? ?? const []);
      setState(() {
        _balance = (res['balance'] as num?)?.toInt() ?? 0;
        _transactions = txRaw
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
      });
    } catch (_) {
      setState(() {
        _error = 'دریافت کیف پول ناموفق بود';
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  Future<void> _initiateTopup() async {
    final amount = int.tryParse(_amountCtrl.text.trim()) ?? 0;
    if (amount <= 0) {
      setState(() => _error = 'مبلغ شارژ نامعتبر است');
      return;
    }
    try {
      final res = await ref.read(apiClientProvider).post('/wallet/topup/initiate', {
        'amount': amount,
      });
      setState(() {
        _referenceId = res['reference_id']?.toString();
      });
    } catch (_) {
      setState(() {
        _error = 'شروع شارژ ناموفق بود';
      });
    }
  }

  Future<void> _verifyTopup() async {
    final amount = int.tryParse(_amountCtrl.text.trim()) ?? 0;
    if ((_referenceId ?? '').isEmpty || amount <= 0) {
      setState(() => _error = 'ابتدا شروع شارژ انجام شود');
      return;
    }
    try {
      await ref.read(apiClientProvider).post('/wallet/topup/verify', {
        'reference_id': _referenceId,
        'amount': amount,
      });
      await _load();
    } catch (_) {
      setState(() {
        _error = 'تایید شارژ ناموفق بود';
      });
    }
  }

  Future<void> _requestWithdraw() async {
    final amount = int.tryParse(_amountCtrl.text.trim()) ?? 0;
    if (amount <= 0) {
      setState(() => _error = 'مبلغ برداشت نامعتبر است');
      return;
    }
    try {
      await ref.read(apiClientProvider).post('/wallet/withdraw-requests', {
        'amount': amount,
        'bank_info': _bankInfoCtrl.text.trim(),
      });
      await _load();
    } catch (_) {
      setState(() {
        _error = 'ثبت درخواست برداشت ناموفق بود';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const VoddaAppBarTitle('کیف پول')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (_error != null) Text(_error!),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('موجودی: $_balance تومان'),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _amountCtrl,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(labelText: 'مبلغ شارژ'),
                          ),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 8,
                            children: [
                              FilledButton(
                                onPressed: _initiateTopup,
                                child: const Text('شروع شارژ'),
                              ),
                              OutlinedButton(
                                onPressed: _verifyTopup,
                                child: const Text('تایید شارژ'),
                              ),
                              OutlinedButton(
                                onPressed: _requestWithdraw,
                                child: const Text('درخواست برداشت'),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _bankInfoCtrl,
                            decoration: const InputDecoration(
                              labelText: 'اطلاعات بانکی (JSON)',
                            ),
                          ),
                          if (_referenceId != null) Text('ref: $_referenceId'),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Expanded(
                    child: _transactions.isEmpty
                        ? const Center(child: Text('تراکنشی ثبت نشده است'))
                        : ListView.separated(
                            itemCount: _transactions.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: 8),
                            itemBuilder: (context, index) {
                              final tx = _transactions[index];
                              return ListTile(
                                tileColor: Theme.of(context)
                                    .colorScheme
                                    .surfaceContainerHighest,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                title: Text('${tx['type']} | ${tx['amount']}'),
                                subtitle: Text('${tx['description'] ?? ''}'),
                              );
                            },
                          ),
                  ),
                ],
              ),
            ),
    );
  }
}

class NotificationsPage extends ConsumerStatefulWidget {
  const NotificationsPage({super.key});

  @override
  ConsumerState<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends ConsumerState<NotificationsPage> {
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _items = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await ref.read(apiClientProvider).get('/notifications');
      final raw = (res['items'] as List<dynamic>? ?? const []);
      setState(() {
        _items = raw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      });
    } catch (_) {
      setState(() {
        _error = 'دریافت اعلان‌ها ناموفق بود';
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const VoddaAppBarTitle('اعلان‌ها')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!))
              : ListView.separated(
                  padding: const EdgeInsets.all(12),
                  itemCount: _items.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final n = _items[index];
                    return ListTile(
                      tileColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      title: Text((n['title'] as String?) ?? '-'),
                      subtitle: Text((n['body'] as String?) ?? ''),
                    );
                  },
                ),
    );
  }
}
