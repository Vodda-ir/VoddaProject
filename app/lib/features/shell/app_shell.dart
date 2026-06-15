import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';

/// Bottom-navigation shell for the learner role.
class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.child});
  final Widget child;

  static final _tabs = [
    (
      path: '/',
      icon: LucideIcons.home,
      active: LucideIcons.home,
      label: 'خانه',
    ),
    (
      path: '/search',
      icon: LucideIcons.search,
      active: LucideIcons.search,
      label: 'جستجو',
    ),
    (
      path: '/sessions',
      icon: LucideIcons.calendar,
      active: LucideIcons.calendarDays,
      label: 'جلسات',
    ),
    (
      path: '/wallet',
      icon: LucideIcons.wallet,
      active: LucideIcons.wallet,
      label: 'کیف پول',
    ),
    (
      path: '/profile',
      icon: LucideIcons.user,
      active: LucideIcons.user,
      label: 'پروفایل',
    ),
  ];

  int _indexFor(String location) {
    final i = _tabs.indexWhere((t) => t.path == location);
    return i < 0 ? 0 : i;
  }

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    final index = _indexFor(location);

    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBarTheme(
        data: NavigationBarThemeData(
          backgroundColor: AppColors.surface,
          indicatorColor: AppColors.olive600,
          labelTextStyle: WidgetStateProperty.all(
            const TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
          ),
          iconTheme: WidgetStateProperty.resolveWith((states) {
            final selected = states.contains(WidgetState.selected);
            return IconThemeData(
              color: selected ? Colors.white : AppColors.ink3,
            );
          }),
        ),
        child: NavigationBar(
          selectedIndex: index,
          height: 68,
          onDestinationSelected: (i) => context.go(_tabs[i].path),
          destinations: [
            for (final t in _tabs)
              NavigationDestination(
                icon: Icon(t.icon),
                selectedIcon: Icon(t.active),
                label: t.label,
              ),
          ],
        ),
      ),
    );
  }
}

/// Simple placeholder tab for not-yet-implemented sections.
class PlaceholderScreen extends StatelessWidget {
  const PlaceholderScreen({super.key, required this.title, required this.icon});
  final String title;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 56, color: AppColors.olive300),
            const SizedBox(height: 16),
            Text(
              title,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: AppColors.ink,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'این بخش به‌زودی تکمیل می‌شود',
              style: TextStyle(color: AppColors.ink3),
            ),
          ],
        ),
      ),
    );
  }
}
