import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Session status pill, matching the design's StatusPill.
class StatusPill extends StatelessWidget {
  const StatusPill({super.key, required this.status});
  final String status;

  @override
  Widget build(BuildContext context) {
    final map = <String, (String, Color, Color)>{
      'confirmed': ('تأیید شده', AppColors.olive700, AppColors.olive100),
      'pending': ('در انتظار تأیید', const Color(0xFF9A7426), AppColors.goldBg),
      'done': ('برگزار شده', AppColors.ink3, AppColors.sand100),
      'canceled': ('لغو شده', AppColors.rose, AppColors.clayBg),
    };
    final (text, c, bg) = map[status] ?? map['pending']!;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(width: 6, height: 6, decoration: BoxDecoration(color: c, shape: BoxShape.circle)),
          const SizedBox(width: 6),
          Text(text, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: c)),
        ],
      ),
    );
  }
}

/// Centered empty-state, matching the design's EmptyState.
class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.icon, required this.title, required this.sub});
  final IconData icon;
  final String title;
  final String sub;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 60, horizontal: 20),
      child: Column(
        children: [
          Container(
            width: 72, height: 72,
            decoration: const BoxDecoration(color: AppColors.olive50, shape: BoxShape.circle),
            child: Icon(icon, size: 34, color: AppColors.olive400),
          ),
          const SizedBox(height: 12),
          Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          Text(sub, textAlign: TextAlign.center, style: const TextStyle(fontSize: 13, color: AppColors.ink3, height: 1.8)),
        ],
      ),
    );
  }
}
