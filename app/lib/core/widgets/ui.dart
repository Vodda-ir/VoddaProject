import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Section header with an optional "see all" action, matching the design.
class SectionHeader extends StatelessWidget {
  const SectionHeader({super.key, required this.title, this.action, this.onAction});
  final String title;
  final String? action;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 13),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.ink)),
          if (action != null)
            GestureDetector(
              onTap: onAction,
              child: Row(
                children: [
                  Text(action!, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.olive600)),
                  const Icon(Icons.chevron_left, size: 16, color: AppColors.olive600),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// Filter chip, matching the design's Chip.
class VChip extends StatelessWidget {
  const VChip({super.key, required this.label, this.active = false, this.icon, this.onTap});
  final String label;
  final bool active;
  final IconData? icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: active ? AppColors.olive600 : AppColors.surface,
          borderRadius: BorderRadius.circular(999),
          boxShadow: active ? null : const [BoxShadow(color: Color(0x0A2E3622), blurRadius: 3)],
          border: active ? null : Border.all(color: AppColors.sand200),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 15, color: active ? Colors.white : AppColors.ink2),
              const SizedBox(width: 6),
            ],
            Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: active ? Colors.white : AppColors.ink2)),
          ],
        ),
      ),
    );
  }
}
