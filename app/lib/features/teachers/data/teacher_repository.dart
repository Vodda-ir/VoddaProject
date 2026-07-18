import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../../../core/services/snackbar_service.dart';
import '../domain/teacher.dart';

/// Fetches teacher data from the backend.
class TeacherRepository {
  TeacherRepository(this._ref);
  final Ref _ref;

  Future<List<Teacher>> search({String query = ''}) async {
    final dio = _ref.read(dioClientProvider).dio;
    final res = await dio.get('/teachers', queryParameters: {
      if (query.isNotEmpty) 'q': query,
    });
    final data = (res.data['data'] as List?) ?? [];
    return data.map((e) => Teacher.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Teacher> byId(int id) async {
    final dio = _ref.read(dioClientProvider).dio;
    final res = await dio.get('/teachers/$id');
    return Teacher.fromJson(res.data['data']['teacher'] as Map<String, dynamic>);
  }

  /// Follow a teacher. Returns true on success.
  Future<bool> follow(int id) async {
    try {
      final dio = _ref.read(dioClientProvider).dio;
      await dio.post('/teachers/$id/follow');
      return true;
    } catch (e) {
      SnackBarService.showError(e);
      return false;
    }
  }

  /// Unfollow a teacher. Returns true on success.
  Future<bool> unfollow(int id) async {
    try {
      final dio = _ref.read(dioClientProvider).dio;
      await dio.delete('/teachers/$id/follow');
      return true;
    } catch (e) {
      SnackBarService.showError(e);
      return false;
    }
  }
}

final teacherRepositoryProvider = Provider<TeacherRepository>(
  (ref) => TeacherRepository(ref),
);

/// Home + search list of teachers, parameterised by query string.
final teachersProvider =
    FutureProvider.family<List<Teacher>, String>((ref, query) {
  return ref.watch(teacherRepositoryProvider).search(query: query);
});
