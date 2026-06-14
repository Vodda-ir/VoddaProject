// Basic unit tests for the Vodda app.
import 'package:flutter_test/flutter_test.dart';

import 'package:vodda/core/utils/fa.dart';

void main() {
  test('faNumber groups thousands and uses Persian digits', () {
    expect(faNumber(85000), '۸۵٬۰۰۰');
    expect(toman(150000), '۱۵۰٬۰۰۰ تومان');
  });

  test('faDigits converts ascii digits', () {
    expect(faDigits('2026'), '۲۰۲۶');
  });
}
