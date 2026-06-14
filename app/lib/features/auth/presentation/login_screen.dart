import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../data/auth_repository.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _mobile = TextEditingController();
  final _code = TextEditingController();
  bool _codeSent = false;
  bool _loading = false;
  String? _error;

  Future<void> _requestOtp() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ref.read(authRepositoryProvider).requestOtp(_mobile.text.trim());
      setState(() => _codeSent = true);
    } catch (e) {
      setState(() => _error = 'ارسال کد ناموفق بود');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _verify() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ref.read(authRepositoryProvider).verifyOtp(_mobile.text.trim(), _code.text.trim());
      if (mounted) context.go('/');
    } catch (e) {
      setState(() => _error = 'کد تأیید نامعتبر است');
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: const [
                    Text('وُدّا', style: TextStyle(fontSize: 34, fontWeight: FontWeight.w800, color: AppColors.olive700)),
                    SizedBox(width: 6),
                    Padding(
                      padding: EdgeInsets.only(bottom: 18),
                      child: CircleAvatar(radius: 4, backgroundColor: AppColors.gold),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text('همراهِ یادگیری قرآن و مداحی',
                    textAlign: TextAlign.center, style: TextStyle(color: AppColors.ink3)),
                const SizedBox(height: 36),
                if (!_codeSent) ...[
                  TextField(
                    controller: _mobile,
                    keyboardType: TextInputType.phone,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(11)],
                    decoration: const InputDecoration(hintText: 'شماره موبایل (۰۹...)', prefixIcon: Icon(Icons.phone_outlined)),
                  ),
                  const SizedBox(height: 16),
                  _submit(label: 'دریافت کد تأیید', onTap: _requestOtp),
                ] else ...[
                  Text('کد پیامک‌شده به ${_mobile.text} را وارد کنید',
                      textAlign: TextAlign.center, style: const TextStyle(color: AppColors.ink3, fontSize: 13)),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _code,
                    keyboardType: TextInputType.number,
                    textAlign: TextAlign.center,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(6)],
                    decoration: const InputDecoration(hintText: 'کد تأیید'),
                  ),
                  const SizedBox(height: 16),
                  _submit(label: 'ورود', onTap: _verify),
                  TextButton(
                    onPressed: () => setState(() => _codeSent = false),
                    child: const Text('تغییر شماره', style: TextStyle(color: AppColors.olive600)),
                  ),
                ],
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.rose)),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _submit({required String label, required VoidCallback onTap}) => SizedBox(
        height: 52,
        child: ElevatedButton(
          onPressed: _loading ? null : onTap,
          child: _loading
              ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.4))
              : Text(label),
        ),
      );

  @override
  void dispose() {
    _mobile.dispose();
    _code.dispose();
    super.dispose();
  }
}
