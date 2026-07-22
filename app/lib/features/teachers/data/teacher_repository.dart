import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../domain/teacher.dart';

/// Fetches published teacher data from the backend.
class TeacherRepository {
  TeacherRepository(this._ref);
  final Ref _ref;

  Future<List<Teacher>> search({String query = ''}) async {
    final dio = _ref.read(dioClientProvider).dio;
    final response = await dio.get(
      '/teachers',
      queryParameters: {if (query.trim().isNotEmpty) 'q': query.trim()},
    );
    final data = (response.data['data'] as List?) ?? [];
    return data
        .map((item) => Teacher.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<Teacher> byId(int id) async {
    final dio = _ref.read(dioClientProvider).dio;
    final response = await dio.get('/teachers/$id');
    return Teacher.fromJson(
      response.data['data']['teacher'] as Map<String, dynamic>,
    );
  }
}

final teacherRepositoryProvider = Provider<TeacherRepository>(
  (ref) => TeacherRepository(ref),
);

final teachersProvider =
    FutureProvider.family<List<Teacher>, String>((ref, query) {
      return ref.watch(teacherRepositoryProvider).search(query: query);
    });
