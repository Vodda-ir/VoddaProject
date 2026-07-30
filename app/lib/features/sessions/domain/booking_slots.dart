class BookingSlot {
  const BookingSlot({
    required this.startAt,
    required this.endAt,
    required this.localDate,
    required this.localStart,
    required this.localEnd,
    required this.weekday,
  });

  factory BookingSlot.fromJson(Map<String, dynamic> json) {
    return BookingSlot(
      startAt: DateTime.parse('${json['start_at']}').toUtc(),
      endAt: DateTime.parse('${json['end_at']}').toUtc(),
      localDate: '${json['local_date'] ?? ''}',
      localStart: '${json['local_start'] ?? ''}',
      localEnd: '${json['local_end'] ?? ''}',
      weekday: int.tryParse('${json['weekday']}') ?? -1,
    );
  }

  final DateTime startAt;
  final DateTime endAt;
  final String localDate;
  final String localStart;
  final String localEnd;
  final int weekday;
}
