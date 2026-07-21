import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/account/presentation/edit_profile_screen.dart';
import '../../features/account/presentation/profile_tab.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/sessions/presentation/booking_screen.dart';
import '../../features/sessions/presentation/sessions_screen.dart';
import '../../features/shell/app_shell.dart';
import '../../features/teacher/presentation/requests_screen.dart';
import '../../features/teacher/presentation/services_screen.dart';
import '../../features/teacher/presentation/teacher_dashboard.dart';
import '../../features/teacher/presentation/teacher_profile.dart';
import '../../features/teacher/presentation/teacher_sessions.dart';
import '../../features/teacher/presentation/teacher_shell.dart';
import '../../features/teacher/presentation/teacher_wallet.dart';
import '../../features/teacher/presentation/withdraw_screen.dart';
import '../../features/teacher/presentation/work_times_screen.dart';
import '../../features/teachers/presentation/home_screen.dart';
import '../../features/teachers/presentation/search_screen.dart';
import '../../features/teachers/presentation/teacher_profile_screen.dart';
import '../../features/wallet/presentation/wallet_screen.dart';
import '../providers.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final client = ref.watch(dioClientProvider);

  return GoRouter(
    initialLocation: '/launch',
    redirect: (context, state) {
      final location = state.matchedLocation;
      final launching = location == '/launch';
      final loggingIn = location == '/login';
      if (launching) return null;
      if (!client.isAuthed) return loggingIn ? null : '/login';
      if (location.startsWith('/t') && !client.canUseTeacherPanel) return '/';
      if (loggingIn) return client.canUseTeacherPanel ? '/t' : '/';
      return null;
    },
    routes: [
      GoRoute(path: '/launch', builder: (context, state) => const LoginScreen(showSplash: true)),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(
        path: '/teacher/:id',
        builder: (context, state) {
          final id = int.tryParse(state.pathParameters['id'] ?? '');
          return id == null || id <= 0 ? const _InvalidRoute() : TeacherProfileScreen(id: id);
        },
      ),
      GoRoute(
        path: '/book/:id',
        builder: (context, state) {
          final id = int.tryParse(state.pathParameters['id'] ?? '');
          return id == null || id <= 0 ? const _InvalidRoute() : BookingScreen(teacherId: id);
        },
      ),
      GoRoute(path: '/profile/edit', builder: (context, state) => const EditProfileScreen()),
      GoRoute(path: '/t/services', builder: (context, state) => const ServicesScreen()),
      GoRoute(path: '/t/worktimes', builder: (context, state) => const WorkTimesScreen()),
      GoRoute(path: '/t/withdraw', builder: (context, state) => const WithdrawScreen()),
      ShellRoute(
        builder: (context, state, child) => AppShell(child: child),
        routes: [
          GoRoute(path: '/', builder: (context, state) => const HomeScreen()),
          GoRoute(path: '/search', builder: (context, state) => const SearchScreen()),
          GoRoute(path: '/sessions', builder: (context, state) => const SessionsScreen()),
          GoRoute(path: '/wallet', builder: (context, state) => const WalletScreen()),
          GoRoute(path: '/profile', builder: (context, state) => const ProfileTab()),
        ],
      ),
      ShellRoute(
        builder: (context, state, child) => TeacherShell(child: child),
        routes: [
          GoRoute(path: '/t', builder: (context, state) => const TeacherDashboard()),
          GoRoute(path: '/t/requests', builder: (context, state) => const RequestsScreen()),
          GoRoute(path: '/t/sessions', builder: (context, state) => const TeacherSessions()),
          GoRoute(path: '/t/wallet', builder: (context, state) => const TeacherWallet()),
          GoRoute(path: '/t/profile', builder: (context, state) => const TeacherProfile()),
        ],
      ),
    ],
  );
});

class _InvalidRoute extends StatelessWidget {
  const _InvalidRoute();

  @override
  Widget build(BuildContext context) => const Scaffold(
    body: Center(child: Text('آدرس واردشده معتبر نیست')),
  );
}
