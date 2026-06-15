import 'dart:io';
import 'package:dio/dio.dart';

/// Maps any thrown error to a friendly Persian message — never raw exception text.
String errorMessage(Object error) {
  if (error is DioException) {
    // server returned a structured {"error": "..."} body
    final data = error.response?.data;
    if (data is Map && data['error'] is String) return data['error'] as String;

    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return 'ارتباط با سرور کند است. دوباره تلاش کنید.';
      case DioExceptionType.connectionError:
        return 'اتصال به سرور برقرار نشد. اینترنت یا سرور را بررسی کنید.';
      case DioExceptionType.badResponse:
        final code = error.response?.statusCode ?? 0;
        if (code == 401) return 'برای ادامه باید وارد شوید.';
        if (code >= 500) return 'خطای سرور. کمی بعد دوباره تلاش کنید.';
        return 'درخواست ناموفق بود.';
      default:
        if (error.error is SocketException) {
          return 'اتصال به سرور برقرار نشد.';
        }
        return 'مشکلی پیش آمد. دوباره تلاش کنید.';
    }
  }
  if (error is SocketException) return 'اتصال به سرور برقرار نشد.';
  return 'مشکلی پیش آمد. دوباره تلاش کنید.';
}
