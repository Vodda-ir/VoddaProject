import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../../../core/services/snackbar_service.dart';

/// Teacher-specific API operations.
class TeacherRepository {
  TeacherRepository(this._ref);
  final Ref _ref;

  /// Fetch all services for the current teacher.
  Future<List<Map<String, dynamic>>> myServices() async {
    final dio = _ref.read(dioClientProvider).dio;
    // GET /teacher/me returns teacher with services populated
    final res = await dio.get('/teacher/me');
    final services = (res.data['data']?['services'] as List?) ?? [];
    return services.cast<Map<String, dynamic>>();
  }

  /// Add a new service. Returns the created service data, or null on error.
  Future<Map<String, dynamic>?> addService({
    required String title,
    required int duration,
    required int price,
    String icon = '',
  }) async {
    try {
      final dio = _ref.read(dioClientProvider).dio;
      final res = await dio.post(
        '/teacher/services',
        data: {
          'title': title,
          'duration': duration,
          'price': price,
          'icon': icon,
        },
      );
      return res.data['data'] as Map<String, dynamic>;
    } catch (e) {
      SnackBarService.showError(e);
      return null;
    }
  }

  /// Returns true on success, false if an error occurred.
  Future<bool> updateService(
    int id, {
    String? title,
    int? duration,
    int? price,
    bool? active,
  }) async {
    try {
      final dio = _ref.read(dioClientProvider).dio;
      final data = <String, dynamic>{};
      if (title != null) data['title'] = title;
      if (duration != null) data['duration'] = duration;
      if (price != null) data['price'] = price;
      if (active != null) data['active'] = active;
      await dio.put('/teacher/services/$id', data: data);
      return true;
    } catch (e) {
      SnackBarService.showError(e);
      return false;
    }
  }

  /// Delete a service. Returns true on success.
  Future<bool> deleteService(int id) async {
    try {
      final dio = _ref.read(dioClientProvider).dio;
      await dio.delete('/teacher/services/$id');
      return true;
    } catch (e) {
      SnackBarService.showError(e);
      return false;
    }
  }

  /// Fetch current teacher's work times.
  Future<List<Map<String, dynamic>>> myWorkTimes() async {
    final dio = _ref.read(dioClientProvider).dio;
    final res = await dio.get('/teacher/work-times');
    final data = (res.data['data'] as List?) ?? [];
    return data.cast<Map<String, dynamic>>();
  }

  /// Save work times (replaces all). Returns true on success.
  Future<bool> saveWorkTimes(List<Map<String, dynamic>> slots) async {
    try {
      final dio = _ref.read(dioClientProvider).dio;
      await dio.put('/teacher/work-times', data: {'slots': slots});
      return true;
    } catch (e) {
      SnackBarService.showError(e);
      return false;
    }
  }

  /// Toggle teacher availability. Returns true on success.
  Future<bool> setAvailable(bool available) async {
    try {
      final dio = _ref.read(dioClientProvider).dio;
      await dio.put('/teacher/me', data: {'available': available});
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

/// Fetches the teacher's services, auto-refreshable.
final myServicesProvider = FutureProvider<List<Map<String, dynamic>>>(
  (ref) => ref.watch(teacherRepositoryProvider).myServices(),
);

/// Fetches the teacher's work times, auto-refreshable.
final myWorkTimesProvider = FutureProvider<List<Map<String, dynamic>>>(
  (ref) => ref.watch(teacherRepositoryProvider).myWorkTimes(),
);
