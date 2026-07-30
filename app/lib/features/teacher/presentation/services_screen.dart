import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/services/snackbar_service.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/fa.dart';
import '../../../core/widgets/app_error.dart';
import '../data/teacher_repository.dart';

class ServicesScreen extends ConsumerStatefulWidget {
  const ServicesScreen({super.key});

  @override
  ConsumerState<ServicesScreen> createState() => _ServicesScreenState();
}

class _ServicesScreenState extends ConsumerState<ServicesScreen> {
  int? _busyId;

  @override
  Widget build(BuildContext context) {
    final services = ref.watch(myServicesProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('خدمات من')),
      body: Column(
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 8, 20, 16),
            child: Text(
              'خدمت جدید یا ویرایش‌شده تا تأیید مدیر قابل رزرو نیست. فعال‌سازی فقط از پنل مدیریت انجام می‌شود.',
              style: TextStyle(
                fontSize: 13,
                color: AppColors.ink3,
                height: 1.9,
              ),
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              color: AppColors.olive600,
              onRefresh: () async {
                ref.invalidate(myServicesProvider);
                await ref.read(myServicesProvider.future);
              },
              child: services.when(
                loading: () => ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: const [
                    SizedBox(height: 180),
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
                      height: 220,
                      child: AppErrorView(
                        error: error,
                        onRetry: () => ref.invalidate(myServicesProvider),
                      ),
                    ),
                  ],
                ),
                data: (items) => items.isEmpty
                    ? ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        children: const [
                          SizedBox(height: 100),
                          Center(
                            child: Text(
                              'هنوز خدمتی تعریف نشده است',
                              style: TextStyle(color: AppColors.ink3),
                            ),
                          ),
                        ],
                      )
                    : ListView.separated(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                        itemCount: items.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 12),
                        itemBuilder: (_, index) =>
                            _serviceCard(items[index]),
                      ),
              ),
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton.icon(
                  onPressed: () => _openEditor(),
                  icon: const Icon(LucideIcons.plus, size: 19),
                  label: const Text('افزودن خدمت جدید'),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _serviceCard(Map<String, dynamic> service) {
    final id = _asInt(service['id']);
    final active = service['active'] == true;
    final title = '${service['title'] ?? ''}';
    final duration = _asInt(service['duration'], fallback: 30);
    final price = _asInt(service['price']);
    final busy = _busyId == id;

    return AnimatedOpacity(
      duration: const Duration(milliseconds: 180),
      opacity: busy ? 0.55 : 1,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(18),
          boxShadow: const [BoxShadow(color: Color(0x0A2E3622), blurRadius: 4)],
        ),
        child: Column(
          children: [
            Row(
              children: [
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    color: AppColors.olive100,
                    borderRadius: BorderRadius.circular(13),
                  ),
                  child: const Icon(
                    LucideIcons.bookOpen,
                    size: 23,
                    color: AppColors.olive700,
                  ),
                ),
                const SizedBox(width: 13),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              title,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                          _StatusChip(active: active),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${faNumber(duration)} دقیقه · ${faNumber(price)} تومان',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.ink3,
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
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: busy
                        ? null
                        : () => _openEditor(service: service),
                    icon: const Icon(LucideIcons.pencil, size: 16),
                    label: const Text('ویرایش'),
                  ),
                ),
                if (active) ...[
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: busy
                          ? null
                          : () => _deactivate(id, title),
                      child: const Text('غیرفعال‌کردن'),
                    ),
                  ),
                ],
                const SizedBox(width: 8),
                IconButton(
                  tooltip: 'حذف خدمت',
                  onPressed: busy ? null : () => _delete(id, title),
                  icon: const Icon(
                    LucideIcons.trash2,
                    size: 19,
                    color: AppColors.rose,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _deactivate(int id, String title) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('غیرفعال‌کردن خدمت'),
        content: Text(
          'خدمت «$title» غیرفعال شود؟ فعال‌سازی مجدد نیازمند تأیید مدیر است.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('انصراف'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('غیرفعال‌کردن'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() => _busyId = id);
    final saved = await ref
        .read(teacherRepositoryProvider)
        .updateService(id, active: false);
    if (!mounted) return;
    setState(() => _busyId = null);
    if (saved) ref.invalidate(myServicesProvider);
  }

  Future<void> _delete(int id, String title) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('حذف خدمت'),
        content: Text('خدمت «$title» حذف شود؟'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('انصراف'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.rose),
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('حذف'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() => _busyId = id);
    final deleted =
        await ref.read(teacherRepositoryProvider).deleteService(id);
    if (!mounted) return;
    setState(() => _busyId = null);
    if (deleted) ref.invalidate(myServicesProvider);
  }

  Future<void> _openEditor({Map<String, dynamic>? service}) async {
    final titleController =
        TextEditingController(text: '${service?['title'] ?? ''}');
    final durationController = TextEditingController(
      text: '${service?['duration'] ?? 30}',
    );
    final priceController =
        TextEditingController(text: '${service?['price'] ?? ''}');
    var saving = false;
    String? formError;

    final saved = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(service == null ? 'خدمت جدید' : 'ویرایش خدمت'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: titleController,
                  maxLength: 160,
                  decoration: const InputDecoration(labelText: 'عنوان'),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: durationController,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  decoration: const InputDecoration(
                    labelText: 'مدت (۱۰ تا ۲۴۰ دقیقه)',
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: priceController,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  decoration: const InputDecoration(labelText: 'قیمت (تومان)'),
                ),
                if (formError != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    formError!,
                    style: const TextStyle(color: AppColors.rose),
                  ),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed:
                  saving ? null : () => Navigator.pop(dialogContext, false),
              child: const Text('انصراف'),
            ),
            FilledButton(
              onPressed: saving
                  ? null
                  : () async {
                      final title = titleController.text.trim();
                      final duration =
                          int.tryParse(durationController.text.trim());
                      final price = int.tryParse(priceController.text.trim());
                      if (title.isEmpty) {
                        setDialogState(() => formError = 'عنوان را وارد کنید');
                        return;
                      }
                      if (duration == null ||
                          duration < 10 ||
                          duration > 240) {
                        setDialogState(
                          () => formError =
                              'مدت باید بین ۱۰ تا ۲۴۰ دقیقه باشد',
                        );
                        return;
                      }
                      if (price == null || price <= 0) {
                        setDialogState(
                          () => formError = 'قیمت معتبر وارد کنید',
                        );
                        return;
                      }
                      setDialogState(() {
                        saving = true;
                        formError = null;
                      });
                      final repository =
                          ref.read(teacherRepositoryProvider);
                      final success = service == null
                          ? await repository.addService(
                                  title: title,
                                  duration: duration,
                                  price: price,
                                ) !=
                              null
                          : await repository.updateService(
                              _asInt(service['id']),
                              title: title,
                              duration: duration,
                              price: price,
                            );
                      if (!dialogContext.mounted) return;
                      if (success) {
                        Navigator.pop(dialogContext, true);
                      } else {
                        setDialogState(() => saving = false);
                      }
                    },
              child: saving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Text('ذخیره'),
            ),
          ],
        ),
      ),
    );

    titleController.dispose();
    durationController.dispose();
    priceController.dispose();
    if (saved == true) {
      ref.invalidate(myServicesProvider);
      SnackBarService.show(
        service == null
            ? 'خدمت برای بررسی مدیر ثبت شد'
            : 'ویرایش برای بررسی مدیر ثبت شد',
      );
    }
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.active});
  final bool active;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: active ? AppColors.olive100 : AppColors.goldBg,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          active ? 'فعال' : 'غیرفعال / در انتظار تأیید',
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w700,
            color: active ? AppColors.olive700 : AppColors.gold,
          ),
        ),
      );
}

int _asInt(Object? value, {int fallback = 0}) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse('$value') ?? fallback;
}
