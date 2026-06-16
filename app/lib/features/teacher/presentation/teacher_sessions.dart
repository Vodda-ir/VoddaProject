import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/fa.dart';
import '../../../core/widgets/app_error.dart';
import '../../../core/widgets/status_pill.dart';
import '../../../core/widgets/vodda_avatar.dart';
import '../../sessions/data/session_repository.dart';
import '../../sessions/domain/session.dart';

/// Teacher's own sessions (upcoming / past).
class TeacherSessions extends ConsumerStatefulWidget {
  const TeacherSessions({super.key});

  @override
  ConsumerState<TeacherSessions> createState() => _TeacherSessionsState();
}

class _TeacherSessionsState extends ConsumerState<TeacherSessions> {
  String _tab = 'upcoming';

  @override
  Widget build(BuildContext context) {
    final sessions = ref.watch(myTeacherSessionsProvider(_tab));
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
                onRetry: () => ref.invalidate(myTeacherSessionsProvider(_tab)),
              ),
              data: (list) => list.isEmpty
                  ? const Center(
                      child: Text(
                        'جلسه‌ای نیست',
                        style: TextStyle(color: AppColors.ink3),
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                      itemCount: list.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 14),
                      itemBuilder: (_, i) => _TSessionCard(session: list[i]),
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
}

class _TSessionCard extends StatelessWidget {
  const _TSessionCard({required this.session});
  final Session session;

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
                '${faNumber(s.duration)} دقیقه · ${faNumber(s.price)} ت',
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
                  s.scheduledAt.toIso8601String().substring(0, 10),
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
          if (s.status == 'confirmed') ...[
            const SizedBox(height: 13),
            SizedBox(
              height: 44,
              child: ElevatedButton.icon(
                onPressed: () {},
                icon: const Icon(LucideIcons.phone, size: 18),
                label: const Text('شروع جلسه'),
              ),
            ),
          ],
          if (s.status == 'done' && s.rated) ...[
            const SizedBox(height: 13),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text(
                  'امتیاز قرآن‌آموز:',
                  style: TextStyle(fontSize: 12.5, color: AppColors.ink3),
                ),
                const SizedBox(width: 8),
                ...List.generate(
                  5,
                  (i) => Icon(
                    LucideIcons.star,
                    size: 18,
                    color: i < 4 ? AppColors.gold : AppColors.sand200,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
