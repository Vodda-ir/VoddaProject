import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'network/dio_client.dart';

/// Overridden in main() once SharedPreferences has loaded.
final sharedPreferencesProvider = Provider<SharedPreferences>(
  (ref) => throw UnimplementedError('initialize in main()'),
);

final dioClientProvider = Provider<DioClient>(
  (ref) => DioClient(ref.watch(sharedPreferencesProvider)),
);
