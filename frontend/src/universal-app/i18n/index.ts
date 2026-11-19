/**
 * i18n — دیکشنری دوزبانهٔ اپ (فارسی/انگلیسی).
 * کلیدها تخت‌اند و t() جای‌نگهدارهای {x} را پر می‌کند. هر رشته‌ای که هنوز
 * ترجمهٔ لاتین ندارد در نسخهٔ انگلیسی به فارسی برمی‌گردد (fallback در
 * appearance.tsx) تا هیچ‌وقت متن خالی دیده نشود.
 */
export const fa = {
  // ── ناوبری و سربرگ ──
  nav_home: "خانه",
  nav_search: "جستجو",
  nav_sessions: "جلسات",
  nav_profile: "پروفایل",
  nav_teacher_home: "خانه استاد",
  app_title: "وُدّا",
  category_title: "دسته‌بندی موضوعات",
  free_services_title: "خدمات رایگان",
  service_teachers: "اساتید خدمت",
  sessions_mine: "جلسات من",
  wallet_title: "کیف پول",
  search_title: "جستجوی استاد",
  not_found_title: "صفحه پیدا نشد",

  // ── مشترک ──
  action_back: "بازگشت",
  action_save: "ذخیره",
  action_cancel: "لغو",
  action_confirm: "تأیید",
  action_continue: "ادامه",
  action_retry: "تلاش دوباره",
  action_view_all: "مشاهده همه",
  action_more: "بیشتر",
  action_join_now: "ورود به کلاس",
  action_book: "رزرو جلسه",
  action_view_profile: "مشاهدهٔ پروفایل",
  currency_toman: "تومان",
  price_from: "از {price} تومان",
  free_service: "رایگان",
  loading: "کمی صبر کنید…",
  error_generic: "ارتباط با سرور برقرار نشد. دوباره تلاش کنید.",
  empty_state: "هنوز چیزی اینجا نیست.",

  // ── ورود ──
  login_subtitle: "پلتفرم آموزش و خدمات آنلاین قرآن کریم",
  login_mobile_label: "شماره موبایل",
  login_send_code: "دریافت کد تأیید",
  login_code_prompt: "کد پیامک‌شده به {mobile} را وارد کنید",
  login_submit: "ورود",
  login_resend: "ارسال مجدد کد",
  login_resend_in: "ارسال مجدد کد تا {time}",
  login_change_number: "تغییر شماره",
  login_mobile_invalid: "شماره موبایل ۱۱ رقمی وارد کنید.",
  login_code_invalid: "کد تأیید را کامل وارد کنید.",
  login_google: "ورود با گوگل",
  login_or: "یا",
  login_google_failed: "ورود با گوگل انجام نشد؛ دوباره تلاش کنید یا با شماره موبایل وارد شوید.",
  login_google_state: "نشست ورود با گوگل منقضی شده است؛ یک‌بار دیگر تلاش کنید.",
  trust_secure_pay: "پرداخت امن",
  trust_teachers: "اساتید تأییدشده",
  trust_support: "پشتیبانی پاسخ‌گو",

  // ── خانه ──
  home_greeting_morning: "صبح بخیر",
  home_greeting_noon: "ظهر بخیر",
  home_greeting_evening: "عصر بخیر",
  home_greeting_night: "شب بخیر",
  home_section_topics: "دسته بندی موضوعات",
  home_section_free: "جلسات رایگان",
  home_section_teachers: "اساتید برتر",
  home_active_services: "خدمات فعال",

  // ── اساتید و جستجو ──
  teachers_online_ready: "آنلاین — آمادهٔ رزرو",
  teachers_offline: "آفلاین",
  teachers_instant_ready: "جلسهٔ فوری دارد",
  teachers_empty: "استادی با این مشخصات پیدا نشد.",
  teacher_sessions_count: "{count} جلسه",
  teacher_rating: "امتیاز {rating}",

  // ── رزرو ──
  booking_title: "رزرو جلسه",
  booking_choose_time: "انتخاب زمان",
  booking_choose_service: "انتخاب خدمت",
  booking_note_label: "یادداشت برای استاد (اختیاری)",
  booking_instant_hint: "جلسهٔ فوری — همین حالا آغاز می‌شود",
  booking_pay_wallet: "پرداخت از کیف پول",
  booking_pay_gateway: "پرداخت آنلاین",
  booking_confirm: "ثبت رزرو",
  booking_success: "رزرو ثبت شد.",

  // ── جلسات ──
  status_pending: "در انتظار تأیید",
  status_confirmed: "تأیید شده",
  status_done: "انجام شده",
  status_canceled: "لغو شده",
  status_awaiting_payment: "در انتظار پرداخت",
  badge_instant: "فوری",
  sessions_empty: "هنوز جلسه‌ای ندارید.",
  sessions_upcoming: "جلسات پیش‌رو",
  sessions_past: "جلسات گذشته",
  session_not_time_yet: "هنوز زمان کلاس نیست",
  session_start_video: "شروع جلسهٔ تصویری",
  session_chat: "گفت‌وگو",
  session_accept: "تأیید جلسه",
  session_reject: "رد جلسه",
  session_finish: "اتمام جلسه",

  // ── مدیریت درون‌اپی (E3) ──
  admin_title: "مدیریت سامانه",

  // ── فراخوان ──
  dispatch_title: "فراخوان اساتید",
  dispatch_now: "جلسهٔ فوری — همین حالا",
  dispatch_later: "زمان مشخص",
  dispatch_send: "ارسال فراخوان",
  dispatch_note_placeholder: "چه چیزی می‌خواهید بیاموزید؟",
  dispatch_waiting_teachers: "در انتظار پاسخ اساتید…",

  // ── کیف پول ──
  wallet_balance: "موجودی",
  wallet_charge: "شارژ کیف پول",
  wallet_transactions: "تراکنش‌ها",

  // ── پروفایل ──
  profile_title: "پروفایل",
  profile_edit: "ویرایش پروفایل",
  profile_settings: "تنظیمات",
  profile_language: "زبان",
  profile_theme: "حالت نمایش",
  theme_light: "روشن",
  theme_dark: "تاریک",
  lang_fa: "فارسی",
  lang_en: "English",
  profile_logout: "خروج از حساب",
  profile_become_teacher: "ثبت‌نام استاد",
  profile_support: "پشتیبانی",
  profile_teacher_mode: "ورود به حساب استاد",
  profile_teacher_mode_hint: "جلسات و درآمدتان را مدیریت کنید.",
  profile_wallet_row: "کیف پول و تراکنش‌ها",
  support_contact: "پشتیبانی و تماس با ما",
  about_vodda: "دربارهٔ وُدّا",
  faq: "پرسش‌های پرتکرار",
  privacy: "قوانین و حریم خصوصی",
  profile_default_name: "کاربر وُدّا",
} as const;

