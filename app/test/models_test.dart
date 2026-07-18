import 'package:flutter_test/flutter_test.dart';
import 'package:vodda/features/auth/domain/user.dart';
import 'package:vodda/features/teachers/domain/teacher.dart';
import 'package:vodda/features/sessions/domain/session.dart';
import 'package:vodda/features/wallet/data/wallet_repository.dart';

void main() {
  group('AppUser', () {
    test('fromJson parses learner correctly', () {
      final u = AppUser.fromJson({
        'id': 1,
        'name': 'علی',
        'mobile': '09120000000',
        'role': 'learner',
        'city': 'تهران',
        'bio': 'سلام',
        'wallet': 50000,
      });
      expect(u.id, 1);
      expect(u.name, 'علی');
      expect(u.role, 'learner');
      expect(u.wallet, 50000);
      expect(u.isTeacher, false);
    });

    test('fromJson parses teacher with teacher object', () {
      final u = AppUser.fromJson({
        'id': 2,
        'name': 'استاد',
        'mobile': '09121111111',
        'role': 'teacher',
        'city': '',
        'bio': '',
        'wallet': 0,
        'teacher': {
          'tag': 'مدرس قرآن',
          'available': true,
          'rating': 4.8,
          'reviews': 64,
          'sessions': 120,
        },
      });
      expect(u.isTeacher, true);
      expect(u.teacherTag, 'مدرس قرآن');
      expect(u.teacherRating, 4.8);
      expect(u.teacherReviews, 64);
    });

    test('isTeacher is true for admin role', () {
      final u = AppUser.fromJson({
        'id': 0,
        'name': '',
        'mobile': '',
        'role': 'admin',
        'city': '',
        'bio': '',
        'wallet': 0,
      });
      expect(u.isTeacher, true);
    });
  });

  group('Teacher', () {
    test('fromJson parses correctly', () {
      final t = Teacher.fromJson({
        'id': 1,
        'field': 'آموزش قرآن کریم',
        'tag': 'مدرس',
        'level': 'حرفه‌ای',
        'city': 'تهران',
        'bio': 'بیو',
        'price30': 50000,
        'price60': 90000,
        'female': false,
        'verified': true,
        'rating': 4.5,
        'reviews': 30,
        'sessions': 100,
        'followers': 200,
        'user': {'id': 10, 'name': 'استاد تست', 'avatar_url': null},
        'services': [
          {'id': 1, 'title': 'روخوانی', 'duration': 30, 'price': 50000, 'icon': ''},
        ],
      });
      expect(t.id, 1);
      expect(t.name, 'استاد تست');
      expect(t.verified, true);
      expect(t.female, false);
      expect(t.services.length, 1);
      expect(t.services.first.title, 'روخوانی');
    });
  });

  group('Session', () {
    test('fromJson parses confirmed session', () {
      final s = Session.fromJson({
        'id': 1,
        'status': 'confirmed',
        'service': 'روخوانی',
        'duration': 30,
        'scheduled_at': '2026-07-13T10:00:00Z',
        'teacher_name': 'استاد',
        'rated': false,
      });
      expect(s.id, 1);
      expect(s.status, 'confirmed');
      expect(s.duration, 30);
      expect(s.rated, false);
    });
  });

  group('Tx', () {
    test('fromJson parses credit transaction', () {
      final tx = Tx.fromJson({
        'id': 1,
        'type': 'charge',
        'title': 'شارژ کیف پول',
        'amount': 50000,
        'created_at': '2026-07-13T10:00:00Z',
      });
      expect(tx.id, 1);
      expect(tx.amount, 50000);
      expect(tx.credit, true);
    });

    test('fromJson parses debit transaction', () {
      final tx = Tx.fromJson({
        'id': 2,
        'type': 'session',
        'title': 'پرداخت جلسه',
        'amount': -50000,
        'created_at': '2026-07-13T11:00:00Z',
      });
      expect(tx.credit, false);
    });
  });
}
