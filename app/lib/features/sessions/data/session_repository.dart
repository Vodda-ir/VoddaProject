import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../../../core/services/snackbar_service.dart';
import '../domain/session.dart';

/// Learner-facing session operations.
class SessionRepository {
  SessionRepository(this._ref);
  final Ref _ref;

  Future<List<Session>> mine(String when) async {
    final dio = _ref.read(dioClientProvider).dio;
    final res = await dio.get(
      '/sessions',
      queryParameters: {if (when.isNotEmpty) 'when': when},
    );
    final data = (res.data['data'] as List?) ?? [];
    return data
        .map((e) => Session.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Returns true on success, false if an error occurred (SnackBar already shown).
  Future<bool> book({
    required int teacherId,
    required int serviceId,
    required DateTime at,
    String note = '',
  }) async {
    try {
      final dio = _ref.read(dioClientProvider).dio;
      await dio.post(
        '/sessions',
        data: {
          'teacher_id': teacherId,
          'service_id': serviceId,
          'scheduled_at': at.toUtc().toIso8601String(),
          'note': note,
        },
      );
      return true;
    } catch (e) {
      SnackBarService.showError(e);
      return false;
    }
  }

  /// Returns true on success, false if an error occurred.
  Future<bool> cancel(int id) async {
    try {
      final dio = _ref.read(dioClientProvider).dio;
      await dio.post('/sessions/$id/cancel');
      return true;
    } catch (e) {
      SnackBarService.showError(e);
      return false;
    }
  }

  /// Teacher: accept a session request.
  /// Returns true on success, false if an error occurred.
  Future<bool> accept(int id) async {
    try {
      final dio = _ref.read(dioClientProvider).dio;
      await dio.post('/sessions/$id/accept');
      return true;
    } catch (e) {
      SnackBarService.showError(e);
      return false;
    }
  }

  /// Teacher: reject a session request.
  /// Returns true on success, false if an error occurred.
  Future<bool> reject(int id, {String reason = ''}) async {
    try {
      final dio = _ref.read(dioClientProvider).dio;
      await dio.post('/sessions/$id/reject', data: {'reason': reason});
      return true;
    } catch (e) {
      SnackBarService.showError(e);
      return false;
    }
  }

  /// Returns true on success, false if an error occurred.
  Future<bool> rate(int sessionId, int rating, String text) async {
    try {
      final dio = _ref.read(dioClientProvider).dio;
      await dio.post(
        '/reviews',
        data: {'session_id': sessionId, 'rating': rating, 'text': text},
      );
      return true;
    } catch (e) {
      SnackBarService.showError(e);
      return false;
    }
  }

  /// Teacher-facing sessions (requests, upcoming, past).
  Future<List<Session>> teacherMine(String when) async {
    final dio = _ref.read(dioClientProvider).dio;
    final res = await dio.get(
      '/teacher/sessions',
      queryParameters: {if (when.isNotEmpty) 'when': when},
    );
    final data = (res.data['data'] as List?) ?? [];
    return data
        .map((e) => Session.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}

final sessionRepositoryProvider = Provider<SessionRepository>(
  (ref) => SessionRepository(ref),
);

final mySessionsProvider = FutureProvider.family<List<Session>, String>(
  (ref, when) => ref.watch(sessionRepositoryProvider).mine(when),
);

final myTeacherSessionsProvider = FutureProvider.family<List<Session>, String>(
  (ref, when) => ref.watch(sessionRepositoryProvider).teacherMine(when),
);
