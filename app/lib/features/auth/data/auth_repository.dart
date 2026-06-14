import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';

/// OTP-based authentication against the backend.
class AuthRepository {
  AuthRepository(this._ref);
  final Ref _ref;

  Future<void> requestOtp(String mobile) async {
    final dio = _ref.read(dioClientProvider).dio;
    await dio.post('/auth/request-otp', data: {'mobile': mobile});
  }

  /// Verifies the code, stores the token, and returns whether the profile
  /// still needs completing.
  Future<bool> verifyOtp(String mobile, String code) async {
    final client = _ref.read(dioClientProvider);
    final res = await client.dio.post('/auth/verify-otp', data: {
      'mobile': mobile,
      'code': code,
    });
    final data = res.data['data'] as Map<String, dynamic>;
    await client.saveToken(data['token'] as String);
    return data['need_profile'] == true;
  }

  Future<void> logout() => _ref.read(dioClientProvider).clearToken();
}

final authRepositoryProvider = Provider<AuthRepository>((ref) => AuthRepository(ref));
