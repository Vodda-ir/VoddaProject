/// Compile-time configuration. Override the API base URL with:
///   flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3420/api/v1
abstract class AppConfig {
  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    // 10.0.2.2 is the host machine from the Android emulator.
    defaultValue: 'http://10.0.2.2:3420/api/v1',
  );
}
