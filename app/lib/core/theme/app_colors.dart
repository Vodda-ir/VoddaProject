import 'package:flutter/material.dart';

/// Vodda palette — soft olive + earthy sand neutrals.
/// Mirrors docs/design/styles.css.
abstract class AppColors {
  // sand / warm neutrals
  static const sand50 = Color(0xFFFAF8F2);
  static const sand100 = Color(0xFFF4F0E7);
  static const sand150 = Color(0xFFEDE8DB);
  static const sand200 = Color(0xFFE4DDCC);
  static const surface = Color(0xFFFFFFFF);
  static const surfaceWarm = Color(0xFFFCFAF4);

  // olive
  static const olive900 = Color(0xFF2E3622);
  static const olive800 = Color(0xFF3C472B);
  static const olive700 = Color(0xFF4C5A36);
  static const olive600 = Color(0xFF5E6E43);
  static const olive500 = Color(0xFF728350);
  static const olive400 = Color(0xFF93A172);
  static const olive300 = Color(0xFFB6C09B);
  static const olive200 = Color(0xFFD6DCC4);
  static const olive100 = Color(0xFFE8ECDB);
  static const olive50 = Color(0xFFF2F5EA);

  // ink (warm near-black text)
  static const ink = Color(0xFF2A2820);
  static const ink2 = Color(0xFF565247);
  static const ink3 = Color(0xFF8C8675);
  static const ink4 = Color(0xFFABA593);

  // accents
  static const gold = Color(0xFFBF9540);
  static const goldSoft = Color(0xFFE7D5A8);
  static const goldBg = Color(0xFFF7EFD9);
  static const clay = Color(0xFFB0745A);
  static const clayBg = Color(0xFFF6E7DF);
  static const rose = Color(0xFFA65151);
  static const info = Color(0xFF5E7E8C);

  // status
  static const ok = olive600;
  static const pending = gold;
  static const danger = rose;
}
