import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';

/// Bottom sheet for switching between learner and teacher roles.
class RoleSheet extends StatelessWidget {
  const RoleSheet({super.key, required this.isTeacher});
  final bool isTeacher;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.sand50,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      padding: const EdgeInsets.fromLTRB(22, 14, 22, 34),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 42,
            height: 5,
            decoration: BoxDecoration(
              color: AppColors.sand200,
              borderRadius: BorderRadius.circular(9),
            ),
          ),
          const SizedBox(height: 18),
          const Text(
            'تغییر حساب',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 20),
          _roleOption(
            icon: LucideIcons.user,
            title: 'حساب قرآن آموز',
            sub: 'یافتن استاد و رزرو جلسه',
            active: !isTeacher,
            onTap: () {
              Navigator.pop(context);
              if (isTeacher) context.go('/');
            },
          ),
          const SizedBox(height: 12),
          _roleOption(
            icon: LucideIcons.award,
            title: 'حساب استاد',
            sub: 'مدیریت جلسات و درآمد',
            active: isTeacher,
            onTap: () {
              Navigator.pop(context);
              if (!isTeacher) context.go('/t');
            },
          ),
        ],
      ),
    );
  }

  Widget _roleOption({
    required IconData icon,
    required String title,
    required String sub,
    VoidCallback? onTap,
    bool active = false,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: active ? AppColors.olive50 : AppColors.surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: active ? AppColors.olive600 : AppColors.sand200,
            width: active ? 1.5 : 1,
          ),
          boxShadow: const [BoxShadow(color: Color(0x0A2E3622), blurRadius: 4)],
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: active ? AppColors.olive600 : AppColors.olive100,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(
                icon,
                color: active ? Colors.white : AppColors.olive700,
                size: 24,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: active ? AppColors.olive700 : AppColors.ink,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    sub,
                    style: const TextStyle(
                      fontSize: 12.5,
                      color: AppColors.ink3,
                    ),
                  ),
                ],
              ),
            ),
            if (active)
              const Icon(
                LucideIcons.checkCircle,
                color: AppColors.olive600,
                size: 22,
              ),
          ],
        ),
      ),
    );
  }
}
