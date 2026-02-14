import '../../../../core/api/client.dart';

class AuthRepository {
  final ApiClient _client = ApiClient();

  Future<void> requestOtp(String mobile) async {
    await _client.post('/auth/request-otp', {'mobile': mobile});
  }

  Future<Map<String, dynamic>> verifyOtp(String mobile, String code) async {
    return _client.post('/auth/verify-otp', {'mobile': mobile, 'code': code});
  }
}
