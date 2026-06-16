import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../config/app_config.dart';
import '../services/snackbar_service.dart';

const _tokenKey = 'vodda_token';

/// A thin Dio wrapper that attaches the auth token and persists it.
class DioClient {
  DioClient(this._prefs)
    : dio = Dio(
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
          final token = _prefs.getString(_tokenKey);
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) {
          // Show a SnackBar for connectivity errors so the user always gets
          // immediate feedback, even for calls not wrapped in try-catch.
          if (_isConnectivityError(error)) {
            SnackBarService.showError(error);
          }
          handler.next(error);
        },
      ),
    );
  }

  final Dio dio;
  final SharedPreferences _prefs;

  String? get token => _prefs.getString(_tokenKey);
  bool get isAuthed => (token ?? '').isNotEmpty;

  Future<void> saveToken(String token) => _prefs.setString(_tokenKey, token);
  Future<void> clearToken() => _prefs.remove(_tokenKey);

  /// Returns true for errors that are clearly connectivity-related and
  /// warrant an immediate SnackBar notification.
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
        // e.error might be a SocketException
        return e.error != null &&
            e.error.runtimeType.toString().contains('SocketException');
    }
  }
}
