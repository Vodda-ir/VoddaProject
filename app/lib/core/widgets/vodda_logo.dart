import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/app_colors.dart';

/// Draws the Vodda vector mark from the bundled SVG path using CustomPaint.
class VoddaLogo extends StatefulWidget {
  const VoddaLogo({
    super.key,
    this.color = AppColors.olive600,
    this.semanticsLabel = 'نشان ودا',
  });

  final Color color;
  final String semanticsLabel;

  @override
  State<VoddaLogo> createState() => _VoddaLogoState();
}

class _VoddaLogoState extends State<VoddaLogo> {
  static final Future<Path> _path = _loadPath();

  static Future<Path> _loadPath() async {
    final svg = await rootBundle.loadString('assets/images/vodda_logo.svg');
    final data = RegExp(
      r'<path\s+[^>]*d="([^"]+)"',
      dotAll: true,
    ).firstMatch(svg)?.group(1);

    if (data == null) {
      throw const FormatException('Vodda logo path was not found.');
    }

    final tokens = RegExp(
      r'[MLZ]|-?\d+(?:\.\d+)?',
    ).allMatches(data).map((match) => match.group(0)!).toList(growable: false);
    final path = Path();
    var index = 0;

    while (index < tokens.length) {
      switch (tokens[index++]) {
        case 'M':
          path.moveTo(
            double.parse(tokens[index++]),
            double.parse(tokens[index++]),
          );
          break;
        case 'L':
          path.lineTo(
            double.parse(tokens[index++]),
            double.parse(tokens[index++]),
          );
          break;
        case 'Z':
          path.close();
          break;
        default:
          throw const FormatException('Unsupported Vodda logo path command.');
      }
    }

    return path..fillType = PathFillType.evenOdd;
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      image: true,
      label: widget.semanticsLabel,
      child: FutureBuilder<Path>(
        future: _path,
        builder: (context, snapshot) {
          if (snapshot.hasError) return ErrorWidget(snapshot.error!);
          if (!snapshot.hasData) return const SizedBox.expand();
          return CustomPaint(
            painter: VoddaLogoPainter(
              path: snapshot.data!,
              color: widget.color,
            ),
          );
        },
      ),
    );
  }
}

class VoddaLogoPainter extends CustomPainter {
  VoddaLogoPainter({required this.path, required this.color});

  final Path path;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final bounds = path.getBounds();
    final widthScale = size.width / bounds.width;
    final heightScale = size.height / bounds.height;
    final fittedScale = widthScale < heightScale ? widthScale : heightScale;
    final dx = (size.width - bounds.width * fittedScale) / 2;
    final dy = (size.height - bounds.height * fittedScale) / 2;

    canvas
      ..save()
      ..translate(dx, dy)
      ..scale(fittedScale)
      ..translate(-bounds.left, -bounds.top)
      ..drawPath(path, Paint()..color = color)
      ..restore();
  }

  @override
  bool shouldRepaint(covariant VoddaLogoPainter oldDelegate) {
    return oldDelegate.path != path || oldDelegate.color != color;
  }
}
