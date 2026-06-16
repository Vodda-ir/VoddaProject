import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/providers.dart';
import '../../../core/services/snackbar_service.dart';
import '../domain/user.dart';

/// Reads/refreshes the current account.
class UserRepository {
  UserRepository(this._ref);
  final Ref _ref;

  Future<AppUser> me() async {
    final dio = _ref.read(dioClientProvider).dio;
    final res = await dio.get('/me');
    return AppUser.fromJson(res.data['data'] as Map<String, dynamic>);
  }

  /// Returns the updated user on success, null on error.
  Future<AppUser?> updateProfile({
    required String name,
    required String city,
    required String bio,
    XFile? avatar,
  }) async {
    try {
      final dio = _ref.read(dioClientProvider).dio;

      if (avatar != null) {
        // Multipart upload with avatar
        final formData = FormData.fromMap({
          'name': name,
          'city': city,
          'bio': bio,
          'avatar': await MultipartFile.fromFile(
            avatar.path,
            filename: 'avatar.jpg',
          ),
        });
        final res = await dio.put('/me', data: formData);
        return AppUser.fromJson(res.data['data'] as Map<String, dynamic>);
      }

      final res = await dio.put(
        '/me',
        data: {'name': name, 'city': city, 'bio': bio},
      );
      return AppUser.fromJson(res.data['data'] as Map<String, dynamic>);
    } catch (e) {
      SnackBarService.showError(e);
      return null;
    }
  }

  /// Updates only the teacher tag field — calls PUT /teacher/me.
  /// Returns false if the teacher record doesn't exist yet.
  Future<bool> updateTeacherTag(String tag) async {
    if (tag.isEmpty) return true;
    final dio = _ref.read(dioClientProvider).dio;
    try {
      await dio.put('/teacher/me', data: {'tag': tag});
      return true;
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return false; // not a teacher yet
      SnackBarService.showError(e);
      return false;
    }
  }
}

final userRepositoryProvider = Provider<UserRepository>(
  (ref) => UserRepository(ref),
);

/// Current user, refreshable via ref.invalidate(meProvider).
final meProvider = FutureProvider<AppUser>(
  (ref) => ref.watch(userRepositoryProvider).me(),
);
