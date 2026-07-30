import 'package:equatable/equatable.dart';

/// A booked/held session — works for both learner and teacher perspectives.
class Session extends Equatable {
  const Session({
    required this.id,
    required this.teacherId,
    required this.teacherName,
    required this.learnerName,
    required this.service,
    required this.scheduledAt,
    required this.localDate,
    required this.localStart,
    required this.localEnd,
    required this.weekday,
    required this.duration,
    required this.price,
    required this.status,
    required this.rated,
    this.note = '',
    this.rejectNote = '',
  });

  final int id;
  final int teacherId;
  final String teacherName;
  final String learnerName;
  final String service;
  final DateTime scheduledAt;
  final String localDate;
  final String localStart;
  final String localEnd;
  final int weekday;
  final int duration;
  final int price;
  final String status; // pending | confirmed | done | canceled
  final bool rated;
  final String note;
  final String rejectNote;

  factory Session.fromJson(Map<String, dynamic> json) {
    final teacher = json['teacher'] as Map<String, dynamic>?;
    final teacherUser = teacher?['user'] as Map<String, dynamic>?;
    final learner = json['learner'] as Map<String, dynamic>?;
    final scheduledAt = DateTime.tryParse('${json['scheduled_at'] ?? ''}') ??
        DateTime.fromMillisecondsSinceEpoch(0, isUtc: true);

    return Session(
      id: _asInt(json['id']),
      teacherId: _asInt(json['teacher_id'] ?? teacher?['id']),
      teacherName: '${teacherUser?['name'] ?? 'استاد'}',
      learnerName: '${learner?['name'] ?? 'قرآن‌آموز'}',
      service: '${json['service'] ?? json['title'] ?? ''}',
      scheduledAt: scheduledAt,
      localDate: '${json['local_date'] ?? ''}',
      localStart: '${json['local_start'] ?? ''}',
      localEnd: '${json['local_end'] ?? ''}',
      weekday: _asInt(json['weekday'], fallback: -1),
      duration: _asInt(json['duration'], fallback: 30),
      price: _asInt(json['price']),
      status: '${json['status'] ?? 'pending'}',
      rated: json['rated'] == true,
      note: '${json['note'] ?? ''}',
      rejectNote: '${json['reject_note'] ?? ''}',
    );
  }

  bool get isUpcoming => status == 'pending' || status == 'confirmed';
  bool get isPending => status == 'pending';
  bool get hasOfficialLocalTime =>
      localDate.isNotEmpty && localStart.isNotEmpty && localEnd.isNotEmpty;

  @override
  List<Object?> get props => [
        id,
        status,
        rated,
        scheduledAt,
        localDate,
        localStart,
        localEnd,
      ];
}

int _asInt(Object? value, {int fallback = 0}) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse('$value') ?? fallback;
}
