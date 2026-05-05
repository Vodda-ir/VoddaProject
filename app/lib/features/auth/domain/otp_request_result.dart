class OtpRequestResult {
  final String message;
  final bool reusedExistingCode;
  final int expiresInSeconds;
  final DateTime expiresAt;

  const OtpRequestResult({
    required this.message,
    required this.reusedExistingCode,
    required this.expiresInSeconds,
    required this.expiresAt,
  });

  factory OtpRequestResult.fromJson(Map<String, dynamic> json) {
    final expiresAtRaw = (json['expires_at'] as String?) ?? '';
    final parsedExpiresAt = DateTime.tryParse(expiresAtRaw);

    return OtpRequestResult(
      message: (json['message'] as String?) ?? 'کد تأیید ارسال شد.',
      reusedExistingCode: (json['reused_existing_code'] as bool?) ?? false,
      expiresInSeconds: (json['expires_in_seconds'] as num?)?.toInt() ?? 120,
      expiresAt: parsedExpiresAt ?? DateTime.now().add(const Duration(minutes: 2)),
    );
  }
}
