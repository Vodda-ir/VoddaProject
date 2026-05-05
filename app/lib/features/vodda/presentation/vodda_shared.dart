import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/client.dart';
import '../../../core/utils/formatters.dart';
import '../data/vodda_repository.dart';
import '../domain/vodda_models.dart';
import '../vodda_provider.dart';

class VoddaPageScaffold extends StatelessWidget {
  final String title;
  final Widget body;
  final Widget? bottomBar;

  const VoddaPageScaffold({
    super.key,
    required this.title,
    required this.body,
    this.bottomBar,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF3F6FB),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 14, 18, 8),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => context.pop(),
                    icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Color(0xFF66748D)),
                  ),
                  Expanded(
                    child: Text(
                      title,
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            color: const Color(0xFF11254B),
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                  ),
                  const SizedBox(width: 48),
                ],
              ),
            ),
            Expanded(child: body),
            if (bottomBar != null)
              SafeArea(
                top: false,
                minimum: const EdgeInsets.fromLTRB(18, 8, 18, 18),
                child: bottomBar!,
              ),
          ],
        ),
      ),
    );
  }
}

class VoddaLoadingScaffold extends StatelessWidget {
  final String title;

  const VoddaLoadingScaffold({
    super.key,
    required this.title,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF3F6FB),
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const CircularProgressIndicator(),
              const SizedBox(height: 16),
              Text(title, style: const TextStyle(color: Color(0xFF66748D))),
            ],
          ),
        ),
      ),
    );
  }
}

class VoddaErrorScaffold extends StatelessWidget {
  final String title;
  final String message;

  const VoddaErrorScaffold({
    super.key,
    required this.title,
    required this.message,
  });

  @override
  Widget build(BuildContext context) {
    return VoddaPageScaffold(
      title: title,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Color(0xFF66748D), height: 1.9),
          ),
        ),
      ),
    );
  }
}

class VoddaSectionCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;

  const VoddaSectionCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(18),
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(30),
        boxShadow: const [
          BoxShadow(
            color: Color(0x140B1F32),
            blurRadius: 28,
            offset: Offset(0, 14),
          ),
        ],
      ),
      child: child,
    );
  }
}

class VoddaAvatarBubble extends StatelessWidget {
  final String name;
  final double size;
  final double textSize;

  const VoddaAvatarBubble({
    super.key,
    required this.name,
    required this.size,
    this.textSize = 26,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          colors: [
            avatarColor(name),
            avatarColor(name).withOpacity(0.72),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        border: Border.all(color: Colors.white, width: 3),
      ),
      child: Center(
        child: Text(
          initials(name),
          style: TextStyle(
            color: Colors.white,
            fontSize: textSize,
            fontWeight: FontWeight.w900,
          ),
        ),
      ),
    );
  }
}

