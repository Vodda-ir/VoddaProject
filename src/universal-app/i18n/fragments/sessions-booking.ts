/**
 * فرگمنت ترجمهٔ فارسی→انگلیسی برای حوزهٔ جلسات سه‌حالتهٔ ۱.۷ — گیت مجوز رسانه،
 * پایان جلسه و ویزارد رزرو — کلید = متن فارسیِ دقیقِ داخل کد.
 */
const f: Record<string, string> = {};

/* ── گیت مجوز رسانه (MediaPermissionGate) ── */
f["اجازه داده شده"] = "Granted";
f["مسدود"] = "Blocked";
f["در انتظار اجازهٔ شما"] = "Waiting for your approval";
f["نامشخص"] = "Unknown";
f["میکروفون"] = "Microphone";
f["دوربین"] = "Camera";
f["میکروفون آماده است"] = "Microphone is ready";
f["دوربین و میکروفون آماده‌اند"] = "Camera & microphone are ready";
f["اجازهٔ میکروفون + تست صدا"] = "Allow microphone + voice test";
f["اجازهٔ دوربین و میکروفون + تست"] = "Allow camera & microphone + test";
f["در حال بازکردن پنجرهٔ مجوز میکروفون…"] = "Opening the microphone permission dialog…";
f["در حال بازکردن پنجرهٔ مجوز دوربین…"] = "Opening the camera permission dialog…";
f["پنجرهٔ مجوز میکروفون به‌صورت خودکار باز می‌شود؛ «اجازه دادن» را بزنید."] = "The microphone permission dialog opens automatically; tap “Allow”.";
f["پنجرهٔ مجوز دوربین و میکروفون به‌صورت خودکار باز می‌شود؛ «اجازه دادن» را بزنید."] = "The camera & microphone permission dialog opens automatically; tap “Allow”.";
f["برای باز شدن پنجرهٔ مجوز میکروفون، دکمهٔ «اجازهٔ میکروفون» را بزنید — پنجرهٔ مجوز فوراً نمایش داده می‌شود."] = "Tap the “Allow microphone” button to open the permission dialog — it shows up instantly.";
f["برای باز شدن پنجرهٔ مجوز دوربین و میکروفون، دکمهٔ «اجازهٔ دسترسی» را بزنید — پنجرهٔ مجوز فوراً نمایش داده می‌شود."] = "Tap the “Allow access” button to open the permission dialog — it shows up instantly.";
f["دسترسی مسدود شده است"] = "Access is blocked";
f["تلاش دوباره برای دریافت مجوز"] = "Try asking for permission again";
f["بررسی وضعیت مجوزها"] = "Check permission status";
f["تماس درون‌اپی — شماره‌ها پنهان می‌مانند"] = "In-app call — numbers stay hidden";
f["میکروفون آماده است — تماس کاملاً درون‌اپی است و شمارهٔ شما هرگز نمایش داده نمی‌شود."] = "Your mic is ready — the call stays inside the app; your number is never shown.";

/* ── پایان جلسه (SessionDetailScreen) ── */
f["پایان جلسهٔ متنی و ثبت برگزاری"] = "End text session & mark as held";
f["وقتی گفت‌وگوی جلسه تمام شد، این دکمه جلسه را نهایی و برگزاری آن را ثبت می‌کند."] = "When the chat session is over, this button finalizes the session and records it as held.";
f["دکمهٔ «پایان جلسه» از ۱۰ دقیقه قبل از آغاز جلسه فعال می‌شود."] = "The “End session” button becomes available 10 minutes before the session starts.";

