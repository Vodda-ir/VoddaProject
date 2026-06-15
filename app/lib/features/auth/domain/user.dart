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
  });

  final int id;
  final String name;
  final String mobile;
  final String role; // learner | teacher | admin
  final String city;
  final String bio;
  final int wallet;

  bool get isTeacher => role == 'teacher' || role == 'admin';

  factory AppUser.fromJson(Map<String, dynamic> j) => AppUser(
        id: j['id'] ?? 0,
        name: j['name'] ?? '',
        mobile: j['mobile'] ?? '',
        role: j['role'] ?? 'learner',
        city: j['city'] ?? '',
        bio: j['bio'] ?? '',
        wallet: j['wallet'] ?? 0,
      );

  @override
  List<Object?> get props => [id, name, wallet, role];
}
