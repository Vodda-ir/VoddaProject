import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/login_screen.dart';
import '../../features/shell/app_shell.dart';
import '../../features/teachers/presentation/home_screen.dart';
import '../../features/teachers/presentation/search_screen.dart';
import '../../features/teachers/presentation/teacher_profile_screen.dart';
import '../providers.dart';

/// Builds the app's GoRouter, redirecting unauthenticated users to /login.
final routerProvider = Provider<GoRouter>((ref) {
  final client = ref.watch(dioClientProvider);

  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final loggingIn = state.matchedLocation == '/login';
      if (!client.isAuthed) return loggingIn ? null : '/login';
      if (loggingIn) return '/';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(
        path: '/teacher/:id',
        builder: (context, state) =>
            TeacherProfileScreen(id: int.parse(state.pathParameters['id']!)),
      ),
      ShellRoute(
        builder: (context, state, child) => AppShell(child: child),
        routes: [
          GoRoute(path: '/', builder: (context, state) => const HomeScreen()),
          GoRoute(path: '/search', builder: (context, state) => const SearchScreen()),
          GoRoute(
            path: '/sessions',
            builder: (context, state) =>
                const PlaceholderScreen(title: 'جلسات من', icon: Icons.calendar_today_outlined),
          ),
          GoRoute(
            path: '/wallet',
            builder: (context, state) =>
                const PlaceholderScreen(title: 'کیف پول', icon: Icons.account_balance_wallet_outlined),
          ),
          GoRoute(
            path: '/profile',
            builder: (context, state) =>
                const PlaceholderScreen(title: 'پروفایل', icon: Icons.person_outline),
          ),
        ],
      ),
    ],
  );
});
