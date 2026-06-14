import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';

/// Bottom-navigation shell for the learner role.
class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.child});
  final Widget child;

  static const _tabs = [
    (path: '/', icon: Icons.home_outlined, active: Icons.home, label: 'خانه'),
    (path: '/search', icon: Icons.search, active: Icons.search, label: 'جستجو'),
    (path: '/sessions', icon: Icons.calendar_today_outlined, active: Icons.calendar_today, label: 'جلسات'),
    (path: '/wallet', icon: Icons.account_balance_wallet_outlined, active: Icons.account_balance_wallet, label: 'کیف پول'),
    (path: '/profile', icon: Icons.person_outline, active: Icons.person, label: 'پروفایل'),
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
            return IconThemeData(color: selected ? Colors.white : AppColors.ink3);
          }),
        ),
        child: NavigationBar(
          selectedIndex: index,
          height: 68,
          onDestinationSelected: (i) => context.go(_tabs[i].path),
          destinations: [
            for (final t in _tabs)
              NavigationDestination(icon: Icon(t.icon), selectedIcon: Icon(t.active), label: t.label),
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
            Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.ink)),
            const SizedBox(height: 6),
            const Text('این بخش به‌زودی تکمیل می‌شود', style: TextStyle(color: AppColors.ink3)),
          ],
        ),
      ),
    );
  }
}
