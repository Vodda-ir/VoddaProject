/// Persian helpers: convert ASCII digits to Persian and group thousands.
String faDigits(String input) {
  const en = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const fa = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  var out = input;
  for (var i = 0; i < en.length; i++) {
    out = out.replaceAll(en[i], fa[i]);
  }
  return out;
}

/// Formats an integer with thousands separators and Persian digits.
String faNumber(num value) {
  final s = value.round().toString();
  final buf = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) buf.write('٬');
    buf.write(s[i]);
  }
  return faDigits(buf.toString());
}

/// Formats a Toman amount, e.g. "۸۵٬۰۰۰ تومان".
String toman(num value) => '${faNumber(value)} تومان';
