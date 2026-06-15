import 'package:flutter/material.dart';
import '../network/error_message.dart';
import '../theme/app_colors.dart';

/// Friendly, retry-able error view — replaces raw red error text on screen.
class AppErrorView extends StatelessWidget {
  const AppErrorView({super.key, required this.error, this.onRetry, this.compact = false});

  final Object error;
  final VoidCallback? onRetry;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final content = Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 64, height: 64,
          decoration: const BoxDecoration(color: AppColors.clayBg, shape: BoxShape.circle),
          child: const Icon(Icons.cloud_off_rounded, size: 30, color: AppColors.clay),
        ),
        const SizedBox(height: 14),
        Text(
          errorMessage(error),
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 14, color: AppColors.ink2, height: 1.7, fontWeight: FontWeight.w600),
        ),
        if (onRetry != null) ...[
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh, size: 18),
            label: const Text('تلاش دوباره'),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.olive700,
              side: const BorderSide(color: AppColors.olive200),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 11),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
            ),
          ),
        ],
      ],
    );
    return Center(
      child: Padding(
        padding: EdgeInsets.symmetric(horizontal: 32, vertical: compact ? 24 : 60),
        child: content,
      ),
    );
  }
}
