import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../../../core/services/snackbar_service.dart';

/// OTP-based authentication against the backend.
class AuthRepository {
  AuthRepository(this._ref);
  final Ref _ref;

  /// Returns true if OTP was sent, false on error.
  Future<bool> requestOtp(String mobile) async {
    try {
      final dio = _ref.read(dioClientProvider).dio;
      await dio.post('/auth/request-otp', data: {'mobile': mobile});
      return true;
    } catch (e) {
      SnackBarService.showError(e);
      return false;
    }
  }

  /// Verifies the code, stores the token, and returns whether the profile
  /// still needs completing. Returns null on error.
  Future<bool?> verifyOtp(String mobile, String code) async {
    try {
      final client = _ref.read(dioClientProvider);
      final res = await client.dio.post(
        '/auth/verify-otp',
        data: {'mobile': mobile, 'code': code},
      );
      final data = res.data['data'] as Map<String, dynamic>;
      await client.saveToken(data['token'] as String);
      return data['need_profile'] == true;
    } catch (e) {
      SnackBarService.showError(e);
      return null;
    }
  }

  Future<void> logout() => _ref.read(dioClientProvider).clearToken();
}

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(ref),
);
