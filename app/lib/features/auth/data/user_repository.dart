import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
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
}

final userRepositoryProvider = Provider<UserRepository>((ref) => UserRepository(ref));

/// Current user, refreshable via ref.invalidate(meProvider).
final meProvider = FutureProvider<AppUser>((ref) => ref.watch(userRepositoryProvider).me());
