import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/fa.dart';
import '../../../core/widgets/app_error.dart';
import '../../../core/widgets/vodda_avatar.dart';
import '../../sessions/data/session_repository.dart';
import '../../sessions/domain/session.dart';

/// Teacher incoming session requests screen.
class RequestsScreen extends ConsumerWidget {
  const RequestsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessions = ref.watch(mySessionsProvider('pending'));

    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'درخواست‌های دریافتی',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
                ),
                sessions.maybeWhen(
                  data: (list) => Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      '${faNumber(list.length)} درخواست در انتظار پاسخ شما',
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.ink3,
                      ),
                    ),
                  ),
                  orElse: () => const SizedBox.shrink(),
                ),
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
                onRetry: () => ref.invalidate(mySessionsProvider('pending')),
              ),
              data: (list) => list.isEmpty
                  ? const Center(
                      child: Text(
                        'درخواستی در انتظار پاسخ نیست',
                        style: TextStyle(color: AppColors.ink3),
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                      itemCount: list.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 14),
                      itemBuilder: (_, i) => _RequestCard(session: list[i]),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

class _RequestCard extends ConsumerWidget {
  const _RequestCard({required this.session});
  final Session session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
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
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: AppColors.clayBg,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: const Text(
                  'جدید',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: AppColors.clay,
                  ),
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
                  Icons.calendar_today_outlined,
                  size: 16,
                  color: AppColors.olive500,
                ),
                const SizedBox(width: 5),
                Text(
                  session.scheduledAt.toIso8601String().substring(0, 10),
                  style: const TextStyle(fontSize: 12.5, color: AppColors.ink2),
                ),
                const SizedBox(width: 14),
                const Icon(
                  Icons.access_time,
                  size: 16,
                  color: AppColors.olive500,
                ),
                const SizedBox(width: 5),
                Text(
                  faDigits(
                    '${session.scheduledAt.hour.toString().padLeft(2, '0')}:${session.scheduledAt.minute.toString().padLeft(2, '0')}',
                  ),
                  style: const TextStyle(fontSize: 12.5, color: AppColors.ink2),
                ),
                const Spacer(),
                Text(
                  '${faNumber(session.price)} ت',
                  style: const TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w800,
                    color: AppColors.olive700,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 13),
          SizedBox(
            height: 44,
            child: ElevatedButton(
              onPressed: () async {
                await ref.read(sessionRepositoryProvider).accept(session.id);
                ref.invalidate(mySessionsProvider('pending'));
              },
              child: const Text('بررسی و پاسخ'),
            ),
          ),
        ],
      ),
    );
  }
}
