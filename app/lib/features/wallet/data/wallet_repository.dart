import 'package:equatable/equatable.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../../auth/data/user_repository.dart';

/// A wallet ledger entry.
class Tx extends Equatable {
  const Tx({required this.id, required this.type, required this.title, required this.amount, required this.date});
  final int id;
  final String type;
  final String title;
  final int amount; // signed
  final String date;

  bool get credit => amount > 0;

  factory Tx.fromJson(Map<String, dynamic> j) {
    final created = DateTime.tryParse(j['created_at'] ?? '');
    final date = created != null ? '${created.year}/${created.month}/${created.day}' : '';
    return Tx(id: j['id'] ?? 0, type: j['type'] ?? '', title: j['title'] ?? '', amount: j['amount'] ?? 0, date: date);
  }

  @override
  List<Object?> get props => [id];
}

class WalletRepository {
  WalletRepository(this._ref);
  final Ref _ref;

  Future<List<Tx>> transactions() async {
    final dio = _ref.read(dioClientProvider).dio;
    final res = await dio.get('/wallet/transactions');
    final data = (res.data['data'] as List?) ?? [];
    return data.map((e) => Tx.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> charge(int amount) async {
    final dio = _ref.read(dioClientProvider).dio;
    await dio.post('/wallet/charge', data: {'amount': amount});
    _ref.invalidate(meProvider);
  }
}

final walletRepositoryProvider = Provider<WalletRepository>((ref) => WalletRepository(ref));
final transactionsProvider = FutureProvider<List<Tx>>((ref) => ref.watch(walletRepositoryProvider).transactions());
