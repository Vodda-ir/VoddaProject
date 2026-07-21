import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../../../core/services/snackbar_service.dart';

/// OTP-based authentication against the backend.
class AuthRepository {
  AuthRepository(this._ref);
  final Ref _ref;

  Future<bool> requestOtp(String mobile) async {
    try {
      final dio = _ref.read(dioClientProvider).dio;
      await dio.post('/auth/request-otp', data: {'mobile': mobile});
      return true;
    } catch (error) {
      SnackBarService.showError(error);
      return false;
    }
  }

  /// Verifies the code, stores the encrypted session, and returns whether the
  /// profile still needs completing. Returns null on error.
  Future<bool?> verifyOtp(String mobile, String code) async {
    try {
      final client = _ref.read(dioClientProvider);
      final response = await client.dio.post(
        '/auth/verify-otp',
        data: {'mobile': mobile, 'code': code},
      );
      final data = response.data['data'] as Map<String, dynamic>;
      final user = data['user'] as Map<String, dynamic>? ?? const {};
      final role = user['role'] as String? ?? 'learner';
      await client.saveSession(data['token'] as String, role);
      return data['need_profile'] == true;
    } catch (error) {
      SnackBarService.showError(error);
      return null;
    }
  }

  Future<void> logout() => _ref.read(dioClientProvider).clearSession();
}

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(ref),
);
