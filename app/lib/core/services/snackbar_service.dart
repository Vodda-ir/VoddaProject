import 'package:flutter/material.dart';

import '../network/error_message.dart';

/// Global [ScaffoldMessengerKey] so any layer can show a SnackBar
/// without needing a BuildContext.
final scaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();

/// Convenience helpers for showing feedback via the global key.
abstract class SnackBarService {
  /// Show an error SnackBar with a friendly Persian message derived from [error].
  static void showError(Object error) {
    final messenger = scaffoldMessengerKey.currentState;
    if (messenger == null) return;
    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(
              Icons.error_outline_rounded,
              color: Colors.white,
              size: 20,
            ),
            const SizedBox(width: 10),
            Expanded(child: Text(errorMessage(error))),
          ],
        ),
        backgroundColor: Colors.red.shade700,
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        duration: const Duration(seconds: 4),
        action: SnackBarAction(
          label: 'باشه',
          textColor: Colors.white,
          onPressed: () {},
        ),
      ),
    );
  }

  /// Show an info message.
  static void show(String message) {
    final messenger = scaffoldMessengerKey.currentState;
    if (messenger == null) return;
    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: Colors.grey.shade800,
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  /// Show a success message.
  static void showSuccess(String message) {
    final messenger = scaffoldMessengerKey.currentState;
    if (messenger == null) return;
    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle, color: Colors.white, size: 20),
            const SizedBox(width: 10),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: Colors.green.shade700,
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        duration: const Duration(seconds: 3),
      ),
    );
  }
}
