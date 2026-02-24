import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _mobileCtrl = TextEditingController();
  final _codeCtrl = TextEditingController();

  bool _otpRequested = false;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _mobileCtrl.dispose();
    _codeCtrl.dispose();
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
      setState(() {
        _otpRequested = true;
      });
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

  Future<void> _verifyOtp() async {
    final mobile = _mobileCtrl.text.trim();
    final code = _codeCtrl.text.trim();
    if (!RegExp(r'^09\d{9}$').hasMatch(mobile) || code.length != 6) {
      setState(() => _error = 'شماره موبایل یا کد نامعتبر است');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ref.read(authStateProvider.notifier).verifyOtp(mobile, code);
      if (!mounted) return;
      context.go('/');
    } catch (_) {
      setState(() {
        _error = 'کد تایید نامعتبر یا منقضی است';
      });
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('ورود')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              controller: _mobileCtrl,
              keyboardType: TextInputType.phone,
              enabled: !_otpRequested,
              decoration: const InputDecoration(
                labelText: 'شماره موبایل',
                hintText: '09xxxxxxxxx',
              ),
            ),
            const SizedBox(height: 12),
            if (_otpRequested)
              TextField(
                controller: _codeCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'کد تایید',
                  hintText: '123456',
                ),
              ),
            const SizedBox(height: 16),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(
                  _error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ),
            FilledButton(
              onPressed: _loading
                  ? null
                  : _otpRequested
                      ? _verifyOtp
                      : _requestOtp,
              child: Text(_loading
                  ? 'در حال پردازش...'
                  : _otpRequested
                      ? 'تایید و ورود'
                      : 'دریافت کد'),
            ),
            if (_otpRequested)
              TextButton(
                onPressed: _loading
                    ? null
                    : () {
                        setState(() {
                          _otpRequested = false;
                          _codeCtrl.clear();
                          _error = null;
                        });
                      },
                child: const Text('تغییر شماره موبایل'),
              ),
          ],
        ),
      ),
    );
  }
}
