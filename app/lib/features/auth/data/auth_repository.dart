import '../../../../core/api/client.dart';
import '../domain/otp_request_result.dart';

class AuthRepository {
  final ApiClient _client;

  AuthRepository(this._client);

  Future<OtpRequestResult> requestOtp(String mobile) async {
    final res = await _client.post('/auth/request-otp', {'mobile': mobile});
    return OtpRequestResult.fromJson(res);
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
