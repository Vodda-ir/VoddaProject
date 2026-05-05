import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/auth_provider.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/verify_otp_screen.dart';
import '../../features/splash/presentation/splash_screen.dart';
import '../../features/vodda/domain/vodda_models.dart';
import '../../features/vodda/presentation/vodda_flow_screens.dart';
import '../../features/vodda/presentation/vodda_shared.dart';
import '../../features/vodda/presentation/vodda_shell_screen.dart';

bool _isAuthenticated(BuildContext context) {
  final auth = ProviderScope.containerOf(context, listen: false).read(authStateProvider);
  return auth.isAuthenticated;
}

Widget _guard(BuildContext context, Widget child) {
  if (!_isAuthenticated(context)) {
    return const LoginScreen();
  }
  return child;
}

VoddaTab _tabFromQuery(String? tab) {
  switch (tab) {
    case 'search':
      return VoddaTab.search;
    case 'bookings':
      return VoddaTab.bookings;
    case 'messages':
      return VoddaTab.messages;
    case 'profile':
      return VoddaTab.profile;
    case 'home':
    default:
      return VoddaTab.home;
  }
}

final appRouter = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const SplashScreen(),
    ),
    GoRoute(
      path: '/login',
      builder: (context, state) {
        if (_isAuthenticated(context)) {
          return const VoddaAppShell();
        }
        return const LoginScreen();
      },
    ),
    GoRoute(
      path: '/login/verify',
      builder: (context, state) {
        if (_isAuthenticated(context)) {
          return const VoddaAppShell();
        }
        final mobile = state.uri.queryParameters['mobile'] ?? '';
        if (mobile.isEmpty) {
          return const LoginScreen();
        }
        return VerifyOtpScreen(mobile: mobile);
      },
    ),
    GoRoute(
      path: '/dashboard',
      builder: (context, state) => _guard(
        context,
        const VoddaAppShell(),
      ),
    ),
    GoRoute(
      path: '/app',
      builder: (context, state) => _guard(
        context,
        VoddaAppShell(initialTab: _tabFromQuery(state.uri.queryParameters['tab'])),
      ),
    ),
    GoRoute(
      path: '/teachers/:id',
      builder: (context, state) {
        final id = int.tryParse(state.pathParameters['id'] ?? '');
        if (id == null) {
          return const VoddaErrorScaffold(
            title: 'مسیر نامعتبر',
            message: 'شناسه استاد معتبر نیست.',
          );
        }
        return _guard(context, TeacherDetailScreen(teacherId: id));
      },
    ),
    GoRoute(
      path: '/teachers/:id/schedule',
      builder: (context, state) {
        final id = int.tryParse(state.pathParameters['id'] ?? '');
        if (id == null) {
          return const VoddaErrorScaffold(
            title: 'مسیر نامعتبر',
            message: 'شناسه استاد معتبر نیست.',
          );
        }
        return _guard(context, BookingScheduleScreen(teacherId: id));
      },
    ),
    GoRoute(
      path: '/booking/confirm',
      builder: (context, state) {
        final selection = state.extra;
        if (selection is! BookingSelection) {
          return const VoddaErrorScaffold(
            title: 'اطلاعات ناقص',
            message: 'برای ادامه، ابتدا زمان جلسه را انتخاب کنید.',
          );
        }
        return _guard(context, BookingConfirmationScreen(selection: selection));
      },
    ),
    GoRoute(
      path: '/booking/success',
      builder: (context, state) {
        final booking = state.extra;
        if (booking is! BookingRecord) {
          return const VoddaErrorScaffold(
            title: 'اطلاعات ناقص',
            message: 'جزئیات سفارش برای نمایش موفقیت در دسترس نیست.',
          );
        }
        return _guard(context, BookingSuccessScreen(booking: booking));
      },
    ),
    GoRoute(
      path: '/bookings/:id',
      builder: (context, state) {
        final booking = state.extra;
        if (booking is! BookingRecord) {
          return const VoddaErrorScaffold(
            title: 'اطلاعات ناقص',
            message: 'برای مشاهده جزئیات سفارش باید از لیست سفارش‌ها وارد شوید.',
          );
        }
        return _guard(context, BookingDetailScreen(booking: booking));
      },
    ),
    GoRoute(
      path: '/bookings/:id/rate',
      builder: (context, state) {
        final booking = state.extra;
        if (booking is! BookingRecord) {
          return const VoddaErrorScaffold(
            title: 'اطلاعات ناقص',
            message: 'برای ثبت نظر باید از جزئیات سفارش وارد شوید.',
          );
        }
        return _guard(context, BookingRatingScreen(booking: booking));
      },
    ),
    GoRoute(
      path: '/chat/:id',
      builder: (context, state) {
        final id = int.tryParse(state.pathParameters['id'] ?? '');
        if (id == null) {
          return const VoddaErrorScaffold(
            title: 'مسیر نامعتبر',
            message: 'شناسه گفتگو معتبر نیست.',
          );
        }
        return _guard(
          context,
          TeacherChatScreen(
            teacherId: id,
            teacher: state.extra is Teacher ? state.extra as Teacher : null,
          ),
        );
      },
    ),
  ],
);
