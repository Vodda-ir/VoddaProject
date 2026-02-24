import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/client.dart';
import 'domain/auth_state.dart';
import 'data/auth_repository.dart';

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient();
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.watch(apiClientProvider));
});

final authStateProvider = NotifierProvider<AuthNotifier, AuthState>(
  AuthNotifier.new,
);

class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() => const AuthState();

  Future<void> requestOtp(String mobile) async {
    await ref.read(authRepositoryProvider).requestOtp(mobile);
  }

  Future<void> verifyOtp(String mobile, String code) async {
    state = state.copyWith(loading: true);
    try {
      final authRepo = ref.read(authRepositoryProvider);
      final res = await authRepo.verifyOtp(mobile, code);

      final accessToken = res['access_token'] as String?;
      final refreshToken = res['refresh_token'] as String?;
      if (accessToken == null || accessToken.isEmpty) {
        state = state.copyWith(loading: false);
        return;
      }

      ref.read(apiClientProvider).setToken(accessToken);
      final me = await authRepo.getMe();
      state = AuthState(
        accessToken: accessToken,
        refreshToken: refreshToken,
        user: AuthUser.fromJson(me),
        loading: false,
      );
    } catch (_) {
      state = state.copyWith(loading: false);
      rethrow;
    }
  }

  Future<bool> switchRole(String role) async {
    if (!state.isAuthenticated) return false;
    state = state.copyWith(loading: true);
    try {
      final res = await ref.read(authRepositoryProvider).setActiveRole(role);
      final accessToken = res['access_token'] as String?;
      if (accessToken == null || accessToken.isEmpty) {
        state = state.copyWith(loading: false);
        return false;
      }
      ref.read(apiClientProvider).setToken(accessToken);
      final me = await ref.read(authRepositoryProvider).getMe();
      state = state.copyWith(
        accessToken: accessToken,
        refreshToken: (res['refresh_token'] as String?) ?? state.refreshToken,
        user: AuthUser.fromJson(me),
        loading: false,
      );
      return true;
    } catch (_) {
      state = state.copyWith(loading: false);
      return false;
    }
  }

  Future<void> refreshMe() async {
    if (state.accessToken == null || state.accessToken!.isEmpty) return;
    try {
      ref.read(apiClientProvider).setToken(state.accessToken!);
      final me = await ref.read(authRepositoryProvider).getMe();
      state = state.copyWith(user: AuthUser.fromJson(me));
    } catch (_) {
      // ignore on refresh
    }
  }

  void logout() {
    ref.read(apiClientProvider).clearToken();
    state = const AuthState();
  }
}
