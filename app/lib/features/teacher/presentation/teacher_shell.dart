import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_colors.dart';

/// Bottom-navigation shell for the teacher role.
/// 5 tabs: داشبورد · درخواست‌ها · جلسات · کیف پول · پروفایل
class TeacherShell extends StatelessWidget {
  const TeacherShell({super.key, required this.child});
  final Widget child;

  static final _tabs = [
    (
      path: '/t',
      icon: LucideIcons.layoutGrid,
      active: LucideIcons.layoutGrid,
      label: 'داشبورد',
    ),
    (
      path: '/t/requests',
      icon: LucideIcons.messageSquare,
      active: LucideIcons.messageSquare,
      label: 'درخواست‌ها',
    ),
    (
      path: '/t/sessions',
      icon: LucideIcons.calendar,
      active: LucideIcons.calendarDays,
      label: 'جلسات',
    ),
    (
      path: '/t/wallet',
      icon: LucideIcons.wallet,
      active: LucideIcons.wallet,
      label: 'کیف پول',
    ),
    (
      path: '/t/profile',
      icon: LucideIcons.user,
      active: LucideIcons.user,
      label: 'پروفایل',
    ),
  ];

  int _indexFor(String location) {
    // match parent route /t/* to the right tab
    for (var i = 0; i < _tabs.length; i++) {
      if (location == _tabs[i].path) return i;
    }
    // match sub-routes
    if (location.startsWith('/t')) {
      if (location.contains('requests')) return 1;
      if (location.contains('sessions')) return 2;
      if (location.contains('wallet')) return 3;
      if (location.contains('profile')) return 4;
      return 0;
    }
    return 0;
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
