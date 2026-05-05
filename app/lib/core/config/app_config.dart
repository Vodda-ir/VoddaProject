import 'package:flutter/foundation.dart';

class AppConfig {
  // Toggle this while developing against the local Laravel app in /web.
  static const bool debugApiMode = true;

  static const String _desktopLocalApiBaseUrl = 'http://127.0.0.1:8000/api';
  static const String _androidLocalApiBaseUrl = 'http://10.0.2.2:8000/api';
  static const String defaultApiBaseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://localhost:5566',
  );

  static String get apiBaseUrl {
    if (debugApiMode) {
      if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
        return _androidLocalApiBaseUrl;
      }

      return _desktopLocalApiBaseUrl;
    }

    return defaultApiBaseUrl;
  }
}
