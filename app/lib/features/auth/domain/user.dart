import 'package:equatable/equatable.dart';

/// The authenticated account.
class AppUser extends Equatable {
  const AppUser({
    required this.id,
    required this.name,
    required this.mobile,
    required this.role,
    required this.city,
    required this.bio,
    required this.wallet,
    this.avatarUrl,
    this.teacherTag,
    this.teacherAvailable = true,
  });

  final int id;
  final String name;
  final String mobile;
  final String role; // learner | teacher | admin
  final String city;
  final String bio;
  final int wallet;
  final String? avatarUrl;
  final String? teacherTag;
  final bool teacherAvailable;

  bool get isTeacher => role == 'teacher' || role == 'admin';

  factory AppUser.fromJson(Map<String, dynamic> j) {
    final teacher = j['teacher'] as Map<String, dynamic>?;
    return AppUser(
      id: j['id'] ?? 0,
      name: j['name'] ?? '',
      mobile: j['mobile'] ?? '',
      role: j['role'] ?? 'learner',
      city: j['city'] ?? '',
      bio: j['bio'] ?? '',
      wallet: j['wallet'] ?? 0,
      avatarUrl: j['avatar_url'] as String?,
      teacherTag: teacher?['tag'] as String?,
      teacherAvailable: teacher?['available'] as bool? ?? true,
    );
  }

  @override
  List<Object?> get props => [id, name, wallet, role, avatarUrl, teacherTag];
}
