/**
 * فرگمنت ترجمهٔ فارسی→انگلیسی برای حوزهٔ wallet-misc (کیف پول، پرداخت، پروفایل
 * فراگیر، احراز هویت، دستیار، UI عمومی) — کلید = متن فارسیِ دقیقِ داخل کد.
 */
const f: Record<string, string> = {
  // ── کیف پول فراگیر ──
  "کیف پول": "Wallet",
  "شارژ کیف پول": "Top up wallet",
  "۱۰۰ هزار": "100K",
  "۲۵۰ هزار": "250K",
  "۵۰۰ هزار": "500K",
  "۱ میلیون": "1M",
  "تومان": "Toman",
  "مبلغ دلخواه (تومان)": "Custom amount (Toman)",
  "مثلاً ۳۰۰۰۰۰": "e.g. 300000",
  "مبلغ شارژ باید بین {min} و {max} تومان باشد.": "The top-up amount must be between {min} and {max} Toman.",
  "شروع پرداخت انجام نشد؛ چند لحظه دیگر تلاش کنید.": "Couldn't start the payment; try again in a few moments.",
  "در حال انتقال به درگاه…": "Redirecting to the gateway…",
  "پرداخت با درگاه بانکی": "Pay via bank gateway",
  "پرداخت از طریق درگاه امن سامان‌سپ انجام می‌شود؛ رسید بانک را برای پیگیری نگه دارید.": "Payment goes through the secure Saman Sep gateway; keep your bank receipt in case you need to follow up.",
  "تراکنش‌ها": "Transactions",
  "در حال دریافت کیف پول…": "Loading wallet…",
  "دریافت کیف پول ناموفق بود": "Couldn't load the wallet",
  "تلاش دوباره": "Try again",
  "تراکنشی ثبت نشده": "No transactions yet",
  "هنوز تراکنشی در کیف پول شما وجود ندارد.": "There are no transactions in your wallet yet.",
  "اطلاعات کیف پول دریافت نشد.": "Couldn't load wallet information.",
  "توکن درگاه پرداخت دریافت نشد.": "Couldn't get the payment gateway token.",

  // ── کارت تراکنش ──
  "پرداخت جلسه": "Session payment",
  "درآمد جلسه": "Session earning",
  "برداشت": "Withdrawal",
  "کارمزد سامانه": "Platform fee",
  "اصلاحیه حساب": "Account adjustment",

  // ── نتیجهٔ پرداخت (بنر درگاه سامان) ──
  "پرداخت با موفقیت انجام شد؛ موجودی یا جلسهٔ شما به‌روز شد.": "Payment completed successfully; your balance or session has been updated.",
  "پرداخت شما ثبت شد و در انتظار تأیید نهایی بانک است؛ وضعیت به‌زودی به‌روز می‌شود.": "Your payment was recorded and is awaiting final confirmation from the bank; the status will update soon.",
  "پرداخت ناموفق بود یا لغو شد. اگر مبلغ از حساب شما کسر شده باشد، طی ۷۲ ساعت به‌صورت خودکار برمی‌گردد.": "The payment failed or was canceled. If the amount was deducted from your account, it will be automatically refunded within 72 hours.",
  "شماره پیگیری بانک:": "Bank reference number:",
  "بستن پیام نتیجه پرداخت": "Close payment result",

  // ── پروفایل فراگیر ──
  "دریافت اطلاعات حساب انجام نشد. دوباره تلاش کنید.": "Couldn't load your account. Please try again.",
  "در حال دریافت اطلاعات پروفایل…": "Loading profile…",
  "دریافت پروفایل ناموفق بود": "Couldn't load the profile",
  "ویرایش پروفایل": "Edit profile",
  "وُدّا · نسخهٔ ۱٫۰٫۰": "Vodda · v1.0.0",

  // ── تکمیل/ویرایش پروفایل ──
  "ذخیره پروفایل انجام نشد. دوباره تلاش کنید.": "Couldn't save the profile. Please try again.",
  "فایل انتخاب‌شده باید تصویر باشد.": "The selected file must be an image.",
  "تصویر انتخاب‌شده قابل استفاده نیست.": "The selected photo can't be used.",
  "نام و نام خانوادگی را کامل وارد کنید.": "Please enter your full name.",
  "پروفایل و تصویر شما ذخیره شد": "Profile and photo saved",
  "پروفایل ذخیره شد": "Profile saved",
  "در حال دریافت اطلاعات حساب…": "Loading account…",
  "بازگشت": "Back",
  "تکمیل پروفایل": "Complete your profile",
  "ذخیره": "Save",
  "تغییر تصویر": "Change photo",
  "افزودن تصویر": "Add photo",
  "نام و نام خانوادگی": "Full name",
  "نام خود را وارد کنید": "Enter your name",
  "حداقل دو حرف وارد کنید.": "Please enter at least two characters.",
  "شماره موبایل": "Mobile number",
  "قابل تغییر نیست": "Can't be changed",
  "شهر": "City",
  "شهر خود را وارد کنید": "Enter your city",
  "دربارهٔ شما": "About you",
  "چند خط دربارهٔ خودتان بنویسید…": "Write a few lines about yourself…",
  "برای ورود به وُدّا حداقل نام و نام خانوادگی لازم است؛ بقیه اطلاعات را می‌توانید بعداً هم ویرایش کنید.": "Vodda only needs your full name to get started; you can edit the rest of your details anytime.",

  // ── پیام‌های خطای تصویر آواتار (lib/avatarImage — نمایش در ویرایش پروفایل) ──
  "فایلی انتخاب نشده است.": "No file was selected.",
  "فرمت تصویر پشتیبانی نمی‌شود. لطفاً تصویر را با فرمت JPG یا PNG انتخاب کنید.": "That image format isn't supported. Please choose a JPG or PNG image.",
  "پردازش تصویر ممکن نشد. لطفاً تصویر دیگری انتخاب کنید.": "The photo couldn't be processed. Please choose a different image.",
  "تصویر انتخاب‌شده خالی به نظر می‌رسد؛ لطفاً یک عکس واقعی از گالری انتخاب کنید.": "The selected image looks empty; please pick a real photo from your gallery.",
  "حجم تصویر پروفایل نباید بیشتر از ۵ مگابایت باشد.": "Profile photos can't be larger than 5 MB.",

  // ── شیت تغییر نقش ──
  "تغییر حساب": "Switch account",
  "حساب قرآن آموز": "Learner account",
  "یافتن استاد و رزرو جلسه": "Find teachers and book sessions",
  "حساب استاد": "Teacher account",
  "مدیریت جلسات و درآمد": "Manage sessions and income",

  // ── ورود و بازگردانی نشست ──
  "وُدّا": "Vodda",
  "اتصال به حساب برقرار نشد": "Couldn't connect to your account",
  "وضعیت ورود از سرور دریافت نشد. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.": "Couldn't check your sign-in status with the server. Check your internet connection and try again.",
  "وضعیت ورود از سرور دریافت نشد.": "Couldn't check your sign-in status with the server.",
  "۰۹××× ××× ×××": "09××× ××× ×××",
  "کد تأیید پنج رقمی": "5-digit verification code",
  "کد تأیید": "Verification code",

  // ── مسیرهای تعریف‌نشده (UniversalApp) ──
  "این مسیر در اپ وُدّا تعریف نشده است.": "This route isn't part of the Vodda app.",
  "بازگشت به اپ": "Back to the app",
  "این مسیر در نسخه فعلی وُدّا محتوای قابل نمایش ندارد.": "This route has no content in the current version of Vodda.",

  // ── UI عمومی (primitives / toast / shells) ──
  "در حال انجام…": "Working…",
  "تصویر کاربر": "User photo",
  "کاربر": "User",
  "در حال بارگذاری…": "Loading…",
  "بستن": "Close",
  "خطایی رخ داد. دوباره تلاش کنید.": "Something went wrong. Please try again.",
  "{n} مورد دیده نشده": "{n} unseen",
  "ناوبری اصلی استاد": "Teacher main navigation",
  "ناوبری اصلی قرآن‌آموز": "Learner main navigation",

  // ── دستیار هوشمند ──
  "سلام! من دستیار هوشمند وُدّا هستم 🌿\nدربارهٔ رزرو جلسه، فراخوان اساتید، مراسم حضوری، کیف پول یا هر بخش از اپ سؤال دارید، بپرسید.": "Hi! I'm the Vodda assistant 🌿\nAsk me anything about booking sessions, calling teachers, in-person ceremonies, the wallet, or any other part of the app.",
  "چطور استاد رزرو کنم؟": "How do I book a teacher?",
  "فراخوان چیست؟": "What is a call for teachers?",
  "خدمات رایگان چی هست؟": "What are free services?",
  "مراسم حضوری چطور رزرو می‌شود؟": "How do I book an in-person ceremony?",
  "الان امکان پاسخ‌گویی نیست؛ کمی بعد دوباره امتحان کنید.": "I can't reply right now; please try again a little later.",
  "ارتباط برقرار نشد؛ لطفاً اتصال اینترنت را بررسی و دوباره تلاش کنید.": "Connection failed; please check your internet connection and try again.",
  "گفتگو با دستیار هوشمند وُدّا": "Chat with the Vodda assistant",
  "دستیار هوشمند وُدّا": "Vodda assistant",
  "پاسخ‌گوی خودکار سؤالات اپ": "Automatic answers about the app",
  "شروع دوبارهٔ گفتگو": "Start the conversation over",
  "بستن گفتگو": "Close chat",
  "پیام‌های گفتگو": "Chat messages",
  "در حال نوشتن پاسخ": "Typing a reply",
  "پیشنهادهای گفتگو": "Suggested questions",
  "سؤال خود را بنویسید…": "Type your question…",
  "متن پیام": "Message",
  "ارسال پیام": "Send message",
"موجودی کیف پول": "Wallet balance",
"تأیید شده": "Confirmed",
"در انتظار تأیید": "Awaiting approval",
"برگزار شده": "Completed",
"لغو شده": "Canceled",
"رد شده": "Declined",
"تأییدشده": "Approved",
"پرداخت‌شده": "Paid",
"در انتظار پرداخت": "Awaiting payment",
};

export default f;
