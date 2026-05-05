import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../auth/auth_provider.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    await Future<void>.delayed(const Duration(milliseconds: 900));
    while (mounted && !ref.read(authStateProvider).initialized) {
      await Future<void>.delayed(const Duration(milliseconds: 80));
    }
    await Future<void>.delayed(const Duration(milliseconds: 600));
    if (!mounted) {
      return;
    }
    final isAuthenticated = ref.read(authStateProvider).isAuthenticated;
    context.go(isAuthenticated ? '/dashboard' : '/login');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF1F3F8),
      body: Stack(
        children: [
          Positioned.fill(
            child: CustomPaint(
              painter: _SplashBackdropPainter(),
            ),
          ),
          SafeArea(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 28),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 132,
                      height: 132,
                      padding: const EdgeInsets.all(22),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: const LinearGradient(
                          colors: [Color(0xFF39E06F), Color(0xFF208A46)],
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                        ),
                        boxShadow: const [
                          BoxShadow(
                            color: Color(0x4D31D565),
                            blurRadius: 34,
                            spreadRadius: 4,
                          ),
                        ],
                      ),
                      child: Container(
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white,
                        ),
                        padding: const EdgeInsets.all(18),
                        child: Image.asset('assets/images/logo.png'),
                      ),
                    ),
                    const SizedBox(height: 24),
                    const Text(
                      'وُدّا',
                      style: TextStyle(
                        color: Color(0xFF10224A),
                        fontSize: 26,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      'پلتفرم آموزش قرآن و مداحی',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Color(0xFF6B7688),
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        height: 1.8,
                      ),
                    ),
                    const SizedBox(height: 26),
                    const SizedBox(
                      width: 28,
                      height: 28,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.8,
                        valueColor: AlwaysStoppedAnimation(Color(0xFF28B553)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SplashBackdropPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final topPaint = Paint()..color = const Color(0xFF2FC85B);
    final topPath = Path()
      ..moveTo(0, 0)
      ..lineTo(0, size.height * 0.24)
      ..lineTo(size.width * 0.36, size.height * 0.24)
      ..quadraticBezierTo(
        size.width * 0.48,
        size.height * 0.35,
        size.width,
        size.height * 0.28,
      )
      ..lineTo(size.width, 0)
      ..close();
    canvas.drawPath(topPath, topPaint);

    final bottomPath = Path()
      ..moveTo(0, size.height)
      ..lineTo(0, size.height * 0.82)
      ..quadraticBezierTo(
        size.width * 0.22,
        size.height * 0.74,
        size.width * 0.42,
        size.height,
      )
      ..close();
    canvas.drawPath(bottomPath, topPaint);

    final accentPaint = Paint()..color = const Color(0xFFE3E7F0);
    final middlePath = Path()
      ..moveTo(0, size.height * 0.24)
      ..lineTo(0, size.height * 0.82)
      ..quadraticBezierTo(
        size.width * 0.24,
        size.height * 0.76,
        size.width * 0.50,
        size.height * 0.84,
      )
      ..quadraticBezierTo(
        size.width * 0.78,
        size.height * 0.94,
        size.width,
        size.height * 0.88,
      )
      ..lineTo(size.width, size.height * 0.28)
      ..quadraticBezierTo(
        size.width * 0.48,
        size.height * 0.35,
        size.width * 0.36,
        size.height * 0.24,
      )
      ..close();
    canvas.drawPath(middlePath, accentPaint);

    final glowPaint = Paint()..color = Colors.white.withOpacity(0.18);
    canvas.drawCircle(Offset(size.width * 0.82, size.height * 0.16), 40, glowPaint);
    canvas.drawCircle(Offset(size.width * 0.18, size.height * 0.70), 28, glowPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
