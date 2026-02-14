class AuthState {
  final String? accessToken;
  final String? refreshToken;

  const AuthState({this.accessToken, this.refreshToken});

  bool get isAuthenticated => accessToken != null && accessToken!.isNotEmpty;
}
