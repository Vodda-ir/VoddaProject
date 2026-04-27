import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

enum AuthHeroVariant {
  mobile,
  otp,
}

class AuthFlowScaffold extends StatelessWidget {
  final String title;
  final String subtitle;
  final AuthHeroVariant heroVariant;
  final Widget content;

  const AuthFlowScaffold({
    super.key,
    required this.title,
    required this.subtitle,
    required this.heroVariant,
    required this.content,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: const Color(0xFFF1F3F8),
      body: Stack(
        children: [
          Positioned.fill(
            child: CustomPaint(
              painter: _AuthBackdropPainter(
                primary: theme.colorScheme.primary,
                secondary: const Color(0xFFE5E9F2),
              ),
            ),
          ),
          SafeArea(
            child: LayoutBuilder(
              builder: (context, constraints) {
                return SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(minHeight: constraints.maxHeight - 40),
                    child: Center(
                      child: Container(
                        width: 400,
                        padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(30),
                          boxShadow: const [
                            BoxShadow(
                              color: Color(0x24082030),
                              blurRadius: 28,
                              offset: Offset(0, 16),
                            ),
                          ],
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const SizedBox(height: 4),
                            AuthHeroBadge(variant: heroVariant),
                            const SizedBox(height: 10),
                            Center(
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 7,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFEAF8EE),
                                  borderRadius: BorderRadius.circular(999),
                                  border: Border.all(
                                    color: const Color(0xFFCFEAD6),
                                  ),
                                ),
                                child: Text(
                                  heroVariant == AuthHeroVariant.mobile
                                      ? 'مرحله ۱ از ۲'
                                      : 'مرحله ۲ از ۲',
                                  style: theme.textTheme.labelLarge?.copyWith(
                                    color: const Color(0xFF23894A),
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 14),
                            Text(
                              title,
                              textAlign: TextAlign.center,
                              style: theme.textTheme.headlineSmall?.copyWith(
                                color: const Color(0xFF10224A),
                                fontWeight: FontWeight.w800,
                                fontSize: 26,
                                height: 1.18,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              subtitle,
                              textAlign: TextAlign.center,
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: const Color(0xFF687387),
                                fontSize: 14,
                                height: 1.7,
                              ),
                            ),
                            const SizedBox(height: 22),
                            content,
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class AuthHeroBadge extends StatelessWidget {
  final AuthHeroVariant variant;

  const AuthHeroBadge({
    super.key,
    required this.variant,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 144,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CustomPaint(
            size: const Size(188, 144),
            painter: _HeroPlatePainter(variant: variant),
          ),
          Container(
            width: 92,
            height: 92,
            padding: const EdgeInsets.all(15),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: const LinearGradient(
                colors: [Color(0xFF37E173), Color(0xFF178C44)],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x4D2FD66A),
                  blurRadius: 22,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
              ),
              padding: const EdgeInsets.all(14),
              child: Image.asset('assets/images/logo.png'),
            ),
          ),
        ],
      ),
    );
  }
}

class AuthPrimaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;

  const AuthPrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 52,
      child: DecoratedBox(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          gradient: const LinearGradient(
            colors: [Color(0xFF299848), Color(0xFF38E06D)],
          ),
          boxShadow: const [
            BoxShadow(
              color: Color(0x3325B65B),
              blurRadius: 24,
              offset: Offset(0, 12),
            ),
          ],
        ),
        child: FilledButton(
          onPressed: onPressed,
          style: FilledButton.styleFrom(
            backgroundColor: Colors.transparent,
            shadowColor: Colors.transparent,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 18),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(18),
            ),
          ),
          child: FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              label,
              textAlign: TextAlign.center,
              maxLines: 1,
              style: const TextStyle(
                fontFamily: 'IranYekan',
                fontSize: 16,
                fontWeight: FontWeight.w700,
                letterSpacing: 0,
                height: 1.1,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class AuthPhoneField extends StatelessWidget {
  final TextEditingController controller;
  final bool enabled;

  const AuthPhoneField({
    super.key,
    required this.controller,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.ltr,
      child: TextField(
        controller: controller,
        enabled: enabled,
        keyboardType: TextInputType.phone,
        inputFormatters: [
          FilteringTextInputFormatter.digitsOnly,
          LengthLimitingTextInputFormatter(11),
        ],
        style: const TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.6,
          color: Color(0xFF17302B),
        ),
        decoration: InputDecoration(
          filled: true,
          fillColor: const Color(0xFFEAF8EE),
          hintText: '0912 345 6789',
          hintStyle: TextStyle(
            fontSize: 18,
            color: const Color(0xFF758294).withOpacity(0.65),
            letterSpacing: 0.4,
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(18),
            borderSide: const BorderSide(color: Color(0xFFD3EAD7)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(18),
            borderSide: const BorderSide(color: Color(0xFFD3EAD7)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(18),
            borderSide: const BorderSide(
              color: Color(0xFF2BC95E),
              width: 1.6,
            ),
          ),
          prefixIcon: Container(
            alignment: Alignment.center,
            width: 74,
            margin: const EdgeInsets.symmetric(vertical: 10),
            decoration: const BoxDecoration(
              border: Border(
                right: BorderSide(color: Color(0xFFBED8C5)),
              ),
            ),
            child: const Text(
              '+98',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: Color(0xFF6B7B8E),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class OtpCodeField extends StatefulWidget {
  final TextEditingController controller;
  final ValueChanged<String>? onChanged;
  final bool enabled;
  final int length;

  const OtpCodeField({
    super.key,
    required this.controller,
    this.onChanged,
    this.enabled = true,
    this.length = 5,
  });

  @override
  State<OtpCodeField> createState() => _OtpCodeFieldState();
}

class _OtpCodeFieldState extends State<OtpCodeField> {
  late final FocusNode _focusNode;

  @override
  void initState() {
    super.initState();
    _focusNode = FocusNode();
    widget.controller.addListener(_rebuild);
  }

  @override
  void dispose() {
    widget.controller.removeListener(_rebuild);
    _focusNode.dispose();
    super.dispose();
  }

  void _rebuild() {
    if (mounted) {
      setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    final value = widget.controller.text;

    return GestureDetector(
      onTap: widget.enabled ? () => _focusNode.requestFocus() : null,
      child: Directionality(
        textDirection: TextDirection.ltr,
        child: Stack(
          children: [
            Opacity(
              opacity: 0.02,
              child: TextField(
                controller: widget.controller,
                focusNode: _focusNode,
                enabled: widget.enabled,
                autofocus: true,
                keyboardType: TextInputType.number,
                maxLength: widget.length,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(widget.length),
                ],
                onChanged: widget.onChanged,
                decoration: const InputDecoration(
                  counterText: '',
                  border: InputBorder.none,
                ),
              ),
            ),
            IgnorePointer(
              child: Row(
                children: List.generate(widget.length, (index) {
                  final hasValue = index < value.length;
                  final char = hasValue ? value[index] : '';
                  final isCurrent = value.length == index && value.length < widget.length;

                  return Expanded(
                    child: Padding(
                      padding: EdgeInsets.only(left: index == widget.length - 1 ? 0 : 10),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 180),
                        height: 60,
                        decoration: BoxDecoration(
                          color: const Color(0xFFE9F8EC),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: isCurrent
                                ? const Color(0xFF29C55B)
                                : const Color(0xFFCAE9D1),
                            width: isCurrent ? 1.6 : 1,
                          ),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          char,
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF10224A),
                          ),
                        ),
                      ),
                    ),
                  );
                }),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AuthBackdropPainter extends CustomPainter {
  final Color primary;
  final Color secondary;

  const _AuthBackdropPainter({
    required this.primary,
    required this.secondary,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final topPaint = Paint()..color = primary;
    final topPath = Path()
      ..moveTo(0, 0)
      ..lineTo(0, size.height * 0.22)
      ..lineTo(size.width * 0.42, size.height * 0.22)
      ..quadraticBezierTo(
        size.width * 0.47,
        size.height * 0.30,
        size.width * 0.60,
        size.height * 0.28,
      )
      ..lineTo(size.width, size.height * 0.26)
      ..lineTo(size.width, 0)
      ..close();
    canvas.drawPath(topPath, topPaint);

    final centerPaint = Paint()..color = secondary;
    final centerPath = Path()
      ..moveTo(0, size.height * 0.22)
      ..lineTo(0, size.height * 0.84)
      ..quadraticBezierTo(
        size.width * 0.18,
        size.height * 0.80,
        size.width * 0.34,
        size.height * 0.84,
      )
      ..quadraticBezierTo(
        size.width * 0.72,
        size.height * 0.98,
        size.width,
        size.height * 0.90,
      )
      ..lineTo(size.width, size.height * 0.26)
      ..lineTo(size.width * 0.60, size.height * 0.28)
      ..quadraticBezierTo(
        size.width * 0.47,
        size.height * 0.30,
        size.width * 0.42,
        size.height * 0.22,
      )
      ..close();
    canvas.drawPath(centerPath, centerPaint);

    final bottomPath = Path()
      ..moveTo(0, size.height * 0.88)
      ..quadraticBezierTo(
        size.width * 0.22,
        size.height * 0.84,
        size.width * 0.38,
        size.height,
      )
      ..lineTo(0, size.height)
      ..close();
    canvas.drawPath(bottomPath, topPaint);

    final darkPaint = Paint()..color = const Color(0xFF2E8B45);
    canvas.drawRect(
      Rect.fromLTWH(0, size.height - 18, size.width, 18),
      darkPaint,
    );

    final bubblePaint = Paint()..color = Colors.white.withOpacity(0.14);
    canvas.drawCircle(Offset(size.width * 0.88, size.height * 0.12), 38, bubblePaint);
    canvas.drawCircle(Offset(size.width * 0.80, size.height * 0.72), 22, bubblePaint);
  }

  @override
  bool shouldRepaint(covariant _AuthBackdropPainter oldDelegate) {
    return oldDelegate.primary != primary || oldDelegate.secondary != secondary;
  }
}

class _HeroPlatePainter extends CustomPainter {
  final AuthHeroVariant variant;

  const _HeroPlatePainter({
    required this.variant,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final shadowPaint = Paint()
      ..color = const Color(0x33102820)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 20);
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(size.width * 0.52, size.height * 0.70),
        width: size.width * 0.65,
        height: 26,
      ),
      shadowPaint,
    );

    if (variant == AuthHeroVariant.mobile) {
      final plate = Path()
        ..moveTo(size.width * 0.24, size.height * 0.18)
        ..lineTo(size.width * 0.76, size.height * 0.12)
        ..quadraticBezierTo(size.width * 0.84, size.height * 0.10, size.width * 0.86, size.height * 0.18)
        ..lineTo(size.width * 0.82, size.height * 0.78)
        ..quadraticBezierTo(size.width * 0.80, size.height * 0.88, size.width * 0.70, size.height * 0.88)
        ..lineTo(size.width * 0.26, size.height * 0.82)
        ..quadraticBezierTo(size.width * 0.16, size.height * 0.80, size.width * 0.16, size.height * 0.68)
        ..lineTo(size.width * 0.20, size.height * 0.24)
        ..close();

      canvas.save();
      canvas.translate(size.width * 0.05, 0);
      canvas.rotate(-0.14);
      canvas.drawPath(plate, Paint()..color = const Color(0xFF253028));
      canvas.drawPath(
        plate,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 7
          ..color = const Color(0xFF2ED063),
      );
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(size.width * 0.30, size.height * 0.26, size.width * 0.36, size.height * 0.38),
          const Radius.circular(12),
        ),
        Paint()..color = const Color(0xFF1A201C),
      );
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(size.width * 0.30, size.height * 0.26, size.width * 0.36, size.height * 0.38),
          const Radius.circular(12),
        ),
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 3
          ..color = const Color(0xFF36D96D),
      );
      _drawCalligraphicStrokes(canvas, size);
      canvas.restore();
    } else {
      final ringRect = Rect.fromCenter(
        center: Offset(size.width * 0.50, size.height * 0.46),
        width: size.width * 0.66,
        height: size.height * 0.62,
      );
      canvas.drawArc(
        ringRect,
        -1.0,
        4.5,
        false,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeCap = StrokeCap.round
          ..strokeWidth = 18
          ..color = const Color(0x332CC85E),
      );
      canvas.drawArc(
        ringRect,
        -0.8,
        3.8,
        false,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeCap = StrokeCap.round
          ..strokeWidth = 10
          ..color = const Color(0xFF2FD565),
      );

      final wavePaint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round
        ..strokeWidth = 7
        ..color = const Color(0xFF17302B);
      final wave = Path()
        ..moveTo(size.width * 0.22, size.height * 0.66)
        ..quadraticBezierTo(size.width * 0.34, size.height * 0.56, size.width * 0.42, size.height * 0.66)
        ..quadraticBezierTo(size.width * 0.50, size.height * 0.76, size.width * 0.60, size.height * 0.60)
        ..quadraticBezierTo(size.width * 0.67, size.height * 0.48, size.width * 0.76, size.height * 0.56);
      canvas.drawPath(wave, wavePaint);

      for (final offset in [
        Offset(size.width * 0.20, size.height * 0.30),
        Offset(size.width * 0.78, size.height * 0.22),
        Offset(size.width * 0.82, size.height * 0.70),
      ]) {
        canvas.drawCircle(offset, 7, Paint()..color = const Color(0xFF2FD565));
        canvas.drawCircle(offset, 13, Paint()..color = const Color(0x332FD565));
      }
    }
  }

  void _drawCalligraphicStrokes(Canvas canvas, Size size) {
    final stroke = Paint()
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = 5
      ..color = const Color(0xFF2FD565);

    final pathA = Path()
      ..moveTo(size.width * 0.36, size.height * 0.46)
      ..quadraticBezierTo(size.width * 0.48, size.height * 0.34, size.width * 0.58, size.height * 0.46)
      ..quadraticBezierTo(size.width * 0.48, size.height * 0.56, size.width * 0.38, size.height * 0.50);
    final pathB = Path()
      ..moveTo(size.width * 0.40, size.height * 0.58)
      ..quadraticBezierTo(size.width * 0.52, size.height * 0.66, size.width * 0.62, size.height * 0.52);

    canvas.drawPath(pathA, stroke);
    canvas.drawPath(pathB, stroke);
    canvas.drawLine(
      Offset(size.width * 0.62, size.height * 0.34),
      Offset(size.width * 0.62, size.height * 0.62),
      stroke,
    );
    canvas.drawLine(
      Offset(size.width * 0.66, size.height * 0.36),
      Offset(size.width * 0.66, size.height * 0.60),
      stroke,
    );
  }

  @override
  bool shouldRepaint(covariant _HeroPlatePainter oldDelegate) {
    return oldDelegate.variant != variant;
  }
}
