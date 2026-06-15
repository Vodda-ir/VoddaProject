import 'package:equatable/equatable.dart';

/// A booked/held session.
class Session extends Equatable {
  const Session({
    required this.id,
    required this.teacherId,
    required this.teacherName,
    required this.service,
    required this.scheduledAt,
    required this.duration,
    required this.price,
    required this.status,
    required this.rated,
  });

  final int id;
  final int teacherId;
  final String teacherName;
  final String service;
  final DateTime scheduledAt;
  final int duration;
  final int price;
  final String status; // pending | confirmed | done | canceled
  final bool rated;

  factory Session.fromJson(Map<String, dynamic> j) {
    final teacher = j['teacher'] as Map<String, dynamic>?;
    final tUser = teacher?['user'] as Map<String, dynamic>?;
    return Session(
      id: j['id'] ?? 0,
      teacherId: j['teacher_id'] ?? 0,
      teacherName: tUser?['name'] ?? 'استاد',
      service: j['service'] ?? '',
      scheduledAt: DateTime.tryParse(j['scheduled_at'] ?? '') ?? DateTime.now(),
      duration: j['duration'] ?? 30,
      price: j['price'] ?? 0,
      status: j['status'] ?? 'pending',
      rated: j['rated'] ?? false,
    );
  }

  bool get isUpcoming => status == 'pending' || status == 'confirmed';

  @override
  List<Object?> get props => [id, status, rated];
}
