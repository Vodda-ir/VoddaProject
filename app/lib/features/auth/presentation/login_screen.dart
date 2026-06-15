import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:pinput/pinput.dart';

import '../../../core/network/error_message.dart';
import '../../../core/theme/app_colors.dart';
import '../data/auth_repository.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen>
    with SingleTickerProviderStateMixin {
  final _mobile = TextEditingController();
  final _code = TextEditingController();
  final _codeFocus = FocusNode();
  bool _codeSent = false;
  bool _loadingOtp = false;
  bool _loadingVerify = false;
  String? _error;

  late final AnimationController _animCtrl;
  late final Animation<double> _codeFade;
  late final Animation<double> _codeSlide;

  @override
  void initState() {
    super.initState();
    _animCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
    _codeFade = CurvedAnimation(parent: _animCtrl, curve: Curves.easeOut);
    _codeSlide = CurvedAnimation(parent: _animCtrl, curve: Curves.easeOutCubic);
  }

  Future<void> _requestOtp() async {
    final phone = _mobile.text.trim();
    if (phone.length < 11) {
      setState(() => _error = 'شماره موبایل ۱۱ رقمی وارد کنید');
      return;
    }
    setState(() {
      _loadingOtp = true;
      _error = null;
    });
    try {
      await ref.read(authRepositoryProvider).requestOtp(phone);
      setState(() => _codeSent = true);
      _animCtrl.forward();
      Future.delayed(const Duration(milliseconds: 450), () {
        if (mounted) _codeFocus.requestFocus();
      });
    } catch (e) {
      setState(() => _error = errorMessage(e));
    } finally {
      setState(() => _loadingOtp = false);
    }
  }

  Future<void> _verify() async {
    final code = _code.text.trim();
    if (code.length < 5) return;
    setState(() {
      _loadingVerify = true;
      _error = null;
    });
    try {
      await ref
          .read(authRepositoryProvider)
          .verifyOtp(_mobile.text.trim(), code);
      if (mounted) context.go('/');
    } catch (e) {
      setState(() => _error = errorMessage(e));
    } finally {
      setState(() => _loadingVerify = false);
    }
  }

  void _resetPhone() {
    setState(() {
      _codeSent = false;
      _error = null;
      _code.clear();
    });
    _animCtrl.reverse();
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
                // Logo
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text(
                      'وُدّا',
                      style: TextStyle(
                        fontSize: 34,
                        fontWeight: FontWeight.w800,
                        color: AppColors.olive700,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Padding(
                      padding: const EdgeInsets.only(bottom: 18),
                      child: Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: AppColors.gold,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text(
                  'همراهِ یادگیری قرآن و مداحی',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.ink3),
                ),
                const SizedBox(height: 40),

                // --- Mobile number field ---
                _buildMobileField(),
                const SizedBox(height: 16),

                // --- Submit / Code area ---
                if (!_codeSent) ...[
                  _submitBtn(
                    label: 'دریافت کد تأیید',
                    loading: _loadingOtp,
                    onTap: _requestOtp,
                  ),
                ] else ...[
                  _buildCodeArea(),
                ],

                // --- Error ---
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 16),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.clayBg,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            LucideIcons.info,
                            size: 18,
                            color: AppColors.rose,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              _error!,
                              style: const TextStyle(
                                color: AppColors.rose,
                                fontSize: 13,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMobileField() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'شماره موبایل',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: _codeSent ? AppColors.ink4 : AppColors.ink2,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: _codeSent ? AppColors.sand100 : AppColors.surface,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: _codeSent ? AppColors.sand200 : AppColors.sand200,
            ),
            boxShadow: _codeSent
                ? null
                : const [BoxShadow(color: Color(0x0A2E3622), blurRadius: 6)],
          ),
          child: TextField(
            controller: _mobile,
            enabled: !_codeSent,
            keyboardType: TextInputType.phone,
            textDirection: TextDirection.ltr,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: _codeSent ? AppColors.ink3 : AppColors.ink,
              letterSpacing: 2,
            ),
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
              LengthLimitingTextInputFormatter(11),
            ],
            decoration: InputDecoration(
              hintText: '۰۹××× ××× ×××',
              hintStyle: TextStyle(
                color: _codeSent ? AppColors.ink4 : AppColors.ink3,
                fontSize: 16,
                letterSpacing: 1,
              ),
              hintTextDirection: TextDirection.ltr,
              prefixIcon: Icon(
                LucideIcons.phone,
                color: _codeSent ? AppColors.ink4 : AppColors.olive600,
              ),
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 18,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCodeArea() {
    // Vodda-themed pinput style
    final defaultPinTheme = PinTheme(
      width: 52,
      height: 56,
      textStyle: const TextStyle(
        fontSize: 22,
        fontWeight: FontWeight.w800,
        color: AppColors.ink,
      ),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.sand200),
        boxShadow: const [BoxShadow(color: Color(0x0A2E3622), blurRadius: 4)],
      ),
    );

    final focusedPinTheme = defaultPinTheme.copyWith(
      decoration: defaultPinTheme.decoration!.copyWith(
        border: Border.all(color: AppColors.olive500, width: 1.8),
      ),
    );

    final submittedPinTheme = defaultPinTheme.copyWith(
      decoration: defaultPinTheme.decoration!.copyWith(
        border: Border.all(color: AppColors.olive300),
        color: AppColors.olive50,
      ),
    );

    return AnimatedBuilder(
      animation: _animCtrl,
      builder: (context, child) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Animated collapse section
            SizeTransition(
              sizeFactor: _codeSlide,
              axis: Axis.vertical,
              child: FadeTransition(
                opacity: _codeFade,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const SizedBox(height: 4),
                    Text(
                      'کد پیامک‌شده به ${_mobile.text} را وارد کنید',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: AppColors.ink3,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 20),
                    // Pinput OTP field
                    Directionality(
                      textDirection: TextDirection.ltr,
                      child: Pinput(
                        controller: _code,
                        focusNode: _codeFocus,
                        length: 5,
                        defaultPinTheme: defaultPinTheme,
                        focusedPinTheme: focusedPinTheme,
                        submittedPinTheme: submittedPinTheme,
                        pinputAutovalidateMode: PinputAutovalidateMode.onSubmit,
                        showCursor: true,
                        onCompleted: (pin) => _verify(),
                        onChanged: (_) => setState(() => _error = null),
                      ),
                    ),
                    const SizedBox(height: 24),
                    // Verify button
                    _submitBtn(
                      label: 'ورود',
                      loading: _loadingVerify,
                      onTap: _verify,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 10),
            // Resend / Change number row
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                TextButton(
                  onPressed: _loadingOtp ? null : _requestOtp,
                  child: const Text(
                    'ارسال مجدد کد',
                    style: TextStyle(
                      color: AppColors.olive600,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                Container(
                  width: 3,
                  height: 3,
                  decoration: const BoxDecoration(
                    color: AppColors.sand200,
                    shape: BoxShape.circle,
                  ),
                ),
                TextButton(
                  onPressed: _resetPhone,
                  child: const Text(
                    'تغییر شماره',
                    style: TextStyle(
                      color: AppColors.ink3,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ],
        );
      },
    );
  }

  Widget _submitBtn({
    required String label,
    required bool loading,
    required VoidCallback onTap,
  }) {
    return SizedBox(
      height: 52,
      child: ElevatedButton(
        onPressed: loading ? null : onTap,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.olive600,
          foregroundColor: Colors.white,
          disabledBackgroundColor: AppColors.olive300,
          disabledForegroundColor: Colors.white70,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(999),
          ),
        ),
        child: loading
            ? const SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(
                  color: Colors.white,
                  strokeWidth: 2.4,
                ),
              )
            : Text(label),
      ),
    );
  }

  @override
  void dispose() {
    _mobile.dispose();
    _code.dispose();
    _codeFocus.dispose();
    _animCtrl.dispose();
    super.dispose();
  }
}
