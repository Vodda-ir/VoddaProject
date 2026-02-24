import '../../../../core/api/client.dart';

class AuthRepository {
  final ApiClient _client;

  AuthRepository(this._client);

  Future<void> requestOtp(String mobile) async {
    await _client.post('/auth/request-otp', {'mobile': mobile});
  }

  Future<Map<String, dynamic>> verifyOtp(String mobile, String code) async {
    return _client.post('/auth/verify-otp', {'mobile': mobile, 'code': code});
  }

  Future<Map<String, dynamic>> getMe() async {
    return _client.get('/me');
  }

  Future<Map<String, dynamic>> setActiveRole(String role) async {
    return _client.post('/me/active-role', {'role': role});
  }
}
