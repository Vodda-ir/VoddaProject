import 'package:flutter_test/flutter_test.dart';
import 'package:vodda/features/sessions/domain/session.dart';

void main() {
  test('parses official business-timezone session display fields', () {
    final session = Session.fromJson({
      'id': 7,
      'teacher_id': 3,
      'service': 'روخوانی',
      'scheduled_at': '2026-07-30T05:30:00Z',
      'local_date': '2026-07-30',
      'local_start': '09:00',
      'local_end': '09:30',
      'weekday': 5,
      'duration': 30,
      'price': 150000,
      'status': 'confirmed',
      'rated': false,
      'learner': {'name': 'فاطمه'},
      'teacher': {
        'id': 3,
        'user': {'name': 'استاد نمونه'},
      },
    });

    expect(session.scheduledAt.isUtc, isTrue);
    expect(session.localDate, '2026-07-30');
    expect(session.localStart, '09:00');
    expect(session.localEnd, '09:30');
    expect(session.hasOfficialLocalTime, isTrue);
    expect(session.learnerName, 'فاطمه');
    expect(session.teacherName, 'استاد نمونه');
  });

  test('does not invent official local time when response omits it', () {
    final session = Session.fromJson({
      'id': 1,
      'scheduled_at': '2026-07-30T05:30:00Z',
    });

    expect(session.hasOfficialLocalTime, isFalse);
    expect(session.localStart, isEmpty);
  });
}
