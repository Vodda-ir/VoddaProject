import '../../../core/api/client.dart';
import '../domain/vodda_models.dart';

class VoddaRepository {
  final ApiClient _client;

  VoddaRepository(this._client);

  Future<List<Teacher>> getTeachers({String? query}) async {
    final response = await _client.get(
      '/teachers',
      queryParameters: query == null || query.trim().isEmpty ? null : {'query': query.trim()},
    );

    return ((response['items'] as List<dynamic>?) ?? const [])
        .map((item) => Teacher.fromJson(Map<String, dynamic>.from(item as Map)))
        .toList();
  }

  Future<Teacher> getTeacher(int id) async {
    final response = await _client.get('/teachers/$id');
    return Teacher.fromJson(response);
  }

  Future<List<BookingRecord>> getMyBookings() async {
    final response = await _client.get('/bookings/my');
    return ((response['items'] as List<dynamic>?) ?? const [])
        .map((item) => BookingRecord.fromJson(Map<String, dynamic>.from(item as Map)))
        .toList();
  }

  Future<List<BookingRecord>> getTeacherBookings() async {
    final response = await _client.get('/teacher/bookings');
    return ((response['items'] as List<dynamic>?) ?? const [])
        .map((item) => BookingRecord.fromJson(Map<String, dynamic>.from(item as Map)))
        .toList();
  }

  Future<BookingRecord> createBooking(BookingDraft draft) async {
    final response = await _client.post('/bookings', {
      'teacher_profile_id': draft.teacherProfileId,
      'slot_date': draft.slotDate.toIso8601String().split('T').first,
      'slot_start': draft.slotStart,
      'slot_end': draft.slotEnd,
      'notes': draft.notes,
    });

    return BookingRecord.fromJson(response);
  }

  Future<BookingRecord> acceptBooking(int bookingId) async {
    final response = await _client.post('/bookings/$bookingId/accept', {});
    return BookingRecord.fromJson(response);
  }

  Future<BookingRecord> rejectBooking(int bookingId, {String reason = ''}) async {
    final response = await _client.post('/bookings/$bookingId/reject', {
      'reason': reason,
    });

    return BookingRecord.fromJson(response);
  }

  Future<void> submitRating({
    required int bookingId,
    required int score,
    String comment = '',
  }) async {
    await _client.post('/ratings', {
      'booking_id': bookingId,
      'score': score,
      'comment': comment,
    });
  }

  Future<WalletSnapshot> getWalletSnapshot() async {
    final response = await _client.get('/wallet/transactions');
    return WalletSnapshot.fromJson(response);
  }

  Future<Map<String, dynamic>> initiateTopup(int amount) async {
    return _client.post('/wallet/topup/initiate', {'amount': amount});
  }

  Future<Map<String, dynamic>> verifyTopup({
    required String referenceId,
    required int amount,
  }) {
    return _client.post('/wallet/topup/verify', {
      'reference_id': referenceId,
      'amount': amount,
    });
  }

  Future<void> createWithdrawRequest({
    required int amount,
    required Map<String, dynamic> bankInfo,
  }) async {
    await _client.post('/wallet/withdraw-requests', {
      'amount': amount,
      'bank_info': bankInfo,
    });
  }

  Future<List<VoddaNotification>> getNotifications() async {
    final response = await _client.get('/notifications');
    return ((response['items'] as List<dynamic>?) ?? const [])
        .map((item) => VoddaNotification.fromJson(Map<String, dynamic>.from(item as Map)))
        .toList();
  }

  Future<void> markNotificationRead(int id) async {
    await _client.post('/notifications/$id/read', {});
  }
}
