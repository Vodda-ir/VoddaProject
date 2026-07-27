class BookingWorkRange {
  const BookingWorkRange({
    required this.weekday,
    required this.from,
    required this.to,
    this.active = true,
  });

  factory BookingWorkRange.fromJson(Map<String, dynamic> json) {
    return BookingWorkRange(
      weekday: int.tryParse('${json['weekday']}') ?? -1,
      from: '${json['from'] ?? ''}',
      to: '${json['to'] ?? ''}',
      active: json['active'] != false,
    );
  }

  final int weekday;
  final String from;
  final String to;
  final bool active;
}

class BookingSlot {
  const BookingSlot({required this.start, required this.end});

  final DateTime start;
  final DateTime end;

  String get startLabel => _formatTime(start);
  String get endLabel => _formatTime(end);
}

int voddaWeekday(DateTime date) => (date.weekday + 1) % 7;

List<DateTime> nextBookingDates({
  int count = 14,
  DateTime? now,
}) {
  final current = now ?? DateTime.now();
  final safeCount = count.clamp(1, 60).toInt();
  return List.generate(safeCount, (index) {
    final date = DateTime(current.year, current.month, current.day);
    return date.add(Duration(days: index));
  });
}

List<BookingSlot> generateBookingSlots({
  required List<BookingWorkRange> workTimes,
  required int durationMinutes,
  required DateTime date,
  DateTime? now,
  int leadMinutes = 5,
}) {
  if (durationMinutes <= 0 || durationMinutes > 240) return const [];

  final current = now ?? DateTime.now();
  final minimumStart = current.add(Duration(minutes: leadMinutes));
  final weekday = voddaWeekday(date);
  final result = <BookingSlot>[];
  final seen = <int>{};

  for (final range in workTimes) {
    if (!range.active || range.weekday != weekday) continue;
    final from = _parseMinutes(range.from);
    final to = _parseMinutes(range.to);
    if (from == null || to == null || from >= to) continue;

    for (var minute = from; minute + durationMinutes <= to; minute += durationMinutes) {
      final start = DateTime(
        date.year,
        date.month,
        date.day,
        minute ~/ 60,
        minute % 60,
      );
      if (start.isBefore(minimumStart)) continue;
      if (!seen.add(start.millisecondsSinceEpoch)) continue;
      result.add(
        BookingSlot(
          start: start,
          end: start.add(Duration(minutes: durationMinutes)),
        ),
      );
    }
  }

  result.sort((left, right) => left.start.compareTo(right.start));
  return result;
}

int? _parseMinutes(String value) {
  final parts = value.trim().split(':');
  if (parts.length < 2) return null;
  final hour = int.tryParse(parts[0]);
  final minute = int.tryParse(parts[1]);
  if (hour == null || minute == null || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }
  return hour * 60 + minute;
}

String _formatTime(DateTime value) {
  final hour = value.hour.toString().padLeft(2, '0');
  final minute = value.minute.toString().padLeft(2, '0');
  return '$hour:$minute';
}
