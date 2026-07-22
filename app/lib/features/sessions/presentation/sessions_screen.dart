import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

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
                _tabButton('upcoming', 'پیش‌رو'),
                const SizedBox(width: 8),
                _tabButton('past', 'برگزارشده'),
              ],
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              color: AppColors.olive600,
              onRefresh: () async {
                ref.invalidate(mySessionsProvider(_tab));
                await ref.read(mySessionsProvider(_tab).future);
              },
              child: sessions.when(
                loading: () => ListView(
                  children: const [
                    SizedBox(height: 200),
                    Center(
                      child: CircularProgressIndicator(
                        color: AppColors.olive600,
                      ),
                    ),
                  ],
                ),
                error: (error, _) => ListView(
                  children: [
                    SizedBox(
                      height: 200,
                      child: AppErrorView(
                        error: error,
                        onRetry: () =>
                            ref.invalidate(mySessionsProvider(_tab)),
                      ),
                    ),
                  ],
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
                        itemBuilder: (_, index) => _SessionCard(
                          session: list[index],
                          onRate: () => _openRating(list[index]),
                          onCancel: () => _cancel(list[index]),
                        ),
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _tabButton(String id, String label) {
    final selected = _tab == id;
    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => setState(() => _tab = id),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 11),
          decoration: BoxDecoration(
            color: selected ? AppColors.olive600 : AppColors.surface,
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
              color: selected ? Colors.white : AppColors.ink3,
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _openRating(Session session) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => RatingSheet(session: session),
    );
    if (saved == true) ref.invalidate(mySessionsProvider(_tab));
  }

  Future<void> _cancel(Session session) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('لغو جلسه'),
        content: const Text(
          'در صورت تأیید لغو، مبلغ رزرو طبق وضعیت جلسه به کیف پول بازمی‌گردد. ادامه می‌دهید؟',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('انصراف'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('لغو جلسه'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    final canceled = await ref
        .read(sessionRepositoryProvider)
        .cancel(session.id);
    if (canceled) {
      ref.invalidate(mySessionsProvider(_tab));
    }
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
              StatusPill(status: session.status),
              Text(
                '${faNumber(session.duration)} دقیقه',
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
                      session.teacherName,
                      style: const TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      session.service,
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
                  _faDate(session.scheduledAt),
                  style: const TextStyle(
                    fontSize: 12.5,
                    color: AppColors.ink2,
                  ),
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
                    '${session.scheduledAt.hour.toString().padLeft(2, '0')}:${session.scheduledAt.minute.toString().padLeft(2, '0')}',
                  ),
                  style: const TextStyle(
                    fontSize: 12.5,
                    color: AppColors.ink2,
                  ),
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
    if (session.status == 'pending' || session.status == 'confirmed') {
      final confirmed = session.status == 'confirmed';
      return [
        const SizedBox(height: 13),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: confirmed ? AppColors.olive100 : AppColors.goldBg,
            borderRadius: BorderRadius.circular(13),
          ),
          child: Row(
            children: [
              Icon(
                confirmed ? LucideIcons.checkCircle : LucideIcons.clock,
                size: 17,
                color: confirmed ? AppColors.olive700 : AppColors.gold,
              ),
              const SizedBox(width: 7),
              Expanded(
                child: Text(
                  confirmed
                      ? 'جلسه تأیید شده است. جزئیات برگزاری را با استاد هماهنگ کنید.'
                      : 'در انتظار تأیید استاد',
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.ink2,
                    height: 1.6,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        OutlinedButton.icon(
          onPressed: onCancel,
          icon: const Icon(LucideIcons.x, size: 17),
          label: const Text('لغو جلسه'),
        ),
      ];
    }
    if (session.status == 'done' && !session.rated) {
      return [
        const SizedBox(height: 13),
        FilledButton.icon(
          onPressed: onRate,
          icon: const Icon(LucideIcons.star, size: 18),
          label: const Text('ثبت امتیاز و نظر'),
          style: FilledButton.styleFrom(
            backgroundColor: AppColors.gold,
            foregroundColor: Colors.white,
          ),
        ),
      ];
    }
    return const [];
  }

  static String _faDate(DateTime date) =>
      faDigits('${date.year}/${date.month}/${date.day}');
}
