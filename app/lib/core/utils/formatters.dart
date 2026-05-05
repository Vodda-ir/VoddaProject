import 'package:intl/intl.dart';
import 'package:shamsi_date/shamsi_date.dart';

final NumberFormat _currencyFormat = NumberFormat.decimalPattern('fa');

String toPersianDigits(String input) {
  const english = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const persian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

  var output = input;
  for (var i = 0; i < english.length; i++) {
    output = output.replaceAll(english[i], persian[i]);
  }

  return output;
}

String formatCurrency(num amount, {bool withSuffix = true}) {
  final label = _currencyFormat.format(amount);
  return withSuffix ? '$label تومان' : label;
}

String formatTimeLabel(String value) {
  final normalized = value.length >= 5 ? value.substring(0, 5) : value;
  return toPersianDigits(normalized);
}

String formatDateLabel(DateTime date, {bool includeWeekday = true}) {
  final jalali = Jalali.fromDateTime(date);
  final formatter = jalali.formatter;
  final prefix = includeWeekday ? '${formatter.wN} ' : '';
  return toPersianDigits('$prefix${formatter.d} ${formatter.mN} ${formatter.yyyy}');
}

String formatShortDateLabel(DateTime date) {
  final jalali = Jalali.fromDateTime(date);
  final formatter = jalali.formatter;
  return toPersianDigits('${formatter.d} ${formatter.mN}');
}

String formatDateTimeRange(DateTime date, String start, String end) {
  return '${formatDateLabel(date)} - ${formatTimeLabel(start)} تا ${formatTimeLabel(end)}';
}

String weekdayLabelFromIndex(int dayOfWeek) {
  const names = [
    'یکشنبه',
    'دوشنبه',
    'سه‌شنبه',
    'چهارشنبه',
    'پنج‌شنبه',
    'جمعه',
    'شنبه',
  ];

  if (dayOfWeek < 0 || dayOfWeek >= names.length) {
    return 'نامشخص';
  }

  return names[dayOfWeek];
}

String bookingStatusLabel(String status) {
  switch (status) {
    case 'pending':
      return 'در حال انتظار';
    case 'accepted':
      return 'در حال انجام';
    case 'completed':
      return 'انجام شده';
    case 'rejected':
      return 'لغوشده';
    default:
      return status;
  }
}

String teacherLevelLabel(String level) {
  switch (level) {
    case 'beginner':
      return 'مقدماتی';
    case 'intermediate':
      return 'متوسط';
    case 'advanced':
      return 'حرفه‌ای';
    default:
      return level;
  }
}
