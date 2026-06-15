import 'dart:io';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../config/app_config.dart';
import '../theme/app_colors.dart';

/// Vodda-styled default avatar with geometric olive pattern.
/// Never shows blue — always olive/sand tones.
/// Defaults to a line-art person icon when no image is provided.
class VoddaAvatar extends StatelessWidget {
  const VoddaAvatar({
    super.key,
    this.size = 48,
    this.ring = false,
    this.verified = false,
    this.online = false,
    this.icon,
    this.imageUrl,
    this.localPath,
  });

  final double size;
  final bool ring;
  final bool verified;
  final bool online;
  final IconData? icon;
  final String? imageUrl;
  final String? localPath;

  /// Converts a relative URL (e.g. /uploads/avatars/x.jpg) to an absolute
  /// URL with the server base (e.g. http://localhost:3420/uploads/avatars/x.jpg).
  static String _fullUrl(String path) {
    if (path.startsWith('http')) return path;
    return '${AppConfig.serverBaseUrl}$path';
  }

  @override
  Widget build(BuildContext context) {
    final lineIcon = icon ?? LucideIcons.user;
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(
              color: ring ? AppColors.olive400 : AppColors.sand200,
              width: ring ? 2 : 1,
            ),
            boxShadow: ring
                ? [
                    const BoxShadow(
                      color: AppColors.sand50,
                      blurRadius: 0,
                      spreadRadius: 3,
                    ),
                  ]
                : null,
          ),
          clipBehavior: Clip.antiAlias,
          child: Stack(
            children: [
              // Patterned background
              if (localPath != null)
                Padding(
                  padding: EdgeInsets.all(size * 0.06),
                  child: ClipOval(
                    child: Image.file(
                      File(localPath!),
                      fit: BoxFit.cover,
                      width: size,
                      height: size,
                      errorBuilder: (_, e, s) => _GeoPlaceholder(size: size),
                    ),
                  ),
                )
              else if (imageUrl != null)
                Padding(
                  padding: EdgeInsets.all(size * 0.06),
                  child: ClipOval(
                    child: Image.network(
                      _fullUrl(imageUrl!),
                      fit: BoxFit.cover,
                      width: size,
                      height: size,
                      errorBuilder: (_, e, s) => _GeoPlaceholder(size: size),
                    ),
                  ),
                )
              else
                _GeoPlaceholder(size: size),
              // Line-icon overlay — only when no image is shown
              if (localPath == null && imageUrl == null)
                Center(
                  child: Icon(
                    lineIcon,
                    size: size * 0.46,
                    color: AppColors.olive400.withValues(alpha: 0.50),
                  ),
                ),
            ],
          ),
        ),
        // Verified badge
        if (verified)
          Positioned(
            bottom: -2,
            right: -2,
            child: _badge(LucideIcons.check, AppColors.olive600),
          ),
        // Online indicator
        if (online)
          Positioned(
            top: 0,
            right: 0,
            child: Container(
              width: size * 0.23,
              height: size * 0.23,
              decoration: BoxDecoration(
                color: const Color(0xFF5BB56B),
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.surface, width: 2),
              ),
            ),
          ),
      ],
    );
  }

  Widget _badge(IconData icon, Color bg) {
    final badgeSize = (size * 0.38).clamp(16.0, double.infinity);
    return Container(
      width: badgeSize,
      height: badgeSize,
      decoration: BoxDecoration(
        color: bg,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.surface, width: 2),
      ),
      child: Icon(icon, size: badgeSize * 0.55, color: Colors.white),
    );
  }
}

/// Geometric striped placeholder — olive diagonal stripes + subtle 8-point star.
class _GeoPlaceholder extends StatelessWidget {
  const _GeoPlaceholder({required this.size});
  final double size;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(size: Size(size, size), painter: _StripedGeoPainter());
  }
}

class _StripedGeoPainter extends CustomPainter {
  _StripedGeoPainter();

  static const _color1 = AppColors.olive100;
  static const _color2 = AppColors.olive50;
  static const _accent = AppColors.olive400;
  static const _stripeW = 10.0;

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final cx = w / 2;
    final cy = h / 2;

    // Clip to circle
    canvas.clipPath(Path()..addOval(Rect.fromLTWH(0, 0, w, h)));

    // Diagonal stripes (135°)
    final diag = (w + h) * 1.5;
    final p1 = Paint()..color = _color1;
    final p2 = Paint()..color = _color2;

    for (double d = -diag; d < diag * 2; d += _stripeW * 2) {
      canvas.drawPath(
        Path()
          ..moveTo(d, 0)
          ..lineTo(d + diag, diag)
          ..lineTo(d + diag - _stripeW, diag)
          ..lineTo(d - _stripeW, 0)
          ..close(),
        p1,
      );
      canvas.drawPath(
        Path()
          ..moveTo(d + _stripeW, 0)
          ..lineTo(d + diag + _stripeW, diag)
          ..lineTo(d + diag, diag)
          ..lineTo(d, 0)
          ..close(),
        p2,
      );
    }

    // Subtle 8-point geometric star (Vodda motif)
    final starR = w * 0.14;
    final starPaint = Paint()
      ..color = _accent.withValues(alpha: 0.16)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.7;

    final outerR = starR * 2.0;
    final innerR = starR;

    final outerP = Path();
    final innerP = Path();

    for (int i = 0; i < 8; i++) {
      final a = (i * 45 - 90) * math.pi / 180;
      final ia = (i * 45 - 90 + 22.5) * math.pi / 180;

      final ox = cx + outerR * math.cos(a);
      final oy = cy + outerR * math.sin(a);
      final ix = cx + innerR * math.cos(ia);
      final iy = cy + innerR * math.sin(ia);

      if (i == 0) {
        outerP.moveTo(ox, oy);
        innerP.moveTo(ix, iy);
      } else {
        outerP.lineTo(ox, oy);
        innerP.lineTo(ix, iy);
      }

      // Fill triangle between outer & inner star
      final nia = ((i + 1) * 45 - 90 + 22.5) * math.pi / 180;
      final nix = cx + innerR * math.cos(nia);
      final niy = cy + innerR * math.sin(nia);
      canvas.drawPath(
        Path()
          ..moveTo(ox, oy)
          ..lineTo(ix, iy)
          ..lineTo(nix, niy)
          ..close(),
        Paint()..color = _accent.withValues(alpha: 0.07),
      );
    }
    outerP.close();
    innerP.close();

    canvas.drawPath(outerP, starPaint);
    canvas.drawPath(innerP, starPaint);
  }

  @override
  bool shouldRepaint(covariant _StripedGeoPainter oldD) => false;
}
