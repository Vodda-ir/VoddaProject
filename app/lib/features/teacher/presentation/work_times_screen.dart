import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_colors.dart';

/// Teacher work times management — matches design's WorkTimesScreen.
class WorkTimesScreen extends StatefulWidget {
  const WorkTimesScreen({super.key});

  @override
  State<WorkTimesScreen> createState() => _WorkTimesScreenState();
}

class _WorkTimesScreenState extends State<WorkTimesScreen> {
  final _days = [
    (day: 'شنبه', on: true, ranges: ['۱۶:۰۰ تا ۲۱:۰۰']),
    (day: 'یکشنبه', on: true, ranges: ['۱۰:۰۰ تا ۱۲:۰۰', '۱۷:۰۰ تا ۲۰:۰۰']),
    (day: 'دوشنبه', on: false, ranges: <String>[]),
    (day: 'سه‌شنبه', on: true, ranges: ['۱۶:۰۰ تا ۲۲:۰۰']),
    (day: 'چهارشنبه', on: true, ranges: ['۱۸:۰۰ تا ۲۲:۰۰']),
    (day: 'پنج‌شنبه', on: true, ranges: ['۰۹:۰۰ تا ۱۳:۰۰']),
    (day: 'جمعه', on: false, ranges: <String>[]),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('زمان‌های کاری')),
      body: Column(
        children: [
          const Padding(
            padding: EdgeInsets.all(20),
            child: Text(
              'روزها و ساعت‌هایی که برای برگزاری جلسه در دسترس هستید را مشخص کنید.',
              style: TextStyle(
                fontSize: 13,
                color: AppColors.ink3,
                height: 1.9,
              ),
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              children: _days.asMap().entries.map((e) {
                final i = e.key;
                final d = e.value;
                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(18),
                    boxShadow: const [
                      BoxShadow(color: Color(0x0A2E3622), blurRadius: 4),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            d.day,
                            style: TextStyle(
                              fontSize: 14.5,
                              fontWeight: FontWeight.w700,
                              color: d.on ? AppColors.ink : AppColors.ink4,
                            ),
                          ),
                          _Toggle(
                            on: d.on,
                            onChanged: (_) => setState(
                              () => _days[i] = (
                                day: d.day,
                                on: !d.on,
                                ranges: d.ranges,
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (d.on && d.ranges.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            ...d.ranges.map(
                              (r) => Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 7,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.olive50,
                                  borderRadius: BorderRadius.circular(999),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(
                                      LucideIcons.clock,
                                      size: 14,
                                      color: AppColors.olive700,
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      r,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: AppColors.olive700,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 7,
                              ),
                              decoration: BoxDecoration(
                                color: AppColors.sand100,
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    LucideIcons.plus,
                                    size: 14,
                                    color: AppColors.ink3,
                                  ),
                                  SizedBox(width: 4),
                                  Text(
                                    'بازه',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.ink3,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ],
                      if (d.on && d.ranges.isEmpty) ...[
                        const SizedBox(height: 12),
                        const Row(
                          children: [
                            Icon(
                              LucideIcons.plus,
                              size: 15,
                              color: AppColors.olive600,
                            ),
                            SizedBox(width: 5),
                            Text(
                              'افزودن بازهٔ زمانی',
                              style: TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w700,
                                color: AppColors.olive600,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                );
              }).toList(),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: SizedBox(
              height: 52,
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {},
                icon: const Icon(LucideIcons.check, size: 19),
                label: const Text('ذخیرهٔ تغییرات'),
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