/* ── ویزارد رزرو (BookingWizardSheet) ── */
f["نوع جلسه"] = "Session type";
f["روش برگزاری"] = "Delivery mode";
f["زمان جلسه"] = "Session time";
f["تأیید و پرداخت"] = "Review & pay";
f["مرحلهٔ {n} از {m}"] = "Step {n} of {m}";
f["مرحلهٔ بعد"] = "Next step";
f["انتخاب مشخصات جلسه"] = "Set up your session";
f["فوری"] = "Instant";
f["جلسهٔ فوری — همین حالا"] = "Instant session — right now";
f["درخواست شما مستقیم و فوری برای استاد ارسال می‌شود؛ زمان آغاز دو دقیقهٔ بعد در نظر گرفته می‌شود."] = "Your request goes straight to the teacher instantly; the start time is set two minutes from now.";
f["برای جلسهٔ فوری، استاد باید آنلاین باشد؛ این استاد هم‌اکنون آفلاین است."] = "Instant sessions require the teacher to be online; this teacher is offline right now.";
f["جلسهٔ زمان‌دار"] = "Scheduled session";
f["روز و ساعت را از تقویم آزاد رسمی استاد انتخاب می‌کنید و درخواست برای او ارسال می‌شود."] = "Pick a day and time from the teacher's official calendar and the request is sent to them.";
f["هر روش برگزاری قیمت و مدت خودش را دارد؛ هر کدام را خواستید انتخاب کنید — رزرو همان روش انجام می‌شود."] = "Each delivery mode has its own price and duration; pick whichever you like — the booking follows that mode.";
f["ابتدا خدمت را مشخص کنید."] = "Pick a service first.";
f["در ۱۴ روز آینده زمان آزاد و قابل رزروی برای این خدمت وجود ندارد؛ می‌توانید روش برگزاری دیگری انتخاب کنید."] = "No bookable times for this service in the next 14 days; you can choose another delivery mode.";
f["یک روز را انتخاب کنید تا ساعت‌های آزاد آن نمایش داده شود."] = "Choose a day to see its available times.";
f["جلسهٔ فوری همین حالا ثبت می‌شود؛ زمان آغاز دو دقیقهٔ بعد از ثبت در نظر گرفته می‌شود و به‌محض تأیید استاد، جلسه باز می‌شود."] = "The instant session is booked right away; the start time is two minutes after submission, and the room opens as soon as the teacher accepts.";
f["نوع جلسه"] = "Session type";
f["فوری — همین حالا"] = "Instant — right now";
f["زمان‌دار"] = "Scheduled";
f["زمان آغاز"] = "Start time";
f["دو دقیقهٔ بعد از ثبت"] = "Two minutes after submission";
f["روش برگزاری جلسه"] = "Session delivery mode";
f[" است؛ بدون پرداخت هزینه و بدون کسر از کیف پول، درخواست شما ثبت می‌شود."] = " ; no payment and no wallet deduction — your request is submitted directly.";
f["پرداخت و ثبت جلسهٔ فوری"] = "Pay and book instant session";
f["ارسال درخواست جلسهٔ فوری"] = "Send instant session request";
f["ابتدا زمان جلسه را انتخاب کنید."] = "Choose the session time first.";
f["امکان ثبت جلسهٔ فوری همین حالا نبود؛ لطفاً دوباره تلاش کنید یا جلسهٔ زمان‌دار بگیرید."] = "The instant session couldn't be booked right now; please try again or schedule a session instead.";
f["این زمان همین حالا رزرو شده است؛ زمان‌های آزاد دوباره دریافت شدند. لطفاً زمان دیگری انتخاب کنید."] = "This time was just booked by someone else; the available times have been refreshed. Please pick another slot.";
f["ثبت جلسهٔ فوری انجام نشد."] = "The instant session could not be booked.";

/* ── صفحهٔ رزرو بازطراحی‌شده (LearnerBookingScreen) ── */
f["خدمات قابل رزرو"] = "Bookable services";
f["خدمت"] = "Service";
f["رزرو"] = "Book";
f["رزرو {n}"] = "Book {n}";
f["با انتخاب هر خدمت، کادر رزرو باز می‌شود: نوع جلسه (فوری یا زمان‌دار)، روش برگزاری (تلفنی، متنی یا تصویری)، تاریخ و زمان، و پرداخت — همه در همان کادر با چرخهٔ مراحل مشخص انجام می‌شود."] = "Tap any service to open the booking wizard: session type (instant or scheduled), delivery mode (phone, text or video), date & time, and payment — all inside one guided flow with a clear progress cycle.";

export default f;
