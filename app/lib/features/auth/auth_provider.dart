import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/api/client.dart';
import 'domain/auth_state.dart';
import 'domain/otp_request_result.dart';
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
  static const _sessionStorageKey = 'vodda.auth.session';

  @override
  AuthState build() {
    _restoreSession();
    return const AuthState(initialized: false);
  }

  Future<OtpRequestResult> requestOtp(String mobile) async {
    return ref.read(authRepositoryProvider).requestOtp(mobile);
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
        initialized: true,
      );
      await _persistSession();
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
        initialized: true,
      );
      await _persistSession();
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
      await _persistSession();
    } catch (_) {
      // ignore on refresh
    }
  }

  Future<void> logout() async {
    ref.read(apiClientProvider).clearToken();
    state = const AuthState(initialized: true);
    final prefs = await _safePrefs();
    if (prefs == null) {
      return;
    }
    await prefs.remove(_sessionStorageKey);
  }

  Future<void> _restoreSession() async {
    final prefs = await _safePrefs();
    if (prefs == null) {
      ref.read(apiClientProvider).clearToken();
      state = const AuthState(initialized: true);
      return;
    }
    final raw = prefs.getString(_sessionStorageKey);
    if (raw == null || raw.isEmpty) {
      ref.read(apiClientProvider).clearToken();
      state = const AuthState(initialized: true);
      return;
    }

    try {
      final payload = jsonDecode(raw) as Map<String, dynamic>;
      final accessToken = payload['access_token'] as String?;
      final refreshToken = payload['refresh_token'] as String?;
      final userMap = payload['user'] as Map<String, dynamic>?;
      if (accessToken == null || accessToken.isEmpty || userMap == null) {
        ref.read(apiClientProvider).clearToken();
        state = const AuthState(initialized: true);
        await prefs.remove(_sessionStorageKey);
        return;
      }

      ref.read(apiClientProvider).setToken(accessToken);
      state = AuthState(
        accessToken: accessToken,
        refreshToken: refreshToken,
        user: AuthUser.fromJson(userMap),
        initialized: true,
      );
    } catch (_) {
      ref.read(apiClientProvider).clearToken();
      state = const AuthState(initialized: true);
      await prefs.remove(_sessionStorageKey);
    }
  }

  Future<void> _persistSession() async {
    if (!state.isAuthenticated || state.user == null || state.accessToken == null) {
      return;
    }

    final prefs = await _safePrefs();
    if (prefs == null) {
      return;
    }
    await prefs.setString(
      _sessionStorageKey,
      jsonEncode({
        'access_token': state.accessToken,
        'refresh_token': state.refreshToken,
        'user': state.user!.toJson(),
      }),
    );
  }

  Future<SharedPreferences?> _safePrefs() async {
    try {
      return await SharedPreferences.getInstance();
    } on MissingPluginException {
      return null;
    }
  }
}
