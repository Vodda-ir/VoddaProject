// Basic unit tests for the Vodda app.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:vodda/core/utils/fa.dart';
import 'package:vodda/core/widgets/vodda_logo.dart';

void main() {
  test('faNumber groups thousands and uses Persian digits', () {
    expect(faNumber(85000), '۸۵٬۰۰۰');
    expect(toman(150000), '۱۵۰٬۰۰۰ تومان');
  });

  test('faDigits converts ascii digits', () {
    expect(faDigits('2026'), '۲۰۲۶');
  });

  testWidgets('VoddaLogo loads the SVG path into its custom painter', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: SizedBox.square(dimension: 180, child: VoddaLogo()),
        ),
      ),
    );
    await tester.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 50)),
    );
    await tester.pump();

    expect(
      find.byWidgetPredicate(
        (widget) => widget is CustomPaint && widget.painter is VoddaLogoPainter,
      ),
      findsOneWidget,
    );
  });
}
