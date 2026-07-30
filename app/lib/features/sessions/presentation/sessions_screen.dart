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
  int? _busyId;

  @override
  Widget build(BuildContext context) {
    final sessions = ref.watch(mySessionsProvider(_tab));
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 12, 20, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'جلسات من',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
                ),
                SizedBox(height: 4),
                Text(
                  'زمان‌ها بر اساس ساعت رسمی سامانه نمایش داده می‌شوند.',
                  style: TextStyle(fontSize: 12.5, color: AppColors.ink3),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 18),
            child: Row(
              children: [
                _tabButton('upcoming', 'پیش‌رو'),
                const SizedBox(width: 8),
                _tabButton('past', 'گذشته'),
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
                  physics: const AlwaysScrollableScrollPhysics(),
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
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: [
                    SizedBox(
                      height: 240,
                      child: AppErrorView(
                        error: error,
                        onRetry: () =>
                            ref.invalidate(mySessionsProvider(_tab)),
                      ),
                    ),
                  ],
                ),
                data: (items) => items.isEmpty
                    ? const EmptyState(
                        icon: LucideIcons.calendar,
                        title: 'جلسه‌ای نیست',
                        sub: 'هنوز جلسه‌ای در این بخش ندارید.',
                      )
                    : ListView.separated(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                        itemCount: items.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 14),
                        itemBuilder: (_, index) {
                          final session = items[index];
                          return _SessionCard(
                            session: session,
                            busy: _busyId == session.id,
                            onRate: () => _openRating(session),
                            onCancel: () => _cancel(session),
                          );
                        },
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
    if (_busyId != null) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('لغو جلسه'),
        content: const Text(
          'لغو فقط پیش از زمان شروع مجاز است. در صورت موفقیت، مبلغ به کیف پول بازمی‌گردد.',
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
    if (confirmed != true || !mounted) return;
    setState(() => _busyId = session.id);
    final canceled =
        await ref.read(sessionRepositoryProvider).cancel(session.id);
    if (!mounted) return;
    setState(() => _busyId = null);
    if (canceled) ref.invalidate(mySessionsProvider(_tab));
  }
}

class _SessionCard extends StatelessWidget {
  const _SessionCard({
    required this.session,
    required this.busy,
    required this.onRate,
    required this.onCancel,
  });

  final Session session;
  final bool busy;
  final VoidCallback onRate;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    final canCancel = session.isUpcoming &&
        DateTime.now().isBefore(session.scheduledAt);
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
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    session.hasOfficialLocalTime
                        ? '${_faLocalDate(session.localDate)} · ${faDigits(session.localStart)} تا ${faDigits(session.localEnd)}'
                        : 'زمان رسمی جلسه دریافت نشد',
                    style: const TextStyle(
                      fontSize: 12.5,
                      color: AppColors.ink2,
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (session.rejectNote.isNotEmpty) ...[
            const SizedBox(height: 9),
            Text(
              'دلیل لغو: ${session.rejectNote}',
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.clay,
              ),
            ),
          ],
          if (session.status == 'pending' ||
              session.status == 'confirmed') ...[
            const SizedBox(height: 11),
            Text(
              session.status == 'confirmed'
                  ? 'جلسه تأیید شده است. جزئیات برگزاری را با استاد هماهنگ کنید.'
                  : 'در انتظار تأیید استاد',
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.ink3,
                height: 1.6,
              ),
            ),
            if (canCancel) ...[
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: busy ? null : onCancel,
                icon: busy
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(LucideIcons.x, size: 17),
                label: Text(busy ? 'در حال لغو…' : 'لغو جلسه'),
              ),
            ],
          ],
          if (session.status == 'done' && !session.rated) ...[
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
          ],
        ],
      ),
    );
  }
}

String _faLocalDate(String value) {
  final parts = value.split('-');
  if (parts.length != 3) return value;
  return faDigits('${parts[0]}/${parts[1]}/${parts[2]}');
}
