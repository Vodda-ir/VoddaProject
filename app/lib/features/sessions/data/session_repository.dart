import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
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

  Future<void> book({
    required int teacherId,
    required int serviceId,
    required DateTime at,
    String note = '',
  }) async {
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
  }

  Future<void> cancel(int id) async {
    final dio = _ref.read(dioClientProvider).dio;
    await dio.post('/sessions/$id/cancel');
  }

  /// Teacher: accept a session request.
  Future<void> accept(int id) async {
    final dio = _ref.read(dioClientProvider).dio;
    await dio.post('/sessions/$id/accept');
  }

  /// Teacher: reject a session request.
  Future<void> reject(int id, {String reason = ''}) async {
    final dio = _ref.read(dioClientProvider).dio;
    await dio.post('/sessions/$id/reject', data: {'reason': reason});
  }

  Future<void> rate(int sessionId, int rating, String text) async {
    final dio = _ref.read(dioClientProvider).dio;
    await dio.post(
      '/reviews',
      data: {'session_id': sessionId, 'rating': rating, 'text': text},
    );
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
