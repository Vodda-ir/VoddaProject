class AppConfig {
  // Toggle this while developing against the local Laravel app in /web.
  static const bool debugApiMode = true;

  static const String localDebugApiBaseUrl = 'http://localhost:8000/api';
  static const String defaultApiBaseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://localhost:5566',
  );

  static String get apiBaseUrl {
    if (debugApiMode) {
      return localDebugApiBaseUrl;
    }

    return defaultApiBaseUrl;
  }
}
