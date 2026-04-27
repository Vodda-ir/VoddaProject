import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth_provider.dart';
import 'widgets/auth_flow_scaffold.dart';

class VerifyOtpScreen extends ConsumerStatefulWidget {
  final String mobile;

  const VerifyOtpScreen({
    super.key,
    required this.mobile,
  });

  @override
  ConsumerState<VerifyOtpScreen> createState() => _VerifyOtpScreenState();
}

class _VerifyOtpScreenState extends ConsumerState<VerifyOtpScreen> {
  final TextEditingController _codeCtrl = TextEditingController();

  Timer? _timer;
  bool _loading = false;
  String? _error;
  int _secondsUntilResend = 20;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _codeCtrl.dispose();
    super.dispose();
  }

  void _startTimer() {
    _timer?.cancel();
    setState(() {
      _secondsUntilResend = 20;
    });
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_secondsUntilResend <= 1) {
        timer.cancel();
        setState(() {
          _secondsUntilResend = 0;
        });
        return;
      }
      setState(() {
        _secondsUntilResend -= 1;
      });
    });
  }

  Future<void> _verifyOtp() async {
    final code = _codeCtrl.text.trim();
    if (code.length != 5) {
      setState(() => _error = 'کد تأیید باید ۵ رقمی باشد');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ref.read(authStateProvider.notifier).verifyOtp(widget.mobile, code);
      if (!mounted) return;
      context.go('/dashboard');
    } catch (_) {
      setState(() {
        _error = 'کد تأیید نامعتبر یا منقضی است';
      });
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _resendOtp() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ref.read(authStateProvider.notifier).requestOtp(widget.mobile);
      _codeCtrl.clear();
      _startTimer();
    } catch (_) {
      setState(() {
        _error = 'ارسال مجدد کد با خطا مواجه شد';
      });
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AuthFlowScaffold(
      title: 'کد تأیید را وارد کنید',
      subtitle: 'کد ۵ رقمی ارسال‌شده به ${widget.mobile} را وارد کنید تا وارد وُدّا شوید.',
      heroVariant: AuthHeroVariant.otp,
      content: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
            decoration: BoxDecoration(
              color: const Color(0xFFF4FAF5),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFD8EADB)),
            ),
            child: Row(
              children: [
                const Icon(Icons.phone_iphone_rounded, color: Color(0xFF22A84F)),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    widget.mobile,
                    textDirection: TextDirection.ltr,
                    style: const TextStyle(
                      color: Color(0xFF10224A),
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                TextButton(
                  onPressed: _loading ? null : () => context.go('/login'),
                  child: const Text('ویرایش'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          OtpCodeField(
            controller: _codeCtrl,
            enabled: !_loading,
            onChanged: (_) {
              if (_error != null) {
                setState(() => _error = null);
              }
            },
          ),
          const SizedBox(height: 14),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Text(
                _error!,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: theme.colorScheme.error,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          Text(
            _secondsUntilResend > 0
                ? 'ارسال مجدد کد تا $_secondsUntilResend ثانیه دیگر'
                : 'اگر کد را دریافت نکردی، دوباره درخواست بده.',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: const Color(0xFF6A768B),
            ),
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed: _loading || _secondsUntilResend > 0 ? null : _resendOtp,
            child: const Text('ارسال مجدد کد'),
          ),
          const SizedBox(height: 10),
          AuthPrimaryButton(
            label: _loading ? 'در حال ورود...' : 'تأیید و ورود',
            onPressed: _loading ? null : _verifyOtp,
          ),
        ],
      ),
    );
  }
}
