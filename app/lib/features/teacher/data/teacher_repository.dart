import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../../../core/services/snackbar_service.dart';

/// Teacher-specific API operations.
class TeacherRepository {
  TeacherRepository(this._ref);
  final Ref _ref;

  Future<List<Map<String, dynamic>>> myServices() async {
    final dio = _ref.read(dioClientProvider).dio;
    final res = await dio.get('/teacher/me');
    final services = (res.data['data']?['services'] as List?) ?? [];
    return services.cast<Map<String, dynamic>>();
  }

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
      // Teachers may deactivate a published service. Re-activation remains an
      // admin moderation action and is intentionally never sent as true.
      if (active == false) data['active'] = false;
      await dio.put('/teacher/services/$id', data: data);
      return true;
    } catch (e) {
      SnackBarService.showError(e);
      return false;
    }
  }

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

  Future<List<Map<String, dynamic>>> myWorkTimes() async {
    final dio = _ref.read(dioClientProvider).dio;
    final res = await dio.get('/teacher/work-times');
    final data = (res.data['data'] as List?) ?? [];
    return data.cast<Map<String, dynamic>>();
  }

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

  Future<bool> requestWithdrawal({
    required int amount,
    String card = '',
    String sheba = '',
  }) async {
    try {
      final dio = _ref.read(dioClientProvider).dio;
      await dio.post(
        '/teacher/withdrawals',
        data: {
          'amount': amount,
          if (card.isNotEmpty) 'card': card,
          if (sheba.isNotEmpty) 'sheba': sheba,
        },
      );
      return true;
    } catch (e) {
      SnackBarService.showError(e);
      return false;
    }
  }

  Future<List<Map<String, dynamic>>> myWithdrawals() async {
    final dio = _ref.read(dioClientProvider).dio;
    final res = await dio.get('/teacher/withdrawals');
    final data = (res.data['data'] as List?) ?? [];
    return data.cast<Map<String, dynamic>>();
  }
}

final teacherRepositoryProvider = Provider<TeacherRepository>(
  (ref) => TeacherRepository(ref),
);

final myServicesProvider = FutureProvider<List<Map<String, dynamic>>>(
  (ref) => ref.watch(teacherRepositoryProvider).myServices(),
);

final myWorkTimesProvider = FutureProvider<List<Map<String, dynamic>>>(
  (ref) => ref.watch(teacherRepositoryProvider).myWorkTimes(),
);
