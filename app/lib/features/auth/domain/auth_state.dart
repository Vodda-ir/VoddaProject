class AuthUser {
  final int id;
  final String mobile;
  final String name;
  final List<String> roles;
  final String activeRole;

  const AuthUser({
    required this.id,
    required this.mobile,
    required this.name,
    required this.roles,
    required this.activeRole,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: json['id'] as int? ?? 0,
      mobile: (json['mobile'] as String?) ?? '',
      name: (json['name'] as String?) ?? '',
      roles: ((json['roles'] as List<dynamic>?) ?? const [])
          .map((e) => e.toString())
          .toList(),
      activeRole: (json['active_role'] as String?) ?? 'learner',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'mobile': mobile,
      'name': name,
      'roles': roles,
      'active_role': activeRole,
    };
  }
}

class AuthState {
  final String? accessToken;
  final String? refreshToken;
  final AuthUser? user;
  final bool loading;
  final bool initialized;

  const AuthState({
    this.accessToken,
    this.refreshToken,
    this.user,
    this.loading = false,
    this.initialized = true,
  });

  bool get isAuthenticated =>
      accessToken != null && accessToken!.isNotEmpty && user != null;

  AuthState copyWith({
    String? accessToken,
    String? refreshToken,
    AuthUser? user,
    bool? loading,
    bool? initialized,
    bool clearUser = false,
  }) {
    return AuthState(
      accessToken: accessToken ?? this.accessToken,
      refreshToken: refreshToken ?? this.refreshToken,
      user: clearUser ? null : (user ?? this.user),
      loading: loading ?? this.loading,
      initialized: initialized ?? this.initialized,
    );
  }
}
