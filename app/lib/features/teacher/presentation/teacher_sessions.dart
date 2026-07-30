import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/fa.dart';
import '../../../core/widgets/app_error.dart';
import '../../../core/widgets/status_pill.dart';
import '../../../core/widgets/vodda_avatar.dart';
import '../../sessions/data/session_repository.dart';
import '../../sessions/domain/session.dart';

class TeacherSessions extends ConsumerStatefulWidget {
  const TeacherSessions({super.key});

  @override
  ConsumerState<TeacherSessions> createState() => _TeacherSessionsState();
}

class _TeacherSessionsState extends ConsumerState<TeacherSessions> {
  String _tab = 'upcoming';
  int? _busyId;

  @override
  Widget build(BuildContext context) {
    final sessions = ref.watch(myTeacherSessionsProvider(_tab));
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
                ref.invalidate(myTeacherSessionsProvider(_tab));
                await ref.read(myTeacherSessionsProvider(_tab).future);
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
                            ref.invalidate(myTeacherSessionsProvider(_tab)),
                      ),
                    ),
                  ],
                ),
                data: (items) => items.isEmpty
                    ? const Center(
                        child: Text(
                          'جلسه‌ای در این بخش نیست',
                          style: TextStyle(color: AppColors.ink3),
                        ),
                      )
                    : ListView.separated(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                        itemCount: items.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 14),
                        itemBuilder: (_, index) {
                          final session = items[index];
                          return _TeacherSessionCard(
                            session: session,
                            busy: _busyId == session.id,
                            onComplete: () => _complete(session),
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

  Future<void> _complete(Session session) async {
    if (_busyId != null) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('ثبت برگزاری جلسه'),
        content: const Text(
          'پس از ثبت برگزاری، مبلغ جلسه تسویه و امکان امتیازدهی برای قرآن‌آموز فعال می‌شود.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('انصراف'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('ثبت برگزاری'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() => _busyId = session.id);
    final completed =
        await ref.read(sessionRepositoryProvider).complete(session.id);
    if (!mounted) return;
    setState(() => _busyId = null);
    if (completed) ref.invalidate(myTeacherSessionsProvider(_tab));
  }
}

class _TeacherSessionCard extends StatelessWidget {
  const _TeacherSessionCard({
    required this.session,
    required this.busy,
    required this.onComplete,
  });

  final Session session;
  final bool busy;
  final VoidCallback onComplete;

  @override
  Widget build(BuildContext context) {
    final canComplete = session.status == 'confirmed' &&
        !DateTime.now().isBefore(
          session.scheduledAt.add(Duration(minutes: session.duration)),
        );
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
                '${faNumber(session.duration)} دقیقه · ${faNumber(session.price)} ت',
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
                      session.learnerName,
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
          if (session.note.isNotEmpty) ...[
            const SizedBox(height: 9),
            Text(
              'یادداشت: ${session.note}',
              style: const TextStyle(fontSize: 12, color: AppColors.ink3),
            ),
          ],
          if (session.status == 'confirmed') ...[
            const SizedBox(height: 13),
            FilledButton.icon(
              onPressed: canComplete && !busy ? onComplete : null,
              icon: busy
                  ? const SizedBox(
                      width: 17,
                      height: 17,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(LucideIcons.checkCircle, size: 18),
              label: Text(
                busy
                    ? 'در حال ثبت…'
                    : canComplete
                        ? 'ثبت برگزاری جلسه'
                        : 'پس از پایان جلسه قابل ثبت است',
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
