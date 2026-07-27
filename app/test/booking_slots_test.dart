import 'package:flutter_test/flutter_test.dart';
import 'package:vodda/features/sessions/domain/booking_slots.dart';

void main() {
  test('parses authoritative availability without device-timezone conversion', () {
    final slot = BookingSlot.fromJson({
      'start_at': '2026-07-27T05:30:00Z',
      'end_at': '2026-07-27T06:00:00Z',
      'local_date': '2026-07-27',
      'local_start': '09:00',
      'local_end': '09:30',
      'weekday': 2,
    });

    expect(slot.startAt.isUtc, isTrue);
    expect(slot.startAt.toIso8601String(), '2026-07-27T05:30:00.000Z');
    expect(slot.localDate, '2026-07-27');
    expect(slot.localStart, '09:00');
    expect(slot.localEnd, '09:30');
    expect(slot.weekday, 2);
  });

  test('uses a safe invalid weekday when the response is malformed', () {
    final slot = BookingSlot.fromJson({
      'start_at': '2026-07-27T05:30:00Z',
      'end_at': '2026-07-27T06:00:00Z',
      'local_date': '2026-07-27',
      'local_start': '09:00',
      'local_end': '09:30',
      'weekday': 'bad',
    });

    expect(slot.weekday, -1);
  });
}
