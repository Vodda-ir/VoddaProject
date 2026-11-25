/**
 * parity-d — مکمل ترجمه‌های انگلیسی گزارش‌شده از ممیزی نهایی
 * (قطعات ترکیبی/aria و برچسب‌های گزارش‌شده توسط زیرعامل‌ها).
 */
const f: Record<string, string> = {};

/* CallHubScreen — مقدمهٔ دو مسیر */
f["دو مسیر دارید: یک "] = "You have two paths: a ";
f[" برای یادگیری، یا یک"] = " for learning, or a ";
f[" برای مراسم. فراخوان ثبت کنید و از پاسخ‌ها انتخاب کنید."] = " for ceremonies. Post a call and choose from the responses.";
f["در فراخوان مراسم، قاریان حق‌الزحمهٔ خود را اعلام می‌کنند؛ یکی را انتخاب می‌کنید، ودیعه را از طریق درگاه امن پرداخت می‌کنید و پس از برگزاری مراسم، تسویهٔ نهایی انجام می‌شود."] = "In the ceremony call, reciters quote their fee; you pick one, pay the deposit through the secure gateway, and after the ceremony the final settlement is completed.";

/* ServiceTeachersScreen */
f["دریافت خدمت ناموفق بود"] = "Failed to load the service";
f["فقط اساتید همین خدمت رسمی"] = "Only teachers of this official service";
f[" در ابتدای فهرست اولویت دارند · "] = " rank first in the list · ";

/* CategoryScreen */
f["فقط اساتیدِ «"] = "Only teachers of “";
f["» — کارت هر استاد را بزنید تا جلسهٔ آنلاین رزرو کنید"] = "” — tap a teacher's card to book an online session";
f["نمایش همهٔ زیردسته‌ها"] = "Show all subcategories";
f["استاد در این دسته"] = "teachers in this category";

/* FreeServicesScreen aria */
f[" رایگان با "] = " free with ";

/* AdminSettingsSection */
f["تغییر کرده"] = "Changed";

/* راهنمای رفع انسداد مجوز — واریان‌های دقیق android/desktop (مطابق متن کد) */
f["برای فعال‌سازی میکروفون: آیکون قفل یا ⓘ کنار نشانی را بزنید ← «مجوزها» ← میکروفون را روی «اجازه دادن» بگذارید. در اپ وُدّا: تنظیمات گوشی ← برنامه‌ها ← وُدّا ← مجوزها ← دوربین و میکروفون فعال باشد، سپس اپ را کامل ببندید و دوباره باز کنید."] = "To enable the microphone: tap the lock or ⓘ icon next to the address → “Permissions” → set the microphone to “Allow”. In the Vodda app: phone settings → apps → Vodda → permissions → camera and microphone enabled, then close the app fully and reopen it.";
f["برای فعال‌سازی دوربین و میکروفون: آیکون قفل یا ⓘ کنار نشانی را بزنید ← «مجوزها» ← دوربین و میکروفون را روی «اجازه دادن» بگذارید. در اپ وُدّا: تنظیمات گوشی ← برنامه‌ها ← وُدّا ← مجوزها ← دوربین و میکروفون فعال باشد، سپس اپ را کامل ببندید و دوباره باز کنید."] = "To enable the camera & microphone: tap the lock or ⓘ icon next to the address → “Permissions” → set camera and microphone to “Allow”. In the Vodda app: phone settings → apps → Vodda → permissions → camera and microphone enabled, then close the app fully and reopen it.";
f["برای فعال‌سازی میکروفون: آیکون قفل کنار نشانی سایت را بزنید ← «مجوزهای این سایت» ← دوربین و میکروفون را «اجازه دادن» کنید و صفحه را دوباره باز کنید."] = "To enable the microphone: tap the lock icon next to the site address → “Site permissions” → set camera and microphone to “Allow” and reopen the page.";
f["برای فعال‌سازی دوربین و میکروفون: آیکون قفل کنار نشانی سایت را بزنید ← «مجوزهای این سایت» ← دوربین و میکروفون را «اجازه دادن» کنید و صفحه را دوباره باز کنید."] = "To enable the camera & microphone: tap the lock icon next to the site address → “Site permissions” → set camera and microphone to “Allow” and reopen the page.";

export default f;