import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/vodda_avatar.dart';
import '../../auth/data/user_repository.dart';

/// Edit profile screen — name, city, bio, avatar upload.
class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  final _nameCtrl = TextEditingController();
  final _cityCtrl = TextEditingController();
  final _bioCtrl = TextEditingController();
  final _tagCtrl = TextEditingController();
  final _picker = ImagePicker();
  XFile? _pickedImage;
  File? _previewFile;
  bool _saving = false;
  bool _isTeacher = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  void _loadUser() {
    final me = ref.read(meProvider).valueOrNull;
    if (me == null) {
      Future.microtask(() {
        if (mounted) context.pop();
      });
      return;
    }
    _nameCtrl.text = me.name;
    _cityCtrl.text = me.city;
    _bioCtrl.text = me.bio;
    _tagCtrl.text = me.teacherTag ?? '';
    _isTeacher = me.isTeacher;
  }

  Future<void> _pickImage() async {
    try {
      final img = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 512,
        maxHeight: 512,
        imageQuality: 85,
      );
      if (img != null) {
        setState(() {
          _pickedImage = img;
          _previewFile = File(img.path);
        });
      }
    } catch (_) {
      // user cancelled or error — silently ignore
    }
  }

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _error = null;
    });
    final repo = ref.read(userRepositoryProvider);
    final user = await repo.updateProfile(
      name: _nameCtrl.text.trim(),
      city: _cityCtrl.text.trim(),
      bio: _bioCtrl.text.trim(),
      avatar: _pickedImage,
    );
    if (user == null) {
      // Error already shown via SnackBar by the repository
      if (mounted) setState(() => _saving = false);
      return;
    }
    if (_isTeacher) {
      await repo.updateTeacherTag(_tagCtrl.text.trim());
    }
    ref.invalidate(meProvider);
    // Force immediate re-fetch so the parent screen shows fresh data.
    await ref.read(meProvider.future);
    if (mounted) context.pop(true);
    if (mounted) setState(() => _saving = false);
  }

  @override
  Widget build(BuildContext context) {
    final meAsync = ref.watch(meProvider);
    final me = meAsync.valueOrNull;
    final mobile = me?.mobile ?? '';

    return Scaffold(
      appBar: AppBar(
        title: const Text('ویرایش پروفایل'),
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowRight),
          onPressed: () => context.pop(),
        ),
        actions: [
          TextButton(
            onPressed: _saving ? null : _save,
            child: _saving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppColors.olive600,
                    ),
                  )
                : const Text(
                    'ذخیره',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: AppColors.olive600,
                      fontSize: 15,
                    ),
                  ),
          ),
        ],
      ),
      body: meAsync.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppColors.olive600),
        ),
        error: (_, _) => const Center(child: Text('خطا در بارگذاری')),
        data: (_) => ListView(
          padding: const EdgeInsets.all(20),
          children: [
            // Avatar section
            Center(
              child: Column(
                children: [
                  GestureDetector(
                    onTap: _saving ? null : _pickImage,
                    child: Stack(
                      children: [
                        VoddaAvatar(
                          size: 88,
                          ring: true,
                          localPath: _previewFile?.path,
                          imageUrl: _previewFile == null ? me?.avatarUrl : null,
                        ),
                        Positioned(
                          bottom: 0,
                          right: 0,
                          child: Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: AppColors.olive600,
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: AppColors.surface,
                                width: 2,
                              ),
                            ),
                            child: const Icon(
                              LucideIcons.camera,
                              size: 16,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  GestureDetector(
                    onTap: _saving ? null : _pickImage,
                    child: Text(
                      _pickedImage != null ? 'تغییر تصویر' : 'افزودن تصویر',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.olive600,
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    width: 48,
                    height: 3,
                    decoration: BoxDecoration(
                      color: AppColors.olive200,
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 28),

            // Name
            _label('نام و نام خانوادگی'),
            const SizedBox(height: 6),
            _field(
              _nameCtrl,
              hint: 'نام خود را وارد کنید',
              icon: LucideIcons.user,
            ),
            const SizedBox(height: 18),

            // Tag (teacher only)
            if (_isTeacher) ...[
              _label('عنوان تخصصی'),
              const SizedBox(height: 6),
              _field(
                _tagCtrl,
                hint: 'مثلاً: مدرس تجوید و روان‌خوانی',
                icon: LucideIcons.award,
              ),
              const SizedBox(height: 18),
            ],

            // Mobile (read-only)
            _label('شماره موبایل'),
            const SizedBox(height: 6),
            Container(
              decoration: BoxDecoration(
                color: AppColors.sand100,
                borderRadius: BorderRadius.circular(16),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              child: Row(
                children: [
                  const Icon(
                    LucideIcons.phone,
                    size: 19,
                    color: AppColors.ink4,
                  ),
                  const SizedBox(width: 12),
                  Text(
                    _formatMobile(mobile),
                    style: const TextStyle(
                      fontSize: 15,
                      color: AppColors.ink3,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.sand200,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: const Text(
                      'قابل تغییر نیست',
                      style: TextStyle(
                        fontSize: 11,
                        color: AppColors.ink4,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),

            // City
            _label('شهر'),
            const SizedBox(height: 6),
            _field(
              _cityCtrl,
              hint: 'شهر خود را وارد کنید',
              icon: LucideIcons.mapPin,
            ),
            const SizedBox(height: 18),

            // Bio
            _label('دربارهٔ شما'),
            const SizedBox(height: 6),
            TextField(
              controller: _bioCtrl,
              maxLines: 4,
              maxLength: 200,
              textDirection: TextDirection.rtl,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w500,
                color: AppColors.ink,
              ),
              decoration: InputDecoration(
                hintText: 'چند خط دربارهٔ خودتان بنویسید…',
                hintStyle: const TextStyle(color: AppColors.ink4, fontSize: 14),
                hintTextDirection: TextDirection.rtl,
                filled: true,
                fillColor: AppColors.surface,
                counterStyle: const TextStyle(
                  color: AppColors.ink4,
                  fontSize: 11,
                ),
                contentPadding: const EdgeInsets.all(14),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: AppColors.sand200),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: AppColors.sand200),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(
                    color: AppColors.olive500,
                    width: 1.6,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Error
            if (_error != null)
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.clayBg,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  children: [
                    const Icon(
                      LucideIcons.info,
                      size: 18,
                      color: AppColors.rose,
                    ),
                    const SizedBox(width: 10),
                    Text(
                      _error!,
                      style: const TextStyle(
                        color: AppColors.rose,
                        fontSize: 13,
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

  Widget _label(String text) {
    return Text(
      text,
      style: const TextStyle(
        fontSize: 13.5,
        fontWeight: FontWeight.w700,
        color: AppColors.ink2,
      ),
    );
  }

  Widget _field(
    TextEditingController ctrl, {
    required String hint,
    required IconData icon,
  }) {
    return TextField(
      controller: ctrl,
      textDirection: TextDirection.rtl,
      style: const TextStyle(
        fontSize: 15,
        fontWeight: FontWeight.w500,
        color: AppColors.ink,
      ),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: AppColors.ink4, fontSize: 14),
        hintTextDirection: TextDirection.rtl,
        prefixIcon: Icon(icon, size: 19, color: AppColors.ink4),
        filled: true,
        fillColor: AppColors.surface,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 16,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.sand200),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.sand200),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.olive500, width: 1.6),
        ),
      ),
    );
  }

  String _formatMobile(String mobile) {
    if (mobile.length < 11) return mobile;
    return '${mobile.substring(0, 4)} ${mobile.substring(4, 7)} ${mobile.substring(7, 10)} ${mobile.substring(10)}';
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _cityCtrl.dispose();
    _bioCtrl.dispose();
    _tagCtrl.dispose();
    super.dispose();
  }
}
