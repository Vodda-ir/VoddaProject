import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/fa.dart';

/// Teacher services management — matches design's ServicesScreen.
class ServicesScreen extends StatefulWidget {
  const ServicesScreen({super.key});

  @override
  State<ServicesScreen> createState() => _ServicesScreenState();
}

class _ServicesScreenState extends State<ServicesScreen> {
  final _services = [
    (
      id: 's1',
      title: 'تصحیح قرائت و تجوید',
      dur: '۳۰ دقیقه',
      price: 80000,
      icon: Icons.menu_book,
      active: true,
    ),
    (
      id: 's2',
      title: 'روان‌خوانی از پایه',
      dur: '۳۰ دقیقه',
      price: 80000,
      icon: Icons.auto_stories,
      active: true,
    ),
    (
      id: 's3',
      title: 'دورهٔ تجوید پیشرفته',
      dur: '۶۰ دقیقه',
      price: 140000,
      icon: Icons.workspace_premium_outlined,
      active: false,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('خدمات من')),
      body: Column(
        children: [
          const Padding(
            padding: EdgeInsets.all(20),
            child: Text(
              'خدماتی که برای قرآن‌آموزان قابل رزرو است. می‌توانید هر خدمت را فعال یا غیرفعال کنید.',
              style: TextStyle(
                fontSize: 13,
                color: AppColors.ink3,
                height: 1.9,
              ),
            ),
          ),
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              itemCount: _services.length,
              separatorBuilder: (_, _) => const SizedBox(height: 12),
              itemBuilder: (_, i) {
                final s = _services[i];
                return AnimatedOpacity(
                  duration: const Duration(milliseconds: 200),
                  opacity: s.active ? 1.0 : 0.55,
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(18),
                      boxShadow: const [
                        BoxShadow(color: Color(0x0A2E3622), blurRadius: 4),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 46,
                          height: 46,
                          decoration: BoxDecoration(
                            color: AppColors.olive100,
                            borderRadius: BorderRadius.circular(13),
                          ),
                          child: Icon(
                            s.icon,
                            size: 23,
                            color: AppColors.olive700,
                          ),
                        ),
                        const SizedBox(width: 13),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                s.title,
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${s.dur} · ${faNumber(s.price)} تومان',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.ink3,
                                ),
                              ),
                            ],
                          ),
                        ),
                        _Toggle(
                          on: s.active,
                          onChanged: (_) => setState(
                            () => _services[i] = (
                              id: s.id,
                              title: s.title,
                              dur: s.dur,
                              price: s.price,
                              icon: s.icon,
                              active: !s.active,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: SizedBox(
              height: 52,
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.add, size: 19),
                label: const Text('افزودن خدمت جدید'),
              ),
            ),
          ),
        ],
      ),
    );
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
  void initState() {
    super.initState();
    _on = widget.on;
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        setState(() => _on = !_on);
        widget.onChanged?.call(_on);
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: 46,
        height: 28,
        decoration: BoxDecoration(
          color: _on ? AppColors.olive600 : AppColors.sand200,
          borderRadius: BorderRadius.circular(999),
        ),
        child: AnimatedAlign(
          duration: const Duration(milliseconds: 200),
          alignment: _on ? Alignment.centerRight : Alignment.centerLeft,
          child: Container(
            width: 22,
            height: 22,
            margin: const EdgeInsets.symmetric(horizontal: 3),
            decoration: const BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              boxShadow: [BoxShadow(color: Color(0x33000000), blurRadius: 2)],
            ),
          ),
        ),
      ),
    );
  }
}