export type TranslationKey = keyof typeof fa;

export type AppLanguage = "fa" | "en";

export const en: Partial<Record<TranslationKey, string>> = {
  // ── Navigation ──
  nav_home: "Home",
  nav_search: "Search",
  nav_sessions: "Sessions",
  nav_profile: "Profile",
  nav_teacher_home: "Teacher home",
  app_title: "Vodda",
  category_title: "Topic categories",
  free_services_title: "Free services",
  service_teachers: "Teachers for this service",
  sessions_mine: "My sessions",
  wallet_title: "Wallet",
  search_title: "Find a teacher",
  not_found_title: "Page not found",

  // ── Common ──
  action_back: "Back",
  action_save: "Save",
  action_cancel: "Cancel",
  action_confirm: "Confirm",
  action_continue: "Continue",
  action_retry: "Try again",
  action_view_all: "View all",
  action_more: "More",
  action_join_now: "Join class",
  action_book: "Book a session",
  action_view_profile: "View profile",
  currency_toman: "Toman",
  price_from: "From {price} Toman",
  free_service: "Free",
  loading: "Just a moment…",
  error_generic: "Could not reach the server. Please try again.",
  empty_state: "Nothing here yet.",

  // ── Login ──
  login_subtitle: "Online Quran learning & services platform",
  login_mobile_label: "Mobile number",
  login_send_code: "Get verification code",
  login_code_prompt: "Enter the code sent to {mobile}",
  login_submit: "Log in",
  login_resend: "Resend code",
  login_resend_in: "Resend code in {time}",
  login_change_number: "Change number",
  login_mobile_invalid: "Please enter an 11-digit mobile number.",
  login_code_invalid: "Please enter the full verification code.",
  login_google: "Continue with Google",
  login_or: "or",
  login_google_failed: "Google sign-in failed; try again or use your mobile number.",
  login_google_state: "The Google sign-in session expired; please try again.",
  trust_secure_pay: "Secure payment",
  trust_teachers: "Verified teachers",
  trust_support: "Responsive support",

  // ── Home ──
  home_greeting_morning: "Good morning",
  home_greeting_noon: "Good afternoon",
  home_greeting_evening: "Good evening",
  home_greeting_night: "Good night",
  home_section_topics: "Topic categories",
  home_section_free: "Free sessions",
  home_section_teachers: "Top teachers",
  home_active_services: "Active services",

  // ── Teachers ──
  teachers_online_ready: "Online — ready to book",
  teachers_offline: "Offline",
  teachers_instant_ready: "Instant session",
  teachers_empty: "No teacher matched your filters.",
  teacher_sessions_count: "{count} sessions",
  teacher_rating: "{rating} rating",

  // ── Booking ──
  booking_title: "Book a session",
  booking_choose_time: "Choose a time",
  booking_choose_service: "Choose a service",
  booking_note_label: "Note for the teacher (optional)",
  booking_instant_hint: "Instant session — starts right now",
  booking_pay_wallet: "Pay from wallet",
  booking_pay_gateway: "Pay online",
  booking_confirm: "Confirm booking",
  booking_success: "Booking confirmed.",

  // ── Sessions ──
  status_pending: "Awaiting approval",
  status_confirmed: "Confirmed",
  status_done: "Completed",
  status_canceled: "Canceled",
  status_awaiting_payment: "Awaiting payment",
  badge_instant: "Instant",
  sessions_empty: "You have no sessions yet.",
  sessions_upcoming: "Upcoming sessions",
  sessions_past: "Past sessions",
  session_not_time_yet: "Class time hasn't started yet",
  session_start_video: "Start video session",
  session_chat: "Chat",
  session_accept: "Accept session",
  session_reject: "Decline session",
  session_finish: "End session",

  // ── In-app admin (E3) ──
  admin_title: "System admin",

  // ── Dispatch ──
  dispatch_title: "Call for teachers",
  dispatch_now: "Instant session — right now",
  dispatch_later: "Specific time",
  dispatch_send: "Send call",
  dispatch_note_placeholder: "What would you like to learn?",
  dispatch_waiting_teachers: "Waiting for teachers to respond…",

  // ── Wallet ──
  wallet_balance: "Balance",
  wallet_charge: "Top up wallet",
  wallet_transactions: "Transactions",

  // ── Profile ──
  profile_title: "Profile",
  profile_edit: "Edit profile",
  profile_settings: "Settings",
  profile_language: "Language",
  profile_theme: "Appearance",
  theme_light: "Light",
  theme_dark: "Dark",
  lang_fa: "Persian",
  lang_en: "English",
  profile_logout: "Log out",
  profile_become_teacher: "Become a teacher",
  profile_support: "Support",
  profile_teacher_mode: "Switch to teacher account",
  profile_teacher_mode_hint: "Manage your sessions and income.",
  profile_wallet_row: "Wallet & transactions",
  support_contact: "Support & contact",
  about_vodda: "About Vodda",
  faq: "FAQ",
  privacy: "Terms & privacy",
  profile_default_name: "Vodda user",
};

export const dictionaries: Record<AppLanguage, Partial<Record<TranslationKey, string>>> = {
  fa,
  en,
};
