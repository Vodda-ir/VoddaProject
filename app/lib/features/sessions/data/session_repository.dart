import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../../../core/services/snackbar_service.dart';
import '../domain/session.dart';

/// Learner-facing and teacher-facing session operations.
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

  Future<bool> accept(int id) async {
    try {
      final dio = _ref.read(dioClientProvider).dio;
      await dio.post('/teacher/sessions/$id/accept');
      return true;
    } catch (e) {
      SnackBarService.showError(e);
      return false;
    }
  }

  Future<bool> reject(int id, {String reason = ''}) async {
    try {
      final dio = _ref.read(dioClientProvider).dio;
      await dio.post('/teacher/sessions/$id/reject', data: {'reason': reason});
      return true;
    } catch (e) {
      SnackBarService.showError(e);
      return false;
    }
  }

  Future<bool> complete(int id) async {
    try {
      final dio = _ref.read(dioClientProvider).dio;
      await dio.post('/teacher/sessions/$id/complete');
      return true;
    } catch (e) {
      SnackBarService.showError(e);
      return false;
    }
  }

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
