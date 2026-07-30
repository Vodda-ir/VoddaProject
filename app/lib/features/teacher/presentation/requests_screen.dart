import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/fa.dart';
import '../../../core/widgets/app_error.dart';
import '../../../core/widgets/vodda_avatar.dart';
import '../../sessions/data/session_repository.dart';
import '../../sessions/domain/session.dart';

class RequestsScreen extends ConsumerStatefulWidget {
  const RequestsScreen({super.key});

  @override
  ConsumerState<RequestsScreen> createState() => _RequestsScreenState();
}

class _RequestsScreenState extends ConsumerState<RequestsScreen> {
  int? _busyId;

  @override
  Widget build(BuildContext context) {
    final sessions = ref.watch(myTeacherSessionsProvider('pending'));
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
                  data: (items) => Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      '${faNumber(items.length)} درخواست در انتظار پاسخ شما',
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
            child: RefreshIndicator(
              color: AppColors.olive600,
              onRefresh: () async {
                ref.invalidate(myTeacherSessionsProvider('pending'));
                await ref.read(myTeacherSessionsProvider('pending').future);
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
                        onRetry: () => ref.invalidate(
                          myTeacherSessionsProvider('pending'),
                        ),
                      ),
                    ),
                  ],
                ),
                data: (items) => items.isEmpty
                    ? const Center(
                        child: Text(
                          'درخواستی در انتظار پاسخ نیست',
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
                          return _RequestCard(
                            session: session,
                            busy: _busyId == session.id,
                            onAccept: () => _respond(session, true),
                            onReject: () => _respond(session, false),
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

  Future<void> _respond(Session session, bool accept) async {
    if (_busyId != null) return;
    final action = accept ? 'تأیید' : 'رد';
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text('$action درخواست'),
        content: Text('درخواست جلسهٔ ${session.learnerName} $action شود؟'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('انصراف'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: Text(action),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() => _busyId = session.id);
    final repository = ref.read(sessionRepositoryProvider);
    final saved = accept
        ? await repository.accept(session.id)
        : await repository.reject(session.id);
    if (!mounted) return;
    setState(() => _busyId = null);
    if (saved) ref.invalidate(myTeacherSessionsProvider('pending'));
  }
}

class _RequestCard extends StatelessWidget {
  const _RequestCard({
    required this.session,
    required this.busy,
    required this.onAccept,
    required this.onReject,
  });

  final Session session;
  final bool busy;
  final VoidCallback onAccept;
  final VoidCallback onReject;

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
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
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
          if (session.note.isNotEmpty) ...[
            const SizedBox(height: 9),
            Text(
              'یادداشت: ${session.note}',
              style: const TextStyle(fontSize: 12, color: AppColors.ink3),
            ),
          ],
          const SizedBox(height: 13),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: busy ? null : onReject,
                  child: const Text('رد'),
                ),
              ),
              const SizedBox(width: 9),
              Expanded(
                child: FilledButton(
                  onPressed: busy ? null : onAccept,
                  child: busy
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text('تأیید'),
                ),
              ),
            ],
          ),
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
