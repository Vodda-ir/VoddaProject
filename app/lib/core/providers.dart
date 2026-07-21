import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'network/dio_client.dart';

/// Overridden in main() once application storage has loaded.
final sharedPreferencesProvider = Provider<SharedPreferences>(
  (ref) => throw UnimplementedError('initialize in main()'),
);

final secureStorageProvider = Provider<FlutterSecureStorage>(
  (ref) => throw UnimplementedError('initialize in main()'),
);

final initialTokenProvider = Provider<String?>(
  (ref) => throw UnimplementedError('initialize in main()'),
);

final dioClientProvider = Provider<DioClient>(
  (ref) => DioClient(
    ref.watch(sharedPreferencesProvider),
    ref.watch(secureStorageProvider),
    ref.watch(initialTokenProvider),
  ),
);