class VoddaInfoStatCard extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String label;
  final String value;
  final Color accent;

  const VoddaInfoStatCard({
    super.key,
    required this.icon,
    required this.iconColor,
    required this.label,
    required this.value,
    required this.accent,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: accent,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: CircleAvatar(
              radius: 22,
              backgroundColor: Colors.white,
              child: Icon(icon, color: iconColor),
            ),
          ),
          const SizedBox(height: 14),
          Text(
            value,
            textAlign: TextAlign.right,
            style: const TextStyle(
              color: Color(0xFF11254B),
              fontSize: 18,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            label,
            textAlign: TextAlign.right,
            style: const TextStyle(
              color: Color(0xFF6B7688),
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class VoddaTeacherHeroCard extends StatelessWidget {
  final Teacher teacher;
  final bool expanded;

  const VoddaTeacherHeroCard({
    super.key,
    required this.teacher,
    this.expanded = false,
  });

  @override
  Widget build(BuildContext context) {
    return VoddaSectionCard(
      child: Column(
        children: [
          if (expanded)
            Container(
              height: 260,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFB7D2B1), Color(0xFFF4FAF2)],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
                borderRadius: BorderRadius.circular(30),
              ),
              child: Center(
                child: VoddaAvatarBubble(name: teacher.name, size: 160, textSize: 54),
              ),
            )
          else
            Row(
              children: [
                VoddaAvatarBubble(name: teacher.name, size: 86),
                const Spacer(),
                Expanded(
                  flex: 3,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        teacher.name,
                        textAlign: TextAlign.right,
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              color: const Color(0xFF11254B),
                              fontWeight: FontWeight.w900,
                            ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        teacher.specialty,
                        style: const TextStyle(
                          color: Color(0xFF90A0B4),
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: VoddaInfoStatCard(
                  icon: Icons.groups_rounded,
                  iconColor: const Color(0xFF2F9446),
                  label: 'رزروها',
                  value: toPersianDigits(teacher.totalBookings.toString()),
                  accent: const Color(0xFFEAF9EF),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: VoddaInfoStatCard(
                  icon: Icons.star_outline_rounded,
                  iconColor: const Color(0xFF5FBC6B),
                  label: 'امتیاز',
                  value: toPersianDigits(teacher.averageRating.toStringAsFixed(1)),
                  accent: const Color(0xFFEAFCF0),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: VoddaInfoStatCard(
                  icon: Icons.location_on_outlined,
                  iconColor: const Color(0xFF58A567),
                  label: 'محدوده',
                  value: teacherDistrict(teacher.id),
                  accent: const Color(0xFFEAFCF0),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: VoddaInfoStatCard(
                  icon: Icons.bar_chart_rounded,
                  iconColor: const Color(0xFF63C15E),
                  label: teacherLevelLabel(teacher.level),
                  value: formatCurrency(teacher.pricePer30Min),
                  accent: const Color(0xFFEAFCF0),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class VoddaCompactTeacherHeader extends StatelessWidget {
  final Teacher teacher;

  const VoddaCompactTeacherHeader({
    super.key,
    required this.teacher,
  });

  @override
  Widget build(BuildContext context) {
    return VoddaSectionCard(
      child: Row(
        children: [
          CircleAvatar(
            radius: 26,
            backgroundColor: const Color(0xFFF1F4FA),
            child: const Icon(Icons.bookmark_border_rounded, color: Color(0xFF141D25)),
          ),
          const Spacer(),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                teacher.name,
                style: const TextStyle(
                  color: Color(0xFF11254B),
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                formatCurrency(teacher.pricePer30Min),
                style: const TextStyle(
                  color: Color(0xFF66748D),
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(width: 14),
          VoddaAvatarBubble(name: teacher.name, size: 72),
        ],
      ),
    );
  }
}

class VoddaSectionTitle extends StatelessWidget {
  final String title;
  final String actionLabel;
  final VoidCallback? onTap;

  const VoddaSectionTitle({
    super.key,
    required this.title,
    required this.actionLabel,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        TextButton(
          onPressed: onTap,
          child: Text(actionLabel),
        ),
        const Spacer(),
        Text(
          title,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                color: const Color(0xFF11254B),
                fontWeight: FontWeight.w900,
              ),
        ),
      ],
    );
  }
}

class VoddaServiceTile extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color color;
  final Color iconColor;
  final Color textColor;

  const VoddaServiceTile({
    super.key,
    required this.title,
    required this.icon,
    required this.color,
    this.iconColor = Colors.white,
    this.textColor = Colors.white,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 136,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(28),
      ),
      child: Column(
        children: [
          Icon(icon, size: 40, color: iconColor),
          const Spacer(),
          Text(
            title,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: textColor,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class VoddaPromoBanner extends StatelessWidget {
  final String title;
  final String subtitle;
  final Color background;

  const VoddaPromoBanner({
    super.key,
    required this.title,
    required this.subtitle,
    required this.background,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Row(
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.12),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Icon(Icons.menu_book_rounded, color: Colors.white, size: 40),
          ),
          const Spacer(),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                title,
                style: const TextStyle(
                  color: Color(0xFFFFDE74),
                  fontSize: 28,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class VoddaTeacherCard extends StatelessWidget {
  final Teacher teacher;
  final VoidCallback onTap;

  const VoddaTeacherCard({
    super.key,
    required this.teacher,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(26),
          boxShadow: const [
            BoxShadow(
              color: Color(0x14081E32),
              blurRadius: 26,
              offset: Offset(0, 14),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              height: 112,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    avatarColor(teacher.name).withOpacity(0.24),
                    avatarColor(teacher.name).withOpacity(0.10),
                  ],
                ),
                borderRadius: BorderRadius.circular(22),
              ),
              child: Center(
                child: VoddaAvatarBubble(name: teacher.name, size: 86),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              teacher.name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.right,
              style: const TextStyle(
                color: Color(0xFF11254B),
                fontSize: 18,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              teacher.specialty,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.right,
              style: const TextStyle(
                color: Color(0xFF6F7B8E),
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                const Icon(Icons.star_rounded, color: Color(0xFFFFA321), size: 18),
                const SizedBox(width: 4),
                Text(
                  toPersianDigits(teacher.averageRating.toStringAsFixed(1)),
                  style: const TextStyle(color: Color(0xFF11254B), fontWeight: FontWeight.w800),
                ),
                const Spacer(),
                Text(
                  formatCurrency(teacher.pricePer30Min),
                  style: const TextStyle(color: Color(0xFF2F9446), fontWeight: FontWeight.w900),
                ),
              ],
            ),
            const Spacer(),
            FilledButton(
              onPressed: onTap,
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF2F9446),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: const Text('رزرو استاد'),
            ),
          ],
        ),
      ),
    );
  }
}

class VoddaTeacherListCard extends StatelessWidget {
  final Teacher teacher;
  final VoidCallback onTap;

  const VoddaTeacherListCard({
    super.key,
    required this.teacher,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: VoddaSectionCard(
        child: Row(
          children: [
            Column(
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: const Color(0xFFF5F7FB),
                  child: const Icon(Icons.bookmark_border_rounded, color: Color(0xFF141D25)),
                ),
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF2F9446),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Text(
                    'انتخاب',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
                  ),
                ),
              ],
            ),
            const Spacer(),
            Expanded(
              flex: 3,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    teacherLevelLabel(teacher.level),
                    style: const TextStyle(
                      color: Color(0xFF3B88E8),
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    teacher.name,
                    textAlign: TextAlign.right,
                    style: const TextStyle(
                      color: Color(0xFF11254B),
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'امتیاز ${toPersianDigits(teacher.averageRating.toStringAsFixed(1))}',
                    style: const TextStyle(
                      color: Color(0xFF7E879A),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    formatCurrency(teacher.pricePer30Min),
                    style: const TextStyle(
                      color: Color(0xFF66748D),
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 14),
            VoddaAvatarBubble(name: teacher.name, size: 92),
          ],
        ),
      ),
    );
  }
}

class VoddaToggleTile extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool active;
  final VoidCallback onTap;

  const VoddaToggleTile({
    super.key,
    required this.label,
    required this.icon,
    required this.active,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: active ? const Color(0xFF2F9446) : Colors.transparent,
          borderRadius: BorderRadius.circular(22),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: active ? Colors.white : const Color(0xFF6D7890)),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                color: active ? Colors.white : const Color(0xFF6D7890),
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class VoddaBookingAccordion extends StatefulWidget {
  final String title;
  final Widget child;
  final bool initiallyExpanded;

  const VoddaBookingAccordion({
    super.key,
    required this.title,
    required this.child,
    this.initiallyExpanded = false,
  });

  @override
  State<VoddaBookingAccordion> createState() => _VoddaBookingAccordionState();
}

class _VoddaBookingAccordionState extends State<VoddaBookingAccordion> {
  late bool _expanded;

  @override
  void initState() {
    super.initState();
    _expanded = widget.initiallyExpanded;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
      ),
      child: Column(
        children: [
          ListTile(
            onTap: () => setState(() => _expanded = !_expanded),
            leading: AnimatedRotation(
              duration: const Duration(milliseconds: 160),
              turns: _expanded ? 0.5 : 0,
              child: const Icon(Icons.expand_more_rounded, color: Color(0xFF718096)),
            ),
            title: Text(
              widget.title,
              textAlign: TextAlign.right,
              style: const TextStyle(
                color: Color(0xFF374151),
                fontSize: 22,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          if (_expanded)
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
              child: widget.child,
            ),
        ],
      ),
    );
  }
}

class VoddaBookingCard extends StatelessWidget {
  final BookingRecord booking;
  final Teacher? teacher;
  final VoidCallback onOpen;
  final VoidCallback? onOpenTeacher;

  const VoddaBookingCard({
    super.key,
    required this.booking,
    required this.teacher,
    required this.onOpen,
    this.onOpenTeacher,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onOpen,
      child: VoddaSectionCard(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Row(
              children: [
                if (onOpenTeacher != null)
                  VoddaAvatarBubble(name: booking.teacherName, size: 78, textSize: 20),
                const Spacer(),
                Expanded(
                  flex: 3,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        booking.teacherName,
                        style: const TextStyle(
                          color: Color(0xFF11254B),
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        formatDateTimeRange(booking.slotDate, booking.slotStart, booking.slotEnd),
                        textAlign: TextAlign.right,
                        style: const TextStyle(
                          color: Color(0xFF7A8396),
                          height: 1.6,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Text(
                            bookingStatusLabel(booking.status),
                            style: TextStyle(
                              color: bookingStatusColor(booking.status),
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Icon(Icons.access_time_rounded, color: bookingStatusColor(booking.status), size: 20),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
            if (booking.notes.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(
                booking.notes,
                textAlign: TextAlign.right,
                style: const TextStyle(
                  color: Color(0xFF708094),
                  height: 1.8,
                ),
              ),
            ],
            const SizedBox(height: 12),
            Row(
              children: [
                OutlinedButton(
                  onPressed: onOpen,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF2F9446),
                    side: const BorderSide(color: Color(0xFF2F9446)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: const Text('جزئیات'),
                ),
                const Spacer(),
                if (teacher != null)
                  TextButton.icon(
                    onPressed: onOpenTeacher,
                    icon: const Icon(Icons.person_outline_rounded),
                    label: const Text('استاد'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class VoddaNotificationTile extends ConsumerWidget {
  final VoddaNotification notification;

  const VoddaNotificationTile({
    super.key,
    required this.notification,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return GestureDetector(
      onTap: () async {
        if (!notification.isRead) {
          await ref.read(voddaRepositoryProvider).markNotificationRead(notification.id);
          ref.invalidate(notificationsProvider);
        }
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: notification.isRead ? Colors.white : const Color(0xFFEAF8EE),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(
            color: notification.isRead ? const Color(0xFFE6EDF5) : const Color(0xFFBFE4C9),
          ),
        ),
        child: Row(
          children: [
            CircleAvatar(
              radius: 24,
              backgroundColor: notification.isRead ? const Color(0xFFF1F4FA) : const Color(0xFF2F9446),
              child: Icon(
                notification.isRead ? Icons.notifications_none_rounded : Icons.notifications_active_outlined,
                color: notification.isRead ? const Color(0xFF6D7890) : Colors.white,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    notification.title,
                    textAlign: TextAlign.right,
                    style: const TextStyle(
                      color: Color(0xFF11254B),
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    notification.body,
                    textAlign: TextAlign.right,
                    style: const TextStyle(
                      color: Color(0xFF6A768B),
                      height: 1.7,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class VoddaProfileMetricCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color tint;
  final Color iconColor;

  const VoddaProfileMetricCard({
    super.key,
    required this.title,
    required this.value,
    required this.icon,
    required this.tint,
    required this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: tint,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: Icon(icon, color: iconColor),
          ),
          const Spacer(),
          Text(
            value,
            style: const TextStyle(
              color: Color(0xFF11254B),
              fontSize: 26,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            title,
            textAlign: TextAlign.right,
            style: const TextStyle(
              color: Color(0xFF6B7688),
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class VoddaProfileMenuTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback onTap;

  const VoddaProfileMenuTile({
    super.key,
    required this.icon,
    required this.title,
    required this.onTap,
    this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
      leading: const Icon(Icons.chevron_left_rounded, color: Color(0xFF9BA5B5)),
      trailing: Icon(icon, color: const Color(0xFF2F9446)),
      title: Text(
        title,
        textAlign: TextAlign.right,
        style: const TextStyle(
          color: Color(0xFF25314A),
          fontWeight: FontWeight.w700,
        ),
      ),
      subtitle: subtitle == null
          ? null
          : Text(
              subtitle!,
              textAlign: TextAlign.right,
            ),
    );
  }
}

class VoddaMiniCounter extends StatelessWidget {
  final String label;
  final int value;
  final Color color;

  const VoddaMiniCounter({
    super.key,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          toPersianDigits(value.toString()),
          style: TextStyle(
            color: color,
            fontSize: 22,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          label,
          style: const TextStyle(
            color: Color(0xFF6A768B),
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

class VoddaStatusBanner extends StatelessWidget {
  final String status;

  const VoddaStatusBanner({
    super.key,
    required this.status,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
      decoration: BoxDecoration(
        color: bookingStatusColor(status),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Row(
        children: [
          const Icon(Icons.expand_more_rounded, color: Colors.white),
          const Spacer(),
          Text(
            bookingStatusLabel(status),
            style: const TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }
}

class VoddaPaymentMethodTile extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final bool selected;
  final bool enabled;
  final VoidCallback onTap;

  const VoddaPaymentMethodTile({
    super.key,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.selected,
    required this.onTap,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: enabled ? onTap : null,
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFFEAF9EE) : const Color(0xFFF6F8FC),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: selected ? const Color(0xFF2F9446) : const Color(0xFFE7EDF4),
            width: selected ? 1.4 : 1,
          ),
        ),
        child: Row(
          children: [
            Icon(icon, color: enabled ? const Color(0xFF111926) : const Color(0xFFAEAEAE), size: 34),
            const Spacer(),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    color: enabled ? const Color(0xFF11254B) : const Color(0xFFAEAEAE),
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: TextStyle(
                    color: enabled ? const Color(0xFF68758A) : const Color(0xFFB6B6B6),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class VoddaEmptyStateCard extends StatelessWidget {
  final String title;
  final String subtitle;

  const VoddaEmptyStateCard({
    super.key,
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return VoddaSectionCard(
      child: Column(
        children: [
          const Icon(Icons.inbox_outlined, size: 42, color: Color(0xFF8B96A8)),
          const SizedBox(height: 10),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Color(0xFF11254B),
              fontSize: 18,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Color(0xFF69758A),
              height: 1.8,
            ),
          ),
        ],
      ),
    );
  }
}

class VoddaMetaRow extends StatelessWidget {
  final IconData icon;
  final String text;

  const VoddaMetaRow({
    super.key,
    required this.icon,
    required this.text,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Icon(icon, color: const Color(0xFF2F9446)),
          const Spacer(),
          Expanded(
            flex: 4,
            child: Text(
              text,
              textAlign: TextAlign.right,
              style: const TextStyle(
                color: Color(0xFF18243A),
                fontSize: 18,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

Color bookingStatusColor(String status) {
  switch (status) {
    case 'pending':
      return const Color(0xFF2F9446);
    case 'accepted':
      return const Color(0xFF4B82F1);
    case 'completed':
      return const Color(0xFFB99445);
    case 'rejected':
      return const Color(0xFFAF5478);
    default:
      return const Color(0xFF66748D);
  }
}

String roleLabel(String role) {
  switch (role) {
    case 'teacher':
      return 'استاد';
    case 'admin':
      return 'مدیر';
    case 'learner':
    default:
      return 'کاربر';
  }
}

String teacherDistrict(int id) {
  const districts = [
    'قم',
    'تهران، تجریش',
    'مشهد، الهیه',
    'هشتپر (تالش)',
    'اصفهان، ملک‌شهر',
    'شیراز، معالی‌آباد',
  ];

  return districts[id % districts.length];
}

Color avatarColor(String seed) {
  const palette = [
    Color(0xFF2F9446),
    Color(0xFF3B82F6),
    Color(0xFFF59E0B),
    Color(0xFF8B5CF6),
    Color(0xFF10B981),
    Color(0xFFEF4444),
  ];

  final index = seed.runes.fold<int>(0, (sum, rune) => sum + rune) % palette.length;
  return palette[index];
}

String initials(String value) {
  final parts = value.trim().split(RegExp(r'\s+')).where((item) => item.isNotEmpty).toList();
  if (parts.isEmpty) {
    return 'و';
  }
  if (parts.length == 1) {
    return parts.first.characters.first;
  }

  return '${parts.first.characters.first}${parts.last.characters.first}';
}

List<String> buildTimeOptions(Teacher teacher, DateTime date) {
  final dayOfWeek = date.weekday % 7;
  final slots = teacher.availabilitySlots.where((slot) => slot.dayOfWeek == dayOfWeek).toList();
  if (slots.isEmpty) {
    return const [];
  }

  final options = <String>[];
  for (final slot in slots) {
    var current = slot.startTime;
    while (compareTimes(current, slot.endTime) < 0) {
      final next = plusThirtyMinutes(current);
      if (compareTimes(next, slot.endTime) <= 0) {
        options.add(current);
      }
      current = next;
    }
  }

  return options.toSet().toList()..sort();
}

int compareTimes(String a, String b) => a.compareTo(b);

String plusThirtyMinutes(String time) {
  final parts = time.split(':').map(int.parse).toList();
  final totalMinutes = (parts[0] * 60) + parts[1] + 30;
  final hour = totalMinutes ~/ 60;
  final minute = totalMinutes % 60;
  final normalizedHour = hour.toString().padLeft(2, '0');
  final normalizedMinute = minute.toString().padLeft(2, '0');
  return '$normalizedHour:$normalizedMinute:00';
}

bool isPseudoBusy(DateTime date, String time) {
  final seed = date.day + date.month + time.codeUnits.fold<int>(0, (sum, item) => sum + item);
  return seed % 5 == 0;
}

String describeError(Object error, String fallback) {
  if (error is ApiException) {
    try {
      final decoded = jsonDecode(error.body);
      if (decoded is Map<String, dynamic>) {
        final message = decoded['message']?.toString().trim() ?? '';
        if (message.isNotEmpty) {
          return message;
        }
      }
    } catch (_) {
      return fallback;
    }
  }

  return fallback;
}

void showWalletActions(BuildContext context, WidgetRef ref, int balance) {
  final amountController = TextEditingController(text: '200000');
  final cardController = TextEditingController(text: '6037990000000000');

  showModalBottomSheet<void>(
    context: context,
    backgroundColor: Colors.transparent,
    builder: (context) {
      return Padding(
        padding: const EdgeInsets.all(18),
        child: VoddaSectionCard(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'کیف پول شما: ${formatCurrency(balance)}',
                style: const TextStyle(
                  color: Color(0xFF11254B),
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: amountController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'مبلغ'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: cardController,
                decoration: const InputDecoration(labelText: 'شماره کارت برای برداشت'),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: FilledButton(
                      onPressed: () async {
                        final amount = int.tryParse(amountController.text.trim()) ?? 0;
                        if (amount <= 0) {
                          return;
                        }
                        try {
                          final repo = ref.read(voddaRepositoryProvider);
                          final init = await repo.initiateTopup(amount);
                          await repo.verifyTopup(
                            referenceId: init['reference_id'].toString(),
                            amount: amount,
                          );
                          ref.invalidate(walletSnapshotProvider);
                          if (context.mounted) {
                            Navigator.of(context).pop();
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('شارژ کیف پول با موفقیت ثبت شد.')),
                            );
                          }
                        } catch (error) {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text(describeError(error, 'شارژ کیف پول انجام نشد.'))),
                            );
                          }
                        }
                      },
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xFF2F9446),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                      ),
                      child: const Text('شارژ آزمایشی'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () async {
                        final amount = int.tryParse(amountController.text.trim()) ?? 0;
                        if (amount <= 0) {
                          return;
                        }
                        try {
                          await ref.read(voddaRepositoryProvider).createWithdrawRequest(
                                amount: amount,
                                bankInfo: {'card': cardController.text.trim()},
                              );
                          ref.invalidate(walletSnapshotProvider);
                          if (context.mounted) {
                            Navigator.of(context).pop();
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('درخواست برداشت ثبت شد.')),
                            );
                          }
                        } catch (error) {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text(describeError(error, 'درخواست برداشت ثبت نشد.'))),
                            );
                          }
                        }
                      },
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF2F9446),
                        side: const BorderSide(color: Color(0xFF2F9446)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                      ),
                      child: const Text('درخواست برداشت'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      );
    },
  ).whenComplete(() {
    amountController.dispose();
    cardController.dispose();
  });
}

class VoddaTeachersMapCard extends StatelessWidget {
  final List<Teacher> teachers;
  final ValueChanged<Teacher> onOpenTeacher;

  const VoddaTeachersMapCard({
    super.key,
    required this.teachers,
    required this.onOpenTeacher,
  });

  @override
  Widget build(BuildContext context) {
    final featured = teachers.first;
    return Column(
      children: [
        Container(
          height: 520,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(30),
          ),
          child: Stack(
            children: [
              Positioned.fill(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(30),
                  child: Opacity(
                    opacity: 0.14,
                    child: GridPaper(
                      color: const Color(0xFFB4C1D4),
                      interval: 44,
                      subdivisions: 1,
                    ),
                  ),
                ),
              ),
              ...List.generate(math.min(teachers.length, 4), (index) {
                final top = 70.0 + (index * 84);
                final left = 50.0 + ((index % 2) * 160);
                final teacher = teachers[index];
                return Positioned(
                  top: top,
                  left: left,
                  child: Column(
                    children: [
                      VoddaAvatarBubble(
                        name: teacher.name,
                        size: index == 0 ? 64 : 50,
                        textSize: index == 0 ? 18 : 14,
                      ),
                      const Icon(Icons.location_on_rounded, color: Color(0xFF2F9446), size: 22),
                    ],
                  ),
                );
              }),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFFE5FCE5), Color(0xFFF4FFF4)],
            ),
            borderRadius: BorderRadius.circular(26),
          ),
          child: Row(
            children: [
              Container(
                width: 90,
                height: 90,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(22),
                  color: Colors.white,
                ),
                child: Center(child: VoddaAvatarBubble(name: featured.name, size: 60, textSize: 18)),
              ),
              const Spacer(),
              Expanded(
                flex: 3,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      featured.name,
                      textAlign: TextAlign.right,
                      style: const TextStyle(
                        color: Color(0xFF11254B),
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '${featured.specialty} - ${teacherLevelLabel(featured.level)}',
                      textAlign: TextAlign.right,
                      style: const TextStyle(color: Color(0xFF6B7688), fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      formatCurrency(featured.pricePer30Min),
                      style: const TextStyle(
                        color: Color(0xFF11254B),
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              FilledButton(
                onPressed: () => onOpenTeacher(featured),
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF2F9446),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                ),
                child: const Text('جزئیات'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
