import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/error_message.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/vodda_avatar.dart';
import '../data/session_repository.dart';
import '../domain/session.dart';

/// Bottom sheet for rating a finished session (1–5 stars + optional note).
class RatingSheet extends ConsumerStatefulWidget {
  const RatingSheet({super.key, required this.session});
  final Session session;

  @override
  ConsumerState<RatingSheet> createState() => _RatingSheetState();
}

class _RatingSheetState extends ConsumerState<RatingSheet> {
  int _rating = 5;
  final _text = TextEditingController();
  bool _saving = false;

  Future<void> _submit() async {
    setState(() => _saving = true);
    try {
      await ref
          .read(sessionRepositoryProvider)
          .rate(widget.session.id, _rating, _text.text.trim());
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      setState(() => _saving = false);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(errorMessage(e))));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Container(
        decoration: const BoxDecoration(
          color: AppColors.sand50,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        padding: const EdgeInsets.fromLTRB(22, 14, 22, 34),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 42,
              height: 5,
              decoration: BoxDecoration(
                color: AppColors.sand200,
                borderRadius: BorderRadius.circular(9),
              ),
            ),
            const SizedBox(height: 20),
            const VoddaAvatar(size: 64),
            const SizedBox(height: 12),
            Text(
              'جلسه با ${widget.session.teacherName} چطور بود؟',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 4),
            Text(
              widget.session.service,
              style: const TextStyle(fontSize: 12.5, color: AppColors.ink3),
            ),
            const SizedBox(height: 22),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(5, (i) {
                final on = i < _rating;
                return GestureDetector(
                  onTap: () => setState(() => _rating = i + 1),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: Icon(
                      on ? LucideIcons.star : LucideIcons.star,
                      size: 40,
                      color: on ? AppColors.gold : AppColors.sand200,
                    ),
                  ),
                );
              }),
            ),
            const SizedBox(height: 22),
            TextField(
              controller: _text,
              maxLines: 3,
              decoration: const InputDecoration(
                hintText: 'نظر خود را بنویسید… (اختیاری)',
              ),
            ),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: _saving ? null : _submit,
                child: _saving
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2.4,
                        ),
                      )
                    : const Text('ثبت امتیاز'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }
}
