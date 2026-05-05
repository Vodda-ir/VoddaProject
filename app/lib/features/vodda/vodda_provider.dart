import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_provider.dart';
import 'data/vodda_repository.dart';
import 'domain/vodda_models.dart';

final voddaRepositoryProvider = Provider<VoddaRepository>((ref) {
  return VoddaRepository(ref.watch(apiClientProvider));
});

final teachersProvider = FutureProvider<List<Teacher>>((ref) async {
  return ref.watch(voddaRepositoryProvider).getTeachers();
});

final teacherDetailProvider = FutureProvider.family<Teacher, int>((ref, id) async {
  return ref.watch(voddaRepositoryProvider).getTeacher(id);
});

final myBookingsProvider = FutureProvider<List<BookingRecord>>((ref) async {
  return ref.watch(voddaRepositoryProvider).getMyBookings();
});

final teacherBookingsProvider = FutureProvider<List<BookingRecord>>((ref) async {
  return ref.watch(voddaRepositoryProvider).getTeacherBookings();
});

final walletSnapshotProvider = FutureProvider<WalletSnapshot>((ref) async {
  return ref.watch(voddaRepositoryProvider).getWalletSnapshot();
});

final notificationsProvider = FutureProvider<List<VoddaNotification>>((ref) async {
  return ref.watch(voddaRepositoryProvider).getNotifications();
});
