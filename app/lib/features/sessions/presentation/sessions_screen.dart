import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/fa.dart';
import '../../../core/widgets/app_error.dart';
import '../../../core/widgets/status_pill.dart';
import '../../../core/widgets/vodda_avatar.dart';
import '../data/session_repository.dart';
import '../domain/session.dart';
import 'rating_sheet.dart';

class SessionsScreen extends ConsumerStatefulWidget {
  const SessionsScreen({super.key});

  @override
  ConsumerState<SessionsScreen> createState() => _SessionsScreenState();
}

class _SessionsScreenState extends ConsumerState<SessionsScreen> {
  String _tab = 'upcoming';

  @override
  Widget build(BuildContext context) {
    final sessions = ref.watch(mySessionsProvider(_tab));
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 12, 20, 16),
            child: Text(
              'جلسات من',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 18),
            child: Row(
              children: [
                _tabBtn('upcoming', 'پیش‌رو'),
                const SizedBox(width: 8),
                _tabBtn('past', 'برگزارشده'),
              ],
            ),
          ),
          Expanded(
            child: sessions.when(
              loading: () => const Center(
                child: CircularProgressIndicator(color: AppColors.olive600),
              ),
              error: (e, _) => AppErrorView(
                error: e,
                onRetry: () => ref.invalidate(mySessionsProvider(_tab)),
              ),
              data: (list) => list.isEmpty
                  ? const EmptyState(
                      icon: LucideIcons.calendar,
                      title: 'جلسه‌ای نیست',
                      sub: 'هنوز جلسه‌ای در این بخش ندارید.',
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                      itemCount: list.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 14),
                      itemBuilder: (_, i) => _SessionCard(
                        session: list[i],
                        onRate: () => _openRating(list[i]),
                        onCancel: () => _cancel(list[i]),
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _tabBtn(String id, String label) {
    final on = _tab == id;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _tab = id),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 11),
          decoration: BoxDecoration(
            color: on ? AppColors.olive600 : AppColors.surface,
            borderRadius: BorderRadius.circular(14),
            boxShadow: const [
              BoxShadow(color: Color(0x0A2E3622), blurRadius: 6),
            ],
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: on ? Colors.white : AppColors.ink3,
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _openRating(Session s) async {
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => RatingSheet(session: s),
    );
    if (ok == true) ref.invalidate(mySessionsProvider(_tab));
  }

  Future<void> _cancel(Session s) async {
    await ref.read(sessionRepositoryProvider).cancel(s.id);
    ref.invalidate(mySessionsProvider(_tab));
  }
}

class _SessionCard extends StatelessWidget {
  const _SessionCard({
    required this.session,
    required this.onRate,
    required this.onCancel,
  });
  final Session session;
  final VoidCallback onRate;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    final s = session;
    return Container(
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        boxShadow: const [BoxShadow(color: Color(0x0A2E3622), blurRadius: 6)],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              StatusPill(status: s.status),
              Text(
                '${faNumber(s.duration)} دقیقه',
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.ink3,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const VoddaAvatar(size: 46),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      s.teacherName,
                      style: const TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      s.service,
                      style: const TextStyle(
                        fontSize: 12.5,
                        color: AppColors.ink2,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 13),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
            decoration: BoxDecoration(
              color: AppColors.sand50,
              borderRadius: BorderRadius.circular(13),
            ),
            child: Row(
              children: [
                const Icon(
                  LucideIcons.calendar,
                  size: 16,
                  color: AppColors.olive500,
                ),
                const SizedBox(width: 5),
                Text(
                  _faDate(s.scheduledAt),
                  style: const TextStyle(fontSize: 12.5, color: AppColors.ink2),
                ),
                const SizedBox(width: 14),
                const Icon(
                  LucideIcons.clock,
                  size: 16,
                  color: AppColors.olive500,
                ),
                const SizedBox(width: 5),
                Text(
                  faDigits(
                    '${s.scheduledAt.hour.toString().padLeft(2, '0')}:${s.scheduledAt.minute.toString().padLeft(2, '0')}',
                  ),
                  style: const TextStyle(fontSize: 12.5, color: AppColors.ink2),
                ),
              ],
            ),
          ),
          ..._actions(),
        ],
      ),
    );
  }

  List<Widget> _actions() {
    if (session.status == 'confirmed') {
      return [
        const SizedBox(height: 13),
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: onCancel,
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.olive700,
                  side: const BorderSide(color: AppColors.olive200),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
                child: const Text('لغو جلسه'),
              ),
            ),
          ],
        ),
      ];
    }
    if (session.status == 'pending') {
      return [
        const SizedBox(height: 13),
        Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: AppColors.goldBg,
            borderRadius: BorderRadius.circular(13),
          ),
          child: const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(LucideIcons.clock, size: 16, color: AppColors.gold),
              SizedBox(width: 7),
              Text(
                'در انتظار تأیید استاد',
                style: TextStyle(fontSize: 12, color: AppColors.ink3),
              ),
            ],
          ),
        ),
      ];
    }
    if (session.status == 'done' && !session.rated) {
      return [
        const SizedBox(height: 13),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: onRate,
            icon: const Icon(LucideIcons.star, size: 18),
            label: const Text('ثبت امتیاز و نظر'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.gold,
              foregroundColor: Colors.white,
            ),
          ),
        ),
      ];
    }
    return const [];
  }

  static String _faDate(DateTime d) =>
      faDigits('${d.year}/${d.month}/${d.day}');
}
