import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:flutter/services.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/fa.dart';

/// Teacher withdraw request screen — matches design's WithdrawScreen.
class WithdrawScreen extends StatefulWidget {
  const WithdrawScreen({super.key});

  @override
  State<WithdrawScreen> createState() => _WithdrawScreenState();
}

class _WithdrawScreenState extends State<WithdrawScreen> {
  final _amount = TextEditingController();
  bool _done = false;

  @override
  Widget build(BuildContext context) {
    if (_done) {
      return Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const SizedBox(width: 92, height: 92),
                Container(
                  width: 92,
                  height: 92,
                  decoration: BoxDecoration(
                    color: AppColors.olive100,
                    borderRadius: BorderRadius.circular(46),
                  ),
                  child: const Icon(
                    LucideIcons.checkCircle,
                    size: 52,
                    color: AppColors.olive600,
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'درخواست برداشت ثبت شد',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 10),
                Text(
                  'مبلغ ${faNumber(int.tryParse(_amount.text) ?? 0)} تومان پس از بررسی توسط وُدّا، طی ۲۴ تا ۷۲ ساعت به حساب بانکی شما واریز می‌شود.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 14,
                    height: 2,
                    color: AppColors.ink2,
                  ),
                ),
                const SizedBox(height: 26),
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('بازگشت به کیف پول'),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final qAmounts = [500000, 1000000, 1840000];

    return Scaffold(
      appBar: AppBar(title: const Text('برداشت وجه')),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.olive50,
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'موجودی قابل برداشت',
                        style: TextStyle(fontSize: 13, color: AppColors.ink2),
                      ),
                      Text(
                        '۱,۸۴۰,۰۰۰ تومان',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: AppColors.olive700,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 22),
                const Text(
                  'مبلغ برداشت',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 10),
                Container(
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(18),
                    boxShadow: const [
                      BoxShadow(color: Color(0x0A2E3622), blurRadius: 4),
                    ],
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _amount,
                          keyboardType: TextInputType.number,
                          inputFormatters: [
                            FilteringTextInputFormatter.digitsOnly,
                          ],
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                          ),
                          decoration: const InputDecoration(
                            hintText: '۰',
                            hintStyle: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w800,
                              color: AppColors.ink4,
                            ),
                            border: InputBorder.none,
                            contentPadding: EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 14,
                            ),
                          ),
                        ),
                      ),
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 8),
                        child: Text(
                          'تومان',
                          style: TextStyle(
                            fontSize: 13,
                            color: AppColors.ink3,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: qAmounts.map((a) {
                    final label = a >= 1000000
                        ? '${faNumber((a ~/ 1000000))} میلیون'
                        : '${faNumber((a ~/ 1000))} هزار';
                    return Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        child: GestureDetector(
                          onTap: () => setState(() => _amount.text = '$a'),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 11),
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(13),
                              boxShadow: const [
                                BoxShadow(
                                  color: Color(0x0A2E3622),
                                  blurRadius: 4,
                                ),
                              ],
                            ),
                            child: Text(
                              label,
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w700,
                                color: AppColors.ink2,
                              ),
                            ),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 24),
                const Text(
                  'واریز به',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 10),
                Container(
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
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: AppColors.olive100,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(
                          LucideIcons.creditCard,
                          size: 22,
                          color: AppColors.olive700,
                        ),
                      ),
                      const SizedBox(width: 13),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'کارت بانک ملت',
                              style: TextStyle(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            SizedBox(height: 3),
                            Text(
                              '۶۰۳۷ - ۹۹۱۴ - •••• - ••••',
                              style: TextStyle(
                                fontSize: 12,
                                color: AppColors.ink3,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Icon(
                        LucideIcons.check,
                        size: 18,
                        color: AppColors.olive600,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton.icon(
                onPressed: _amount.text.isNotEmpty
                    ? () => setState(() => _done = true)
                    : null,
                icon: const Icon(LucideIcons.check, size: 19),
                label: const Text('ثبت درخواست برداشت'),
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _amount.dispose();
    super.dispose();
  }
}
