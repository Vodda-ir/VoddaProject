import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth_provider.dart';
import 'widgets/auth_flow_scaffold.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _mobileCtrl = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _mobileCtrl.dispose();
    super.dispose();
  }

  Future<void> _requestOtp() async {
    final mobile = _mobileCtrl.text.trim();
    if (!RegExp(r'^09\d{9}$').hasMatch(mobile)) {
      setState(() => _error = 'شماره موبایل معتبر نیست');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ref.read(authStateProvider.notifier).requestOtp(mobile);
      if (!mounted) return;
      final uri = Uri(
        path: '/login/verify',
        queryParameters: {'mobile': mobile},
      );
      context.go(uri.toString());
    } catch (_) {
      setState(() {
        _error = 'ارسال کد با خطا مواجه شد';
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
      title: 'به وُدّا خوش آمدید',
      subtitle: 'برای ثبت‌نام یا ورود، شماره موبایل خود را وارد کنید تا کد یک‌بارمصرف برایتان ارسال شود.',
      heroVariant: AuthHeroVariant.mobile,
      content: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AuthPhoneField(
            controller: _mobileCtrl,
            enabled: !_loading,
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
            'ثبت‌نام یا ورود به معنی پذیرش قوانین وُدّاست.',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: const Color(0xFF6A768B),
              height: 1.8,
            ),
          ),
          const SizedBox(height: 18),
          AuthPrimaryButton(
            label: _loading ? 'در حال ارسال...' : 'ادامه و دریافت کد',
            onPressed: _loading ? null : _requestOtp,
          ),
        ],
      ),
    );
  }
}
