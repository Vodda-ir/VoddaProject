import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/services/snackbar_service.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/fa.dart';
import '../../../core/widgets/app_error.dart';
import '../../auth/data/user_repository.dart';
import '../data/teacher_repository.dart';

class WithdrawScreen extends ConsumerStatefulWidget {
  const WithdrawScreen({super.key});

  @override
  ConsumerState<WithdrawScreen> createState() => _WithdrawScreenState();
}

class _WithdrawScreenState extends ConsumerState<WithdrawScreen> {
  final _amount = TextEditingController();
  final _card = TextEditingController();
  final _sheba = TextEditingController();
  bool _loading = false;
  bool _done = false;
  int _submittedAmount = 0;

  @override
  Widget build(BuildContext context) {
    final me = ref.watch(meProvider);

    if (_done) {
      return Scaffold(
        appBar: AppBar(title: const Text('برداشت وجه')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 92,
                  height: 92,
                  decoration: BoxDecoration(
                    color: AppColors.olive100,
                    borderRadius: BorderRadius.circular(46),
                  ),
                  child: const Icon(
                    LucideIcons.checkCircle,
                    size: 52,
                    color: AppColors.olive600,
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'درخواست برداشت ثبت شد',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 10),
                Text(
                  'مبلغ ${faNumber(_submittedAmount)} تومان تا بررسی مدیر رزرو شده است. نتیجه از تاریخچهٔ برداشت و اعلان‌های سامانه قابل پیگیری است.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 14,
                    height: 2,
                    color: AppColors.ink2,
                  ),
                ),
                const SizedBox(height: 26),
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('بازگشت به کیف پول'),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('برداشت وجه')),
      body: me.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppColors.olive600),
        ),
        error: (error, _) => AppErrorView(
          error: error,
          onRetry: () => ref.invalidate(meProvider),
        ),
        data: (user) => _form(user.wallet),
      ),
    );
  }

  Widget _form(int balance) {
    final quickAmounts = [500000, 1000000, 2000000];
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.olive50,
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'موجودی قابل برداشت',
                      style: TextStyle(fontSize: 13, color: AppColors.ink2),
                    ),
                    Text(
                      '${faNumber(balance)} تومان',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: AppColors.olive700,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 22),
              _FieldLabel(
                label: 'مبلغ برداشت',
                child: TextField(
                  controller: _amount,
                  keyboardType: TextInputType.number,
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(
                      RegExp(r'[0-9۰-۹٠-٩]'),
                    ),
                  ],
                  decoration: const InputDecoration(
                    hintText: 'مثلاً ۵۰۰۰۰۰',
                    suffixText: 'تومان',
                  ),
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: quickAmounts.map((amount) {
                  final label = amount >= 1000000
                      ? '${faNumber(amount ~/ 1000000)} میلیون'
                      : '${faNumber(amount ~/ 1000)} هزار';
                  return Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: OutlinedButton(
                        onPressed: () => setState(() {
                          _amount.text = '$amount';
                        }),
                        child: Text(label),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 22),
              const Text(
                'حساب مقصد',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 6),
              const Text(
                'حداقل یکی از شماره کارت یا شبا الزامی است.',
                style: TextStyle(fontSize: 12, color: AppColors.ink3),
              ),
              const SizedBox(height: 12),
              _FieldLabel(
                label: 'شماره کارت (اختیاری)',
                child: TextField(
                  controller: _card,
                  keyboardType: TextInputType.number,
                  textDirection: TextDirection.ltr,
                  inputFormatters: [
                    LengthLimitingTextInputFormatter(19),
                    FilteringTextInputFormatter.allow(
                      RegExp(r'[0-9۰-۹٠-٩\s-]'),
                    ),
                  ],
                  decoration: const InputDecoration(
                    hintText: '۶۰۳۷ ۹۹۷۵ ۱۲۳۴ ۵۶۷۸',
                    prefixIcon: Icon(LucideIcons.creditCard),
                  ),
                ),
              ),
              const SizedBox(height: 14),
              _FieldLabel(
                label: 'شماره شبا (اختیاری)',
                child: TextField(
                  controller: _sheba,
                  textDirection: TextDirection.ltr,
                  textCapitalization: TextCapitalization.characters,
                  inputFormatters: [
                    LengthLimitingTextInputFormatter(34),
                    FilteringTextInputFormatter.allow(
                      RegExp(r'[a-zA-Z0-9۰-۹٠-٩\s-]'),
                    ),
                  ],
                  decoration: const InputDecoration(
                    hintText: 'IR000000000000000000000000',
                    prefixIcon: Icon(LucideIcons.landmark),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.goldBg,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Text(
                  'ثبت درخواست به معنی انتقال بانکی نیست. مبلغ تا پرداخت یا رد درخواست از موجودی شما رزرو می‌شود.',
                  style: TextStyle(
                    fontSize: 12,
                    color: Color(0xFF765918),
                    height: 1.8,
                  ),
                ),
              ),
            ],
          ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton.icon(
                onPressed: _loading ? null : () => _submitWithdrawal(balance),
                icon: _loading
                    ? const SizedBox(
                        width: 19,
                        height: 19,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(LucideIcons.check, size: 19),
                label: Text(_loading ? 'در حال ثبت…' : 'ثبت درخواست برداشت'),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _submitWithdrawal(int balance) async {
    final amount = int.tryParse(_normalizeDigits(_amount.text));
    final card = _normalizeDigits(_card.text).replaceAll(RegExp(r'\D'), '');
    final sheba = _normalizeDigits(_sheba.text)
        .replaceAll(RegExp(r'[^a-zA-Z0-9]'), '')
        .toUpperCase();

    if (amount == null || amount <= 0) {
      SnackBarService.show('مبلغ معتبر وارد کنید');
      return;
    }
    if (amount > balance) {
      SnackBarService.show('مبلغ از موجودی کیف پول بیشتر است');
      return;
    }
    if (card.isEmpty && sheba.isEmpty) {
      SnackBarService.show('شماره کارت یا شبا را وارد کنید');
      return;
    }
    if (card.isNotEmpty && card.length != 16) {
      SnackBarService.show('شماره کارت باید ۱۶ رقم باشد');
      return;
    }
    if (sheba.isNotEmpty && !RegExp(r'^IR\d{24}$').hasMatch(sheba)) {
      SnackBarService.show('شماره شبا معتبر نیست');
      return;
    }

    setState(() => _loading = true);
    final ok = await ref.read(teacherRepositoryProvider).requestWithdrawal(
          amount: amount,
          card: card,
          sheba: sheba,
        );
    if (!mounted) return;
    setState(() => _loading = false);
    if (ok) {
      _submittedAmount = amount;
      ref.invalidate(meProvider);
      setState(() => _done = true);
    }
  }

  String _normalizeDigits(String value) {
    const persian = '۰۱۲۳۴۵۶۷۸۹';
    const arabic = '٠١٢٣٤٥٦٧٨٩';
    var output = value;
    for (var index = 0; index < 10; index++) {
      output = output
          .replaceAll(persian[index], '$index')
          .replaceAll(arabic[index], '$index');
    }
    return output;
  }

  @override
  void dispose() {
    _amount.dispose();
    _card.dispose();
    _sheba.dispose();
    super.dispose();
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel({required this.label, required this.child});
  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          child,
        ],
      );
}
