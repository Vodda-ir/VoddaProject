import 'package:flutter/foundation.dart';

/// Compile-time configuration.
/// Debug mode uses localhost:3420; release connects to vodda.ir.
/// Override with: flutter run --dart-define=API_BASE_URL=https://vodda.ir/api/v1
abstract class AppConfig {
  static const _debugBaseUrl = 'http://localhost:3420/api/v1';
  static const _releaseBaseUrl = 'https://vodda.ir/api/v1';

  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: kReleaseMode ? _releaseBaseUrl : _debugBaseUrl,
  );
}
