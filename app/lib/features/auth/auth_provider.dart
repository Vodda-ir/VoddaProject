import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'domain/auth_state.dart';
import 'data/auth_repository.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository();
});

final authStateProvider = NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);

class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() => const AuthState();

  Future<void> requestOtp(String mobile) async {
    await ref.read(authRepositoryProvider).requestOtp(mobile);
  }

  Future<void> verifyOtp(String mobile, String code) async {
    final res = await ref.read(authRepositoryProvider).verifyOtp(mobile, code);
    state = AuthState(
      accessToken: res['access_token'] as String?,
      refreshToken: res['refresh_token'] as String?,
    );
  }

  void logout() {
    state = const AuthState();
  }
}
