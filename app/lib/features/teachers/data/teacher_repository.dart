import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../domain/teacher.dart';

class TeacherSearchFilter {
  const TeacherSearchFilter({
    this.query = '',
    this.field = '',
    this.city = '',
    this.female,
    this.limit = 50,
    this.offset = 0,
  });

  final String query;
  final String field;
  final String city;
  final bool? female;
  final int limit;
  final int offset;

  TeacherSearchFilter copyWith({
    String? query,
    String? field,
    String? city,
    bool? female,
    bool clearFemale = false,
    int? limit,
    int? offset,
  }) {
    return TeacherSearchFilter(
      query: query ?? this.query,
      field: field ?? this.field,
      city: city ?? this.city,
      female: clearFemale ? null : female ?? this.female,
      limit: limit ?? this.limit,
      offset: offset ?? this.offset,
    );
  }

  @override
  bool operator ==(Object other) =>
      other is TeacherSearchFilter &&
      query == other.query &&
      field == other.field &&
      city == other.city &&
      female == other.female &&
      limit == other.limit &&
      offset == other.offset;

  @override
  int get hashCode => Object.hash(query, field, city, female, limit, offset);
}

class TeacherRepository {
  TeacherRepository(this._ref);
  final Ref _ref;

  Future<List<Teacher>> search({
    String query = '',
    String field = '',
    String city = '',
    bool? female,
    int limit = 50,
    int offset = 0,
  }) async {
    final dio = _ref.read(dioClientProvider).dio;
    final response = await dio.get(
      '/teachers',
      queryParameters: {
        if (query.trim().isNotEmpty) 'q': query.trim(),
        if (field.trim().isNotEmpty) 'field': field.trim(),
        if (city.trim().isNotEmpty) 'city': city.trim(),
        if (female != null) 'female': female,
        'limit': limit.clamp(1, 100),
        'offset': offset < 0 ? 0 : offset,
      },
    );
    final data = (response.data['data'] as List?) ?? const [];
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

// Compatibility provider used by the home screen and existing callers.
final teachersProvider = FutureProvider.family<List<Teacher>, String>(
  (ref, query) => ref.watch(teacherRepositoryProvider).search(query: query),
);

final teacherSearchProvider =
    FutureProvider.family<List<Teacher>, TeacherSearchFilter>(
  (ref, filter) => ref.watch(teacherRepositoryProvider).search(
        query: filter.query,
        field: filter.field,
        city: filter.city,
        female: filter.female,
        limit: filter.limit,
        offset: filter.offset,
      ),
);
