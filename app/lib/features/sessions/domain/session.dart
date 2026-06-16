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
    required this.duration,
    required this.price,
    required this.status,
    required this.rated,
  });

  final int id;
  final int teacherId;
  final String teacherName;
  final String learnerName;
  final String service;
  final DateTime scheduledAt;
  final int duration;
  final int price;
  final String status; // pending | confirmed | done | canceled
  final bool rated;

  factory Session.fromJson(Map<String, dynamic> j) {
    // Learner perspective: teacher + user nested
    final teacher = j['teacher'] as Map<String, dynamic>?;
    final tUser = teacher?['user'] as Map<String, dynamic>?;
    // Teacher perspective: learner nested
    final learner = j['learner'] as Map<String, dynamic>?;

    // Service title comes in 'title' (teacher sessions) or 'service' (learner)
    final svc = (j['title'] ?? j['service'] ?? '') as String;

    return Session(
      id: j['id'] ?? 0,
      teacherId: j['teacher_id'] ?? teacher?['id'] ?? 0,
      teacherName: tUser?['name'] ?? 'استاد',
      learnerName: learner?['name'] ?? 'قرآن\u200Cآموز',
      service: svc,
      scheduledAt: DateTime.tryParse(j['scheduled_at'] ?? '') ?? DateTime.now(),
      duration: j['duration'] ?? 30,
      price: j['price'] ?? 0,
      status: j['status'] ?? 'pending',
      rated: j['rated'] ?? false,
    );
  }

  bool get isUpcoming => status == 'pending' || status == 'confirmed';
  bool get isPending => status == 'pending';

  @override
  List<Object?> get props => [id, status, rated];
}
