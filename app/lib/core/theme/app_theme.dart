import 'package:flutter/material.dart';

final _colorScheme = ColorScheme.fromSeed(
  seedColor: const Color(0xFF28B553),
  brightness: Brightness.light,
);

final appTheme = ThemeData(
  useMaterial3: true,
  colorScheme: _colorScheme,
  scaffoldBackgroundColor: const Color(0xFFF1F3F8),
  fontFamily: 'IranYekan',
  appBarTheme: AppBarTheme(
    centerTitle: true,
    backgroundColor: const Color(0xFFF1F3F8),
    foregroundColor: const Color(0xFF17302B),
    elevation: 0,
    scrolledUnderElevation: 0,
    titleTextStyle: TextStyle(
      fontFamily: 'IranYekan',
      fontSize: 20,
      fontWeight: FontWeight.w700,
      color: _colorScheme.onSurface,
    ),
  ),
  inputDecorationTheme: InputDecorationTheme(
    filled: true,
    fillColor: Colors.white.withOpacity(0.9),
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(16),
      borderSide: BorderSide(color: _colorScheme.outlineVariant),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(16),
      borderSide: BorderSide(color: _colorScheme.outlineVariant),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(16),
      borderSide: BorderSide(color: _colorScheme.primary, width: 1.4),
    ),
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
  ),
  cardTheme: CardThemeData(
    color: Colors.white.withOpacity(0.92),
    elevation: 0,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(20),
      side: BorderSide(color: _colorScheme.outlineVariant),
    ),
    margin: EdgeInsets.zero,
  ),
  listTileTheme: const ListTileThemeData(
    contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 6),
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.all(Radius.circular(16)),
    ),
  ),
  snackBarTheme: SnackBarThemeData(
    behavior: SnackBarBehavior.floating,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
  ),
);
