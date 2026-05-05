import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/client.dart';
import '../auth_provider.dart';
import 'widgets/auth_flow_scaffold.dart';

class VerifyOtpScreen extends ConsumerStatefulWidget {
  final String mobile;
  final DateTime expiresAt;
  final bool reusedExistingCode;

  const VerifyOtpScreen({
    super.key,
    required this.mobile,
    required this.expiresAt,
    this.reusedExistingCode = false,
  });

  @override
  ConsumerState<VerifyOtpScreen> createState() => _VerifyOtpScreenState();
}

class _VerifyOtpScreenState extends ConsumerState<VerifyOtpScreen> {
  final TextEditingController _codeCtrl = TextEditingController();

  Timer? _timer;
  bool _loading = false;
  String? _error;
  String? _info;
  late DateTime _expiresAt;
  int _secondsRemaining = 0;

  @override
  void initState() {
    super.initState();
    _expiresAt = widget.expiresAt;
    _info = widget.reusedExistingCode ? 'کد قبلی هنوز معتبر است. از همان کد استفاده کنید.' : null;
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
    _syncRemainingSeconds();

    if (_secondsRemaining <= 0) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _expireAndGoBack());
      return;
    }

    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      _syncRemainingSeconds();

      if (_secondsRemaining <= 0) {
        timer.cancel();
        if (!_loading) {
          _expireAndGoBack();
        }
        return;
      }
    });
  }

  void _syncRemainingSeconds() {
    final remaining = _expiresAt.difference(DateTime.now()).inSeconds;
    if (!mounted) return;
    setState(() {
      _secondsRemaining = remaining > 0 ? remaining : 0;
    });
  }

  void _expireAndGoBack() {
    if (!mounted) return;
    if (Navigator.of(context).canPop()) {
      context.pop('otp-expired');
      return;
    }
    context.go('/login');
  }

  String _formatRemaining() {
    final minutes = _secondsRemaining ~/ 60;
    final seconds = _secondsRemaining % 60;
    return '$minutes:${seconds.toString().padLeft(2, '0')}';
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
      _info = null;
    });
    try {
      await ref.read(authStateProvider.notifier).verifyOtp(widget.mobile, code);
      if (!mounted) return;
      context.go('/dashboard');
    } on ApiException catch (e) {
      setState(() {
        _error = e.message;
      });
    } catch (_) {
      setState(() {
        _error = 'کد تأیید نامعتبر یا منقضی است';
      });
    } finally {
      if (mounted) {
        setState(() => _loading = false);
        if (_secondsRemaining <= 0 && !_loading) {
          _expireAndGoBack();
        }
      }
    }
  }

  Future<void> _resendOtp() async {
    setState(() {
      _loading = true;
      _error = null;
      _info = null;
    });
    try {
      final result = await ref.read(authStateProvider.notifier).requestOtp(widget.mobile);
      _codeCtrl.clear();
      _expiresAt = result.expiresAt;
      _info = result.message;
      _startTimer();
    } on ApiException catch (e) {
      setState(() {
        _error = e.message;
      });
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
                  onPressed: _loading
                      ? null
                      : () {
                          if (Navigator.of(context).canPop()) {
                            context.pop();
                            return;
                          }
                          context.go('/login');
                        },
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
          if (_info != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Text(
                _info!,
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: const Color(0xFF23894A),
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          Text(
            'اعتبار این کد: ${_formatRemaining()}',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: const Color(0xFF6A768B),
            ),
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed: _loading ? null : _resendOtp,
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
