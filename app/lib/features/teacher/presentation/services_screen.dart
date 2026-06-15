import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/fa.dart';
import '../data/teacher_repository.dart';

/// Teacher services management — connected to API.
class ServicesScreen extends ConsumerStatefulWidget {
  const ServicesScreen({super.key});

  @override
  ConsumerState<ServicesScreen> createState() => _ServicesScreenState();
}

class _ServicesScreenState extends ConsumerState<ServicesScreen> {
  final _titleCtrl = TextEditingController();
  final _priceCtrl = TextEditingController();
  int _duration = 30;
  bool _adding = false;

  @override
  Widget build(BuildContext context) {
    final services = ref.watch(myServicesProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('خدمات من')),
      body: Column(
        children: [
          const Padding(
            padding: EdgeInsets.all(20),
            child: Text(
              'خدماتی که برای قرآن‌آموزان قابل رزرو است.',
              style: TextStyle(fontSize: 13, color: AppColors.ink3, height: 1.9),
            ),
          ),
          Expanded(
            child: services.when(
              loading: () => const Center(child: CircularProgressIndicator(color: AppColors.olive600)),
              error: (e, _) => Center(child: Text('خطا', style: TextStyle(color: AppColors.rose))),
              data: (list) => list.isEmpty && !_adding
                  ? const Center(child: Text('هنوز خدمتی تعریف نشده', style: TextStyle(color: AppColors.ink3)))
                  : ListView.separated(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      itemCount: list.length + (_adding ? 1 : 0),
                      separatorBuilder: (_, _) => const SizedBox(height: 12),
                      itemBuilder: (_, i) {
                        if (_adding && i == list.length) return _addForm();
                        final s = list[i];
                        return _serviceCard(s);
                      },
                    ),
            ),
          ),
          if (!_adding)
            Padding(
              padding: const EdgeInsets.all(20),
              child: SizedBox(
                height: 52, width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => setState(() => _adding = true),
                  icon: const Icon(LucideIcons.plus, size: 19),
                  label: const Text('افزودن خدمت جدید'),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _serviceCard(Map<String, dynamic> s) {
    final id = s['id'] as int;
    final active = s['active'] as bool? ?? true;
    final title = s['title'] as String? ?? '';
    final duration = s['duration'] as int? ?? 30;
    final price = s['price'] as int? ?? 0;

    return AnimatedOpacity(
      duration: const Duration(milliseconds: 200),
      opacity: active ? 1.0 : 0.55,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(18),
            boxShadow: const [BoxShadow(color: Color(0x0A2E3622), blurRadius: 4)]),
        child: Row(
          children: [
            Container(width: 46, height: 46,
                decoration: BoxDecoration(color: AppColors.olive100, borderRadius: BorderRadius.circular(13)),
                child: const Icon(LucideIcons.bookOpen, size: 23, color: AppColors.olive700)),
            const SizedBox(width: 13),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text('${faNumber(duration)} دقیقه · ${faNumber(price)} تومان',
                    style: const TextStyle(fontSize: 12, color: AppColors.ink3)),
              ]),
            ),
            _Toggle(
              on: active,
              onChanged: (_) async {
                await ref.read(teacherRepositoryProvider).updateService(id, active: !active);
                ref.invalidate(myServicesProvider);
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _addForm() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.olive500, width: 1.5),
          boxShadow: const [BoxShadow(color: Color(0x0A2E3622), blurRadius: 4)]),
      child: Column(children: [
        TextField(
          controller: _titleCtrl,
          decoration: const InputDecoration(hintText: 'عنوان خدمت', border: OutlineInputBorder()),
        ),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(
            child: TextField(
              controller: _priceCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(hintText: 'قیمت (تومان)', border: OutlineInputBorder()),
            ),
          ),
          const SizedBox(width: 10),
          DropdownButton<int>(
            value: _duration,
            items: const [
              DropdownMenuItem(value: 30, child: Text('۳۰ دقیقه')),
              DropdownMenuItem(value: 60, child: Text('۶۰ دقیقه')),
            ],
            onChanged: (v) => setState(() => _duration = v ?? 30),
          ),
        ]),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: OutlinedButton(
            onPressed: () { setState(() => _adding = false); _titleCtrl.clear(); _priceCtrl.clear(); },
            child: const Text('انصراف'),
          )),
          const SizedBox(width: 10),
          Expanded(child: ElevatedButton(
            onPressed: () async {
              final title = _titleCtrl.text.trim();
              final price = int.tryParse(_priceCtrl.text.trim()) ?? 0;
              if (title.isEmpty || price <= 0) return;
              await ref.read(teacherRepositoryProvider).addService(title: title, duration: _duration, price: price);
              ref.invalidate(myServicesProvider);
              setState(() => _adding = false);
              _titleCtrl.clear(); _priceCtrl.clear();
            },
            child: const Text('افزودن'),
          )),
        ]),
      ]),
    );
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _priceCtrl.dispose();
    super.dispose();
  }
}

class _Toggle extends StatefulWidget {
  const _Toggle({required this.on, this.onChanged});
  final bool on;
  final ValueChanged<bool>? onChanged;
  @override
  State<_Toggle> createState() => _ToggleState();
}

class _ToggleState extends State<_Toggle> {
  late bool _on;
  @override
  void initState() { super.initState(); _on = widget.on; }
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () { setState(() => _on = !_on); widget.onChanged?.call(_on); },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: 46, height: 28,
        decoration: BoxDecoration(color: _on ? AppColors.olive600 : AppColors.sand200, borderRadius: BorderRadius.circular(999)),
        child: AnimatedAlign(
          duration: const Duration(milliseconds: 200),
          alignment: _on ? Alignment.centerRight : Alignment.centerLeft,
          child: Container(width: 22, height: 22, margin: const EdgeInsets.symmetric(horizontal: 3),
              decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle,
                  boxShadow: [BoxShadow(color: Color(0x33000000), blurRadius: 2)])),
        ),
      ),
    );
  }
}
