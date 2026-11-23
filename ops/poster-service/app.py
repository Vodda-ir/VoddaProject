"""
سرویس تولید پوستر کانال منافسه
- بدون API خارجی؛ Pillow + فونت‌های فارسی (+ libraqm برای شکل‌دهی درست)
- GET /poster?title=...&wd=...&j=...&h=...&g=...&footer=...&tag=...
"""
import io
import os
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from PIL import Image, ImageDraw, ImageFont, features
import arabic_reshaper
from bidi.algorithm import get_display

W = H = 1080
BG = (10, 10, 13)
FG = (244, 244, 246)
MUTED = (154, 154, 165)
ACCENT = (232, 199, 102)
BORDER = (38, 38, 44)

FONT_DIR = os.environ.get("FONT_DIR", "/app/fonts")

# اگر libraqm نصب باشد، Pillow خودش شکل‌دهی و bidi را انجام می‌دهد.
HAS_RAQM = features.check("raqm")


def font(name, size):
    return ImageFont.truetype(os.path.join(FONT_DIR, name), size)


def shape(text: str) -> str:
    if not text:
        return ""
    if HAS_RAQM:
        return text
    return get_display(arabic_reshaper.reshape(text))


def text_kwargs():
    return {"direction": "rtl", "language": "fa"} if HAS_RAQM else {}


def draw_text(d, xy, text, f, fill, anchor="ra"):
    d.text(xy, shape(text), font=f, fill=fill, anchor=anchor, **text_kwargs())


def measure(d, text, f):
    return d.textlength(shape(text), font=f, **text_kwargs())


def wrap(d, text, f, max_w):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if measure(d, test, f) <= max_w:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines[:4]


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path != "/poster":
            self.send_response(404)
            self.end_headers()
            return

        q = urllib.parse.parse_qs(parsed.query)
        title = (q.get("title") or [""])[0]
        wd = (q.get("wd") or [""])[0]
        j = (q.get("j") or [""])[0]
        h = (q.get("h") or [""])[0]
        g = (q.get("g") or [""])[0]
        footer = (q.get("footer") or ["monafaseh.vodda.ir"])[0]
        tag = (q.get("tag") or ["#منافسه"])[0]

        img = Image.new("RGB", (W, H), BG)
        d = ImageDraw.Draw(img)
        d.rounded_rectangle([28, 28, W - 28, H - 28], radius=36, outline=BORDER, width=2)

        f_brand = font("lalezar.ttf", 60)
        f_latin = font("lalezar.ttf", 22)
        f_small = font("baloo-bhaijaan-2-400.ttf", 26)
        f_label = font("baloo-bhaijaan-2-400.ttf", 30)
        f_title = font("lalezar.ttf", 78 if title else 92)
        f_date = font("baloo-bhaijaan-2-400.ttf", 36)
        f_footer = font("lalezar.ttf", 30)

        # سربرگ
        draw_text(d, (W - 76, 82), "منافسه", f_brand, FG)
        d.text((W - 78, 156), "MONAFASEH", font=f_latin, fill=MUTED, anchor="ra")
        draw_text(d, (76, 100), "کانال اطلاع‌رسانی", f_small, MUTED, anchor="la")

        # عنوان
        y = 320
        if title:
            draw_text(d, (W - 76, y), "مناسبت امروز", f_label, ACCENT)
            y += 60
            for ln in wrap(d, title, f_title, W - 160):
                draw_text(d, (W - 76, y), ln, f_title, FG)
                y += int(f_title.size * 1.45)
        else:
            draw_text(d, (W - 76, y), "محفل تلاوت قرآن کریم", f_title, FG)
            y += int(f_title.size * 1.45)

        # تاریخ‌ها
        y = 700
        d.line([(76, y - 30), (W - 76, y - 30)], fill=BORDER, width=2)
        for label, value in (("شمسی", f"{wd} {j}".strip()), ("قمری", h), ("میلادی", g)):
            if not value:
                continue
            draw_text(d, (W - 76, y), f"{label}:", f_date, MUTED)
            draw_text(d, (W - 230, y), value, f_date, (214, 214, 221))
            y += 62

        # پابرگ
        draw_text(d, (W - 76, H - 130), footer, f_footer, ACCENT)
        draw_text(d, (76, H - 126), tag, f_footer, MUTED, anchor="la")

        buf = io.BytesIO()
        img.save(buf, "PNG", optimize=True)
        data = buf.getvalue()

        self.send_response(200)
        self.send_header("Content-Type", "image/png")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "public, max-age=3600")
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt, *args):
        print("%s - %s" % (self.address_string(), fmt % args), flush=True)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "3430"))
    print(f"poster service on :{port} (raqm={HAS_RAQM})", flush=True)
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
