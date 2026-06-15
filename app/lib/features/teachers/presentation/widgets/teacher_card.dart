import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/fa.dart';
import '../../../../core/widgets/vodda_avatar.dart';
import '../../domain/teacher.dart';

/// Teacher card used in carousels and the search list.
class TeacherCard extends StatelessWidget {
  const TeacherCard({
    super.key,
    required this.teacher,
    this.onTap,
    this.wide = false,
  });

  final Teacher teacher;
  final VoidCallback? onTap;
  final bool wide;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: wide ? double.infinity : 232,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(24),
          boxShadow: const [
            BoxShadow(
              color: Color(0x122E3622),
              blurRadius: 22,
              offset: Offset(0, 6),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                VoddaAvatar(
                  size: 54,
                  ring: true,
                  verified: teacher.verified,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        teacher.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 15,
                          color: AppColors.ink,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        teacher.tag,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.olive600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(Icons.star_rounded, size: 16, color: AppColors.gold),
                const SizedBox(width: 3),
                Text(
                  faDigits(teacher.rating.toStringAsFixed(1)),
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: AppColors.gold,
                  ),
                ),
                const SizedBox(width: 8),
                const Icon(
                  Icons.location_on_outlined,
                  size: 14,
                  color: AppColors.ink3,
                ),
                const SizedBox(width: 2),
                Text(
                  teacher.city,
                  style: const TextStyle(fontSize: 12, color: AppColors.ink3),
                ),
                const SizedBox(width: 8),
                Text(
                  '${faNumber(teacher.sessions)} جلسه',
                  style: const TextStyle(fontSize: 12, color: AppColors.ink3),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'هر جلسه از',
                      style: TextStyle(fontSize: 10, color: AppColors.ink4),
                    ),
                    Text(
                      '${faNumber(teacher.price30 / 1000)} هزار تومان',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: AppColors.ink,
                      ),
                    ),
                  ],
                ),
                ElevatedButton(
                  onPressed: onTap,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 8,
                    ),
                    textStyle: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  child: const Text('رزرو جلسه'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
