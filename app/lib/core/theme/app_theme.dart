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
  visualDensity: VisualDensity.adaptivePlatformDensity,
  textTheme: const TextTheme(
    displaySmall: TextStyle(
      fontFamily: 'IranYekan',
      fontSize: 28,
      fontWeight: FontWeight.w900,
      color: Color(0xFF11254B),
    ),
    headlineMedium: TextStyle(
      fontFamily: 'IranYekan',
      fontSize: 22,
      fontWeight: FontWeight.w900,
      color: Color(0xFF11254B),
    ),
    headlineSmall: TextStyle(
      fontFamily: 'IranYekan',
      fontSize: 20,
      fontWeight: FontWeight.w800,
      color: Color(0xFF11254B),
    ),
    titleLarge: TextStyle(
      fontFamily: 'IranYekan',
      fontSize: 18,
      fontWeight: FontWeight.w800,
      color: Color(0xFF11254B),
    ),
    titleMedium: TextStyle(
      fontFamily: 'IranYekan',
      fontSize: 16,
      fontWeight: FontWeight.w700,
      color: Color(0xFF11254B),
    ),
    titleSmall: TextStyle(
      fontFamily: 'IranYekan',
      fontSize: 14,
      fontWeight: FontWeight.w700,
      color: Color(0xFF11254B),
    ),
    bodyLarge: TextStyle(
      fontFamily: 'IranYekan',
      fontSize: 15,
      height: 1.7,
      color: Color(0xFF11254B),
    ),
    bodyMedium: TextStyle(
      fontFamily: 'IranYekan',
      fontSize: 14,
      height: 1.7,
      color: Color(0xFF5F6D84),
    ),
    bodySmall: TextStyle(
      fontFamily: 'IranYekan',
      fontSize: 12,
      height: 1.6,
      color: Color(0xFF7B8799),
    ),
    labelLarge: TextStyle(
      fontFamily: 'IranYekan',
      fontSize: 14,
      fontWeight: FontWeight.w700,
      color: Color(0xFF11254B),
    ),
    labelMedium: TextStyle(
      fontFamily: 'IranYekan',
      fontSize: 12,
      fontWeight: FontWeight.w700,
      color: Color(0xFF5F6D84),
    ),
    labelSmall: TextStyle(
      fontFamily: 'IranYekan',
      fontSize: 11,
      fontWeight: FontWeight.w600,
      color: Color(0xFF7B8799),
    ),
  ),
  appBarTheme: AppBarTheme(
    centerTitle: true,
    backgroundColor: const Color(0xFFF1F3F8),
    foregroundColor: const Color(0xFF17302B),
    elevation: 0,
    scrolledUnderElevation: 0,
    titleTextStyle: TextStyle(
      fontFamily: 'IranYekan',
      fontSize: 18,
      fontWeight: FontWeight.w700,
      color: _colorScheme.onSurface,
    ),
  ),
  filledButtonTheme: FilledButtonThemeData(
    style: FilledButton.styleFrom(
      backgroundColor: const Color(0xFF2F9446),
      foregroundColor: Colors.white,
      textStyle: const TextStyle(
        fontFamily: 'IranYekan',
        fontWeight: FontWeight.w800,
        fontSize: 15,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
    ),
  ),
  outlinedButtonTheme: OutlinedButtonThemeData(
    style: OutlinedButton.styleFrom(
      foregroundColor: const Color(0xFF2F9446),
      side: const BorderSide(color: Color(0xFF2F9446)),
      textStyle: const TextStyle(
        fontFamily: 'IranYekan',
        fontWeight: FontWeight.w800,
        fontSize: 15,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
    ),
  ),
  chipTheme: ChipThemeData(
    backgroundColor: Colors.white,
    selectedColor: const Color(0xFF2F9446),
    labelStyle: const TextStyle(
      fontFamily: 'IranYekan',
      fontWeight: FontWeight.w700,
    ),
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(999),
    ),
  ),
  inputDecorationTheme: InputDecorationTheme(
    filled: true,
    fillColor: Colors.white.withOpacity(0.96),
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(18),
      borderSide: BorderSide(color: _colorScheme.outlineVariant),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(18),
      borderSide: BorderSide(color: _colorScheme.outlineVariant),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(18),
      borderSide: BorderSide(color: _colorScheme.primary, width: 1.4),
    ),
    labelStyle: const TextStyle(
      fontFamily: 'IranYekan',
      fontSize: 14,
      fontWeight: FontWeight.w700,
    ),
    hintStyle: const TextStyle(
      fontFamily: 'IranYekan',
      fontSize: 14,
      color: Color(0xFF97A2B3),
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
