import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';

class ApiClient {
  final String baseUrl;
  String? _accessToken;

  ApiClient({String? baseUrl}) : baseUrl = baseUrl ?? AppConfig.apiBaseUrl;

  void setToken(String token) => _accessToken = token;
  void clearToken() => _accessToken = null;

  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    final uri = _buildUri(path, queryParameters: queryParameters);
    final res = await http.get(uri, headers: headers);
    return _handleResponse(res);
  }

  Future<Map<String, dynamic>> post(
    String path,
    Map<String, dynamic> body, {
    Map<String, dynamic>? queryParameters,
  }) async {
    final uri = _buildUri(path, queryParameters: queryParameters);
    final res = await http.post(uri, headers: headers, body: jsonEncode(body));
    return _handleResponse(res);
  }

  Uri _buildUri(String path, {Map<String, dynamic>? queryParameters}) {
    final baseUri = Uri.parse(baseUrl);
    final normalizedPath = path.startsWith('/') ? path.substring(1) : path;

    final qp = <String, String>{
      ...baseUri.queryParameters,
      ...?queryParameters?.map((key, value) => MapEntry(key, value.toString())),
    };

    return baseUri.replace(
      path: '${baseUri.path.replaceFirst(RegExp(r'/$'), '')}/$normalizedPath',
      queryParameters: qp.isEmpty ? null : qp,
    );
  }

  Map<String, String> get headers => <String, String>{
        'Content-Type': 'application/json',
        if (_accessToken != null) 'Authorization': 'Bearer $_accessToken',
      };

  Map<String, dynamic> _handleResponse(http.Response res) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      if (res.body.isEmpty) return {};
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    throw ApiException.fromResponse(res.statusCode, res.body);
  }
}

class ApiException implements Exception {
  final int statusCode;
  final String body;
  final String message;

  ApiException(this.statusCode, this.body, this.message);

  factory ApiException.fromResponse(int statusCode, String body) {
    try {
      final decoded = jsonDecode(body);
      if (decoded is Map<String, dynamic>) {
        final message = (decoded['error'] ?? decoded['message'] ?? body).toString();
        return ApiException(statusCode, body, message);
      }
    } catch (_) {
      // fall through
    }

    return ApiException(statusCode, body, body.isEmpty ? 'درخواست با خطا مواجه شد.' : body);
  }

  @override
  String toString() => 'ApiException: $statusCode $message';
}
