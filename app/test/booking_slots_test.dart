import 'package:flutter_test/flutter_test.dart';
import 'package:vodda/features/sessions/domain/booking_slots.dart';

void main() {
  DateTime date(int year, int month, int day, [int hour = 0, int minute = 0]) =>
      DateTime(year, month, day, hour, minute);

  test('splits work range using service duration', () {
    final selected = date(2026, 7, 27);
    final ranges = [
      BookingWorkRange(
        weekday: voddaWeekday(selected),
        from: '09:00',
        to: '12:00',
      ),
    ];

    final slots = generateBookingSlots(
      workTimes: ranges,
      durationMinutes: 30,
      date: selected,
      now: date(2026, 7, 26),
    );

    expect(
      slots.map((slot) => slot.startLabel),
      ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'],
    );
  });

  test('does not create a service that exceeds the range', () {
    final selected = date(2026, 7, 27);
    final slots = generateBookingSlots(
      workTimes: [
        BookingWorkRange(
          weekday: voddaWeekday(selected),
          from: '09:00',
          to: '10:30',
        ),
      ],
      durationMinutes: 60,
      date: selected,
      now: date(2026, 7, 26),
    );

    expect(slots.map((slot) => slot.startLabel), ['09:00']);
  });

  test('filters past slots for today', () {
    final now = date(2026, 7, 27, 9, 20);
    final slots = generateBookingSlots(
      workTimes: [
        BookingWorkRange(
          weekday: voddaWeekday(now),
          from: '09:00',
          to: '11:00',
        ),
      ],
      durationMinutes: 30,
      date: now,
      now: now,
      leadMinutes: 5,
    );

    expect(slots.map((slot) => slot.startLabel), ['09:30', '10:00', '10:30']);
  });

  test('calendar dates include today', () {
    final dates = nextBookingDates(count: 3, now: date(2026, 7, 27, 20));
    expect(dates.length, 3);
    expect(dates.first, date(2026, 7, 27));
    expect(dates.last, date(2026, 7, 29));
  });
}
