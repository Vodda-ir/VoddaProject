import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../config/app_config.dart';
import '../services/snackbar_service.dart';

const _tokenKey = 'vodda_token';
const _roleKey = 'user_role';

/// A thin Dio wrapper that attaches the auth token. JWTs are held in memory and
/// persisted only through platform secure storage; SharedPreferences contains
/// non-sensitive navigation preferences such as the current role.
class DioClient {
  DioClient(this._prefs, this._secureStorage, String? initialToken)
    : _token = initialToken,
      dio = Dio(
        BaseOptions(
          baseUrl: AppConfig.apiBaseUrl,
          connectTimeout: const Duration(seconds: 15),
          receiveTimeout: const Duration(seconds: 20),
          headers: {'Content-Type': 'application/json'},
        ),
      ) {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final token = _token;
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) {
          if (_isConnectivityError(error)) {
            SnackBarService.showError(error);
          }
          if (error.response?.statusCode == 401 && _token != null) {
            unawaited(clearSession());
          }
          handler.next(error);
        },
      ),
    );
  }

  final Dio dio;
  final SharedPreferences _prefs;
  final FlutterSecureStorage _secureStorage;
  String? _token;

  String? get token => _token;
  bool get isAuthed => (_token ?? '').isNotEmpty;
  String get role => _prefs.getString(_roleKey) ?? 'learner';
  bool get canUseTeacherPanel => role == 'teacher' || role == 'admin';

  Future<void> saveSession(String token, String role) async {
    _token = token;
    await _secureStorage.write(key: _tokenKey, value: token);
    await _prefs.setString(_roleKey, role);
    await _prefs.setString(
      'last_role',
      role == 'teacher' || role == 'admin' ? 'teacher' : 'learner',
    );
  }

  Future<void> saveToken(String token) => saveSession(token, role);

  Future<void> clearSession() async {
    _token = null;
    await _secureStorage.delete(key: _tokenKey);
    await _prefs.remove(_roleKey);
    await _prefs.remove('last_role');
  }

  Future<void> clearToken() => clearSession();

  static bool _isConnectivityError(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.connectionError:
        return true;
      case DioExceptionType.badResponse:
      case DioExceptionType.cancel:
      case DioExceptionType.badCertificate:
        return false;
      default:
        return e.error != null &&
            e.error.runtimeType.toString().contains('SocketException');
    }
  }
}
