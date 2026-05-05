class AvailabilitySlot {
  final int dayOfWeek;
  final String startTime;
  final String endTime;

  const AvailabilitySlot({
    required this.dayOfWeek,
    required this.startTime,
    required this.endTime,
  });

  factory AvailabilitySlot.fromJson(Map<String, dynamic> json) {
    return AvailabilitySlot(
      dayOfWeek: (json['day_of_week'] as num?)?.toInt() ?? 0,
      startTime: (json['start_time'] as String?) ?? '00:00:00',
      endTime: (json['end_time'] as String?) ?? '00:00:00',
    );
  }
}

class Teacher {
  final int id;
  final int userId;
  final String name;
  final String specialty;
  final String level;
  final String bio;
  final int pricePer30Min;
  final String verificationStatus;
  final double averageRating;
  final int totalBookings;
  final List<AvailabilitySlot> availabilitySlots;

  const Teacher({
    required this.id,
    required this.userId,
    required this.name,
    required this.specialty,
    required this.level,
    required this.bio,
    required this.pricePer30Min,
    required this.verificationStatus,
    required this.averageRating,
    required this.totalBookings,
    required this.availabilitySlots,
  });

  factory Teacher.fromJson(Map<String, dynamic> json) {
    return Teacher(
      id: (json['id'] as num?)?.toInt() ?? 0,
      userId: (json['user_id'] as num?)?.toInt() ?? 0,
      name: (json['name'] as String?) ?? '',
      specialty: (json['specialty'] as String?) ?? '',
      level: (json['level'] as String?) ?? '',
      bio: (json['bio'] as String?) ?? '',
      pricePer30Min: (json['price_per_30min'] as num?)?.toInt() ?? 0,
      verificationStatus: (json['verification_status'] as String?) ?? '',
      averageRating: (json['average_rating'] as num?)?.toDouble() ?? 0,
      totalBookings: (json['total_bookings'] as num?)?.toInt() ?? 0,
      availabilitySlots: ((json['availability_slots'] as List<dynamic>?) ?? const [])
          .map((item) => AvailabilitySlot.fromJson(Map<String, dynamic>.from(item as Map)))
          .toList(),
    );
  }
}

class BookingRecord {
  final int id;
  final int learnerId;
  final String learnerName;
  final int teacherProfileId;
  final String teacherName;
  final DateTime slotDate;
  final String slotStart;
  final String slotEnd;
  final String status;
  final String notes;
  final int? sessionId;
  final DateTime? createdAt;

  const BookingRecord({
    required this.id,
    required this.learnerId,
    required this.learnerName,
    required this.teacherProfileId,
    required this.teacherName,
    required this.slotDate,
    required this.slotStart,
    required this.slotEnd,
    required this.status,
    required this.notes,
    required this.sessionId,
    required this.createdAt,
  });

  factory BookingRecord.fromJson(Map<String, dynamic> json) {
    final slotDate = DateTime.tryParse('${json['slot_date']}T00:00:00') ?? DateTime.now();

    return BookingRecord(
      id: (json['id'] as num?)?.toInt() ?? 0,
      learnerId: (json['learner_id'] as num?)?.toInt() ?? 0,
      learnerName: (json['learner_name'] as String?) ?? '',
      teacherProfileId: (json['teacher_profile_id'] as num?)?.toInt() ?? 0,
      teacherName: (json['teacher_name'] as String?) ?? '',
      slotDate: slotDate,
      slotStart: (json['slot_start'] as String?) ?? '00:00:00',
      slotEnd: (json['slot_end'] as String?) ?? '00:00:00',
      status: (json['status'] as String?) ?? '',
      notes: (json['notes'] as String?) ?? '',
      sessionId: (json['session_id'] as num?)?.toInt(),
      createdAt: json['created_at'] == null
          ? null
          : DateTime.tryParse(json['created_at'].toString()),
    );
  }
}

class WalletTransactionRecord {
  final int id;
  final int amount;
  final String type;
  final String referenceId;
  final String description;
  final DateTime? createdAt;

  const WalletTransactionRecord({
    required this.id,
    required this.amount,
    required this.type,
    required this.referenceId,
    required this.description,
    required this.createdAt,
  });

  factory WalletTransactionRecord.fromJson(Map<String, dynamic> json) {
    return WalletTransactionRecord(
      id: (json['id'] as num?)?.toInt() ?? 0,
      amount: (json['amount'] as num?)?.toInt() ?? 0,
      type: (json['type'] as String?) ?? '',
      referenceId: (json['reference_id'] as String?) ?? '',
      description: (json['description'] as String?) ?? '',
      createdAt: json['created_at'] == null
          ? null
          : DateTime.tryParse(json['created_at'].toString()),
    );
  }
}

class WalletSnapshot {
  final int walletId;
  final int balance;
  final List<WalletTransactionRecord> transactions;

  const WalletSnapshot({
    required this.walletId,
    required this.balance,
    required this.transactions,
  });

  factory WalletSnapshot.fromJson(Map<String, dynamic> json) {
    return WalletSnapshot(
      walletId: (json['wallet_id'] as num?)?.toInt() ?? 0,
      balance: (json['balance'] as num?)?.toInt() ?? 0,
      transactions: ((json['transactions'] as List<dynamic>?) ?? const [])
          .map((item) => WalletTransactionRecord.fromJson(Map<String, dynamic>.from(item as Map)))
          .toList(),
    );
  }
}

class VoddaNotification {
  final int id;
  final String title;
  final String body;
  final DateTime? readAt;
  final DateTime? createdAt;

  const VoddaNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.readAt,
    required this.createdAt,
  });

  bool get isRead => readAt != null;

  factory VoddaNotification.fromJson(Map<String, dynamic> json) {
    return VoddaNotification(
      id: (json['id'] as num?)?.toInt() ?? 0,
      title: (json['title'] as String?) ?? '',
      body: (json['body'] as String?) ?? '',
      readAt: json['read_at'] == null ? null : DateTime.tryParse(json['read_at'].toString()),
      createdAt: json['created_at'] == null
          ? null
          : DateTime.tryParse(json['created_at'].toString()),
    );
  }
}

class BookingDraft {
  final int teacherProfileId;
  final String teacherName;
  final int pricePer30Min;
  final DateTime slotDate;
  final String slotStart;
  final String slotEnd;
  final String notes;
  final String paymentMethod;
  final String? couponCode;

  const BookingDraft({
    required this.teacherProfileId,
    required this.teacherName,
    required this.pricePer30Min,
    required this.slotDate,
    required this.slotStart,
    required this.slotEnd,
    required this.notes,
    required this.paymentMethod,
    required this.couponCode,
  });
}
