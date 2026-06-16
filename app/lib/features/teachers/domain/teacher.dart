import 'package:equatable/equatable.dart';

/// A bookable service offered by a teacher.
class Service extends Equatable {
  const Service({
    required this.id,
    required this.title,
    required this.duration,
    required this.price,
    required this.icon,
    this.active = false,
  });

  final int id;
  final String title;
  final int duration;
  final int price;
  final String icon;
  final bool active;

  factory Service.fromJson(Map<String, dynamic> j) => Service(
    id: j['id'] ?? 0,
    title: j['title'] ?? '',
    duration: j['duration'] ?? 30,
    price: j['price'] ?? 0,
    icon: j['icon'] ?? 'book',
    active: j['active'] ?? false,
  );

  @override
  List<Object?> get props => [id];
}

/// A teacher profile.
class Teacher extends Equatable {
  const Teacher({
    required this.id,
    required this.name,
    required this.field,
    required this.tag,
    required this.level,
    required this.city,
    required this.bio,
    required this.price30,
    required this.price60,
    required this.female,
    required this.verified,
    required this.rating,
    required this.reviews,
    required this.sessions,
    required this.followers,
    this.services = const [],
  });

  final int id;
  final String name;
  final String field;
  final String tag;
  final String level;
  final String city;
  final String bio;
  final int price30;
  final int price60;
  final bool female;
  final bool verified;
  final double rating;
  final int reviews;
  final int sessions;
  final int followers;
  final List<Service> services;

  factory Teacher.fromJson(Map<String, dynamic> j) {
    final user = j['user'] as Map<String, dynamic>?;
    return Teacher(
      id: j['id'] ?? 0,
      name: user?['name'] ?? 'استاد وُدّا',
      field: j['field'] ?? '',
      tag: j['tag'] ?? '',
      level: j['level'] ?? '',
      city: j['city'] ?? '',
      bio: j['bio'] ?? '',
      price30: j['price30'] ?? 0,
      price60: j['price60'] ?? 0,
      female: j['female'] ?? false,
      verified: j['verified'] ?? false,
      rating: (j['rating'] ?? 0).toDouble(),
      reviews: j['reviews'] ?? 0,
      sessions: j['sessions'] ?? 0,
      followers: j['followers'] ?? 0,
      services: ((j['services'] as List?) ?? [])
          .map((e) => Service.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  @override
  List<Object?> get props => [id];
}
