/** فرگمنت ترجمهٔ فارسی→انگلیسی برای حوزهٔ ceremony — کلید = متن فارسی داخل کد. */
const f: Record<string, string> = {};

/* ───────────  وضعیت‌ها (تراشه‌های ToneChip در elements.tsx)  ─────────── */
f["در انتظار پذیرش"] = "Awaiting offers";
f["پذیرش شد"] = "Accepted";
f["در حال اجرا"] = "In progress";
f["برگزار شد"] = "Held";
f["لغو شده"] = "Canceled";
f["منقضی شده"] = "Expired";
f["در انتظار ودیعه"] = "Awaiting deposit";
f["ودیعه پرداخت شد"] = "Deposit paid";
f["تسویه شد"] = "Settled";
f["لغو شد"] = "Canceled";
f["در انتظار انتخاب"] = "Awaiting selection";
f["پذیرش ثبت شد"] = "Offer submitted";
f["رد شده"] = "Declined";
f["کنار گذاشته شده"] = "Set aside";
f["انتخاب شد"] = "Chosen";

/* ───────────  مخاطبان (audienceMeta + گزینه‌های مخاطب)  ─────────── */
f["همه"] = "Everyone";
f["برادران"] = "Brothers";
f["خواهران"] = "Sisters";

/* ───────────  خط وضعیت قرارداد (timeline)  ─────────── */
f["ودیعه"] = "Deposit";
f["اجرا"] = "Held";

/* ───────────  خطاهای api.ts (از طریق messageOf نمایش داده می‌شوند)  ─────────── */
f["شناسه قاری نامعتبر است."] = "Invalid reciter ID.";
f["پروفایل قاری دریافت نشد."] = "Could not fetch the reciter profile.";
f["ثبت فراخوان انجام نشد؛ پاسخ سرور نامعتبر بود."] = "Submitting the call failed; the server response was invalid.";
f["شناسه فراخوان نامعتبر است."] = "Invalid call ID.";
f["فراخوان دریافت نشد."] = "Could not fetch the call.";
f["قطعی‌سازی فراخوان انجام نشد."] = "Finalizing the call failed.";
f["قطعی‌سازی فراخوان انجام نشد؛ پاسخ سرور نامعتبر بود."] = "Finalizing the call failed; the server response was invalid.";
f["ثبت رزرو مستقیم انجام نشد."] = "Direct booking failed.";
f["ثبت رزرو مستقیم انجام نشد؛ پاسخ سرور نامعتبر بود."] = "Direct booking failed; the server response was invalid.";
f["شناسه قرارداد نامعتبر است."] = "Invalid contract ID.";
f["قرارداد دریافت نشد."] = "Could not fetch the contract.";
f["پرداخت انجام نشد؛ پاسخ سرور نامعتبر بود."] = "Payment failed; the server response was invalid.";
f["وضعیت قرارداد پس از پرداخت دریافت نشد."] = "Could not fetch the contract status after payment.";
f["توکن درگاه پرداخت دریافت نشد."] = "Payment gateway token not received.";
f["تأیید اجرا انجام نشد."] = "Confirming the ceremony failed.";
f["تأیید اجرا انجام نشد؛ پاسخ سرور نامعتبر بود."] = "Confirming the ceremony failed; the server response was invalid.";
f["لغو قرارداد انجام نشد."] = "Canceling the contract failed.";
f["لغو قرارداد انجام نشد؛ پاسخ سرور نامعتبر بود."] = "Canceling the contract failed; the server response was invalid.";
f["پذیرش فراخوان انجام نشد."] = "Accepting the call failed.";
f["پذیرش فراخوان انجام نشد؛ پاسخ سرور نامعتبر بود."] = "Accepting the call failed; the server response was invalid.";
f["ثبت خدمت حضوری انجام نشد."] = "Saving the in-person service failed.";
f["ثبت خدمت حضوری انجام نشد؛ پاسخ سرور نامعتبر بود."] = "Saving the in-person service failed; the server response was invalid.";
f["شناسه خدمت نامعتبر است."] = "Invalid service ID.";
f["به‌روزرسانی خدمت حضوری انجام نشد."] = "Updating the in-person service failed.";
f["به‌روزرسانی خدمت حضوری انجام نشد؛ پاسخ سرور نامعتبر بود."] = "Updating the in-person service failed; the server response was invalid.";

/* ───────────  خطاهای پیام/اعتبارسنجی در صفحات  ─────────── */
f["پرداخت از کیف پول انجام نشد. موجودی کیف پول را بررسی کنید یا پرداخت با کارت بانکی را برگزینید."] =
  "Wallet payment failed. Check your wallet balance or pay with a bank card.";
f["انتقال به درگاه پرداخت انجام نشد."] = "Could not redirect to the payment gateway.";
f["تأیید اجرا و تسویه انجام نشد."] = "Confirming the ceremony and settlement failed.";
f["قطعی‌سازی انجام نشد."] = "Finalizing failed.";
f["لغو فراخوان انجام نشد."] = "Canceling the call failed.";
f["دریافت فراخوان‌های شما ناموفق بود."] = "Could not fetch your calls.";
f["دریافت فراخوان‌های مراسم ناموفق بود."] = "Could not fetch ceremony calls.";
f["پس گرفتن پذیرش انجام نشد."] = "Withdrawing the offer failed.";
f["دریافت فهرست قاریان حضوری ناموفق بود."] = "Could not fetch the list of in-person reciters.";
f["دریافت خدمات حضوری ناموفق بود."] = "Could not fetch in-person services.";
f["دریافت خدمات حضوری ناموفق بود"] = "Fetching in-person services failed";
f["ذخیرهٔ خدمت حضوری انجام نشد."] = "Saving the in-person service failed.";
f["حذف خدمت حضوری انجام نشد."] = "Deleting the in-person service failed.";
f["دریافت فهرست خدمات حضوری ناموفق بود."] = "Could not fetch the in-person services catalog.";
f["ثبت فراخوان مراسم انجام نشد."] = "Submitting the ceremony call failed.";
f["این قرارداد پیدا نشد یا به شما تعلق ندارد."] = "This contract was not found or does not belong to you.";
f["این فراخوان پیدا نشد یا به شما تعلق ندارد."] = "This call was not found or does not belong to you.";
f["این قاری پیدا نشد."] = "This reciter was not found.";
f["لطفاً موضوع مراسم را از فهرست خدمات انتخاب کنید."] = "Please choose the ceremony topic from the services list.";
f["زمان مراسم باید در آینده باشد؛ دست‌کم ۱۵ دقیقه بعد از الآن."] = "The ceremony time must be in the future; at least 15 minutes from now.";
f["شهر برگزاری مراسم را وارد کنید."] = "Please enter the ceremony city.";
f["تعداد مهمانان را وارد کنید (حداقل ۱ نفر)."] = "Please enter the number of guests (at least 1).";
f["تعداد قاریان باید بین ۱ تا ۱۰ باشد."] = "The number of reciters must be between 1 and 10.";
f["کمینهٔ بودجه نمی‌تواند از بیشینهٔ آن بیشتر باشد."] = "The minimum budget cannot exceed the maximum.";
f["یک خدمت رسمی از کاتالوگ انتخاب کنید."] = "Choose an official service from the catalog.";
f["حق‌الزحمهٔ پایه را به تومان وارد کنید."] = "Please enter your base fee in Toman.";
f["مدت اجرا باید بین ۱۵ دقیقه تا ۲۴ ساعت باشد."] = "The duration must be between 15 minutes and 24 hours.";
f["برای پذیرش، مبلغ حق‌الزحمه را به تومان وارد کنید (خدمت حضوری ثبت‌شده‌ای برای این موضوع ندارید)."] =
  "To accept, enter your fee in Toman (you have no registered in-person service for this topic).";

/* ───────────  وضعیت‌های بارگذاری و سربرگ  ─────────── */
f["در حال دریافت قرارداد…"] = "Fetching the contract…";
f["دریافت قرارداد ناموفق بود"] = "Fetching the contract failed";
f["در حال انتقال به درگاه پرداخت…"] = "Redirecting to the payment gateway…";
f["در حال دریافت فراخوان…"] = "Fetching the call…";
f["در حال دریافت فراخوان‌های شما…"] = "Fetching your calls…";
f["در حال دریافت فراخوان‌های مراسم…"] = "Fetching ceremony calls…";
f["در حال دریافت قاریان حضوری…"] = "Fetching in-person reciters…";
f["در حال دریافت پروفایل قاری…"] = "Fetching the reciter profile…";
f["در حال دریافت خدمات حضوری…"] = "Fetching in-person services…";
f["تلاش دوباره"] = "Try again";
f["بازگشت به خانه"] = "Back to home";
f["فراخوان‌های من"] = "My calls";

/* ───────────  صفحهٔ قرارداد مراسم (CeremonyBookingScreen)  ─────────── */
f["ودیعهٔ مراسم ثبت شد؛ پس از پرداخت موفق به همین صفحه برمی‌گردید."] =
  "The ceremony deposit is registered; you will return to this page after a successful payment.";
f["قرارداد مراسم #{id}"] = "Ceremony contract #{id}";
f["زمان نامشخص"] = "Time not set";
f["شهر نامشخص"] = "City not set";
f["پس از پرداخت ودیعه نمایش داده می‌شود"] = "Shown after the deposit is paid";
f["نشانی دقیق مکان به‌محض هماهنگی طرفین تکمیل می‌شود."] = "The exact address is completed as soon as both sides coordinate.";
f["ریز مالی قرارداد"] = "Contract finances";
f["حق‌الزحمهٔ مراسم"] = "Ceremony fee";
f["کارمزد سامانه ({percent}٪)"] = "Platform fee ({percent}%)";
f["ودیعهٔ لازم برای قطعی‌سازی ({percent}٪)"] = "Deposit required to confirm ({percent}%)";
f["ودیعه نزد سامانه امانت می‌ماند و پس از تأیید اجرای مراسم توسط برگزارکننده، به‌همراه مابقی مبلغ به قاری پرداخت می‌شود."] =
  "The deposit is held in escrow by the platform and, once the organizer confirms the ceremony was held, it is paid to the reciter along with the remaining amount.";
f["قاری مراسم"] = "Ceremony reciter";
f["برگزارکننده"] = "Organizer";
f["شماره پس از قطعی‌سازی در دسترس است"] = "Phone number becomes available once the contract is confirmed";
f["مراسم برگزار و قرارداد تسویه شد 🌿"] = "The ceremony was held and the contract is settled 🌿";
f["از انتخاب و اعتماد شما سپاسگزاریم؛ حق‌الزحمهٔ قاری تسویه شد."] = "Thank you for your trust; the reciter's fee has been settled.";
f["حق‌الزحمهٔ این مراسم به کیف پول شما واریز شد."] = "The fee for this ceremony has been deposited into your wallet.";
f["حق‌الزحمهٔ این مراسم در {date} به کیف پول شما واریز شد."] = "The fee for this ceremony was deposited into your wallet on {date}.";
f["این قرارداد لغو شده است"] = "This contract has been canceled";
f["بازگشت ودیعه بر اساس سیاست لغو (فاصله تا زمان مراسم) انجام شده یا در جریان است."] =
  "The deposit refund (per the cancellation policy and time until the ceremony) is done or in progress.";
f["این مراسم از سوی برگزارکننده لغو شد؛ در صورت پرداخت ودیعه، بازگشت وجه طبق سیاست سامانه انجام می‌شود."] =
  "This ceremony was canceled by the organizer; if the deposit was paid, it is refunded according to the platform policy.";
f["برای قطعی‌شدن مراسم، ودیعه را پرداخت کنید"] = "Pay the deposit to confirm the ceremony";
f["مبلغ ودیعه: {amount} — تا پرداخت ودیعه، قرارداد برای قاری قطعی نیست و مکان مراسم مخفی می‌ماند."] =
  "Deposit amount: {amount} — until the deposit is paid, the contract is not final for the reciter and the venue stays hidden.";
f["پرداخت ودیعه از کیف پول"] = "Pay deposit from wallet";
f["پرداخت با کارت بانکی"] = "Pay with bank card";
f["مراسم برگزار شد؟"] = "Was the ceremony held?";
f["با تأیید اجرا، مابقی مبلغ از کیف پول شما به قاری تسویه می‌شود. این اقدام بازگشت‌پذیر نیست."] =
  "By confirming, the remaining amount is settled from your wallet to the reciter. This action cannot be undone.";
f["تأیید اجرا و تسویه"] = "Confirm & settle";
f["ودیعه پرداخت شده و مراسم قطعی است. پس از اجرای مراسم، برگزارکننده تسویه را تأیید می‌کند و حق‌الزحمهٔ شما به کیف پول واریز می‌شود."] =
  "The deposit is paid and the ceremony is confirmed. After it is held, the organizer confirms settlement and your fee is deposited into your wallet.";
f["منتظر پرداخت ودیعه از سوی برگزارکننده هستید؛ تا آن زمان مراسم قطعی نشده است."] =
  "You are waiting for the organizer to pay the deposit; until then the ceremony is not final.";
f["با تأیید اجرا، حق‌الزحمهٔ {name} پس از کسر کارمزد سامانه از ودیعه و ماندهٔ قرارداد تسویه می‌شود و قرارداد بسته می‌شود؛ این اقدام بازگشت‌پذیر نیست. مراسم برگزار شده است؟"] =
  "By confirming, {name}'s fee is settled from the deposit and the contract remainder, minus the platform fee, and the contract closes; this action cannot be undone. Was the ceremony held?";
f["بازگشت"] = "Back";
f["تأیید و تسویه"] = "Confirm & settle";
f["سیاست لغو وُدّا: بازگشت ودیعه بر اساس فاصلهٔ زمانی تا شروع مراسم محاسبه می‌شود؛ هرچه به زمان مراسم نزدیک‌تر باشید، بخش کمتری از ودیعه بازمی‌گردد و در صورت لغو، حق قاری طبق همین سیاست محفوظ می‌ماند."] =
  "Vodda cancellation policy: the deposit refund is calculated based on the time remaining until the ceremony starts; the closer to the ceremony, the smaller the refunded share, and in case of cancellation the reciter's right is protected under the same policy.";
f["انصراف"] = "Cancel";
f["لغو قرارداد"] = "Cancel contract";

/* ───────────  فهرست و جزئیات فراخوان (CeremonyCalls/CeremonyCall)  ─────────── */
f["دریافت فراخوان‌ها ناموفق بود"] = "Fetching your calls failed";
f["هنوز فراخوانی نساخته‌اید"] = "You haven't created any calls yet";
f["برای مراسم خود فراخوان بگذارید تا قاریان حق‌الزحمه‌شان را اعلام کنند."] =
  "Post a call for your ceremony so reciters can name their fee.";
f["🔔 فراخوان مراسم جدید"] = "🔔 New ceremony call";
f["{count} فراخوان ثبت کرده‌اید؛ وضعیت پذیرش‌ها را همین‌جا پیگیری کنید."] =
  "You have posted {count} calls; track the offers here.";
f["مراسم دیگری در پیش دارید؟ یک فراخوان تازه بسازید."] = "Another ceremony coming up? Create a new call.";
f["فراخوان جدید"] = "New call";
f["پذیرش"] = "offers";
f["دریافت فراخوان ناموفق بود"] = "Fetching the call failed";
f["فراخوان لغو شد"] = "The call was canceled";
f["این فراخوان بسته شد و برای قاریان دیگر نمایش داده نمی‌شود."] = "This call is closed and is no longer shown to reciters.";
f["مهلت پذیرش: {date}"] = "Offer deadline: {date}";
f["بودجهٔ اعلام‌شده: {range} · ودیعه: {deposit}٪"] = "Announced budget: {range} · deposit: {deposit}%";
f["زنده"] = "Live";
f["در انتظار پذیرش قاریان…"] = "Waiting for reciters to accept…";
f["فراخوان شما برای قاریان «{title}» ارسال شد. پذیرش‌ها همین‌جا زنده نمایش داده می‌شوند."] =
  "Your call was sent to reciters for “{title}”. Offers appear here live.";
f["پذیرش‌های رسیده"] = "Offers received";
f["پذیرش‌ها"] = "Offers";
f["پذیرشی ثبت نشده"] = "No offers submitted";
f["این فراخوان دیگر در حال جستجو نیست و پذیرشی برای آن ثبت نشده است."] =
  "This call is no longer searching and received no offers.";
f["قاری انتخاب شد و قرارداد مراسم ساخته شد. برای پرداخت ودیعه و پیگیری اجرا، جزئیات قرارداد را باز کنید."] =
  "A reciter was chosen and the ceremony contract was created. Open the contract details to pay the deposit and follow the ceremony.";
f["بازگشت به فراخوان‌های من"] = "Back to my calls";
f["با لغو فراخوان، همهٔ پذیرش‌های رسیده باطل می‌شوند و این درخواست برای قاریان نمایش داده نمی‌شود. ادامه می‌دهید؟"] =
  "By canceling the call, all received offers are voided and this request is no longer shown to reciters. Continue?";
f["لغو فراخوان"] = "Cancel call";
f["قاری قرآن"] = "Quran reciter";
f["نظر"] = "reviews";
f["انتخاب و قطعی‌سازی"] = "Choose & finalize";

/* ───────────  واژه‌های مشترک  ─────────── */
f["مهمان"] = "guests";
f["قاری"] = "reciters";
f["مراسم"] = "ceremonies";
f["نمونهٔ صوتی"] = "audio samples";
f["از {price}"] = "from {price}";
f["دقیقه"] = "minutes";
f["همهٔ شهرها"] = "All cities";
f["تومان"] = "Toman";
f["کاربر وُدّا"] = "Vodda user";
f["برگزارکننده:"] = "Organizer:";
f["دلخواه"] = "custom";

/* ───────────  قاریان حضوری (PresenceScreen / PresenceProviderScreen)  ─────────── */
f["قاریان حضوری"] = "In-person reciters";
f["قاری مراسم خود را ببینید، بشنوید و مستقیم رزرو کنید"] = "See, hear and book your ceremony reciter directly";
f["فیلتر شهر؛ مثلاً قم…"] = "Filter by city; e.g. Qom…";
f["فیلتر شهر"] = "City filter";
f["جستجو"] = "Search";
f["فیلتر خدمت حضوری"] = "In-person service filter";
f["همهٔ خدمات حضوری"] = "All in-person services";
f["فیلتر فعال:"] = "Active filter:";
f["شهر «{city}»"] = "city “{city}”";
f["پاک کردن فیلترها"] = "Clear filters";
f["دریافت قاریان ناموفق بود"] = "Fetching reciters failed";
f["قاری‌ای پیدا نشد"] = "No reciter found";
f["با فیلترهای دیگر جستجو کنید؛ قاریان جدید به‌تدریج به این فهرست افزوده می‌شوند."] =
  "Try other filters; new reciters are gradually added to this list.";
f["برای میزبانی مراسم خود می‌توانید فراخوان بگذارید تا قاریان مناسب، خودشان اعلام آمادگی کنند."] =
  "To host your own ceremony, you can post a call and let suitable reciters come to you.";
f["ثبت فراخوان مراسم"] = "Post a ceremony call";
f["{count} قاری حضوری"] = "{count} in-person reciters";
f["یادداشت برای قاری (اختیاری)…"] = "Note for the reciter (optional)…";
f["یادداشت برای خدمت {title}"] = "Note for the {title} service";
f["بستن"] = "Close";
f["ثبت رزرو و پرداخت ودیعه"] = "Book & pay deposit";
f["پس از ثبت رزرو، قرارداد ساخته می‌شود؛ ودیعهٔ قطعی‌سازی بر اساس نرخ رسمی سامانه در صفحهٔ قرارداد محاسبه و دریافت می‌شود."] =
  "After booking, a contract is created; the confirmation deposit is calculated and charged on the contract page according to the official platform rate.";
f["بستن فرم رزرو"] = "Close booking form";
f["رزرو مستقیم"] = "Book directly";
f["این خدمت فعلاً غیرفعال است."] = "This service is currently inactive.";
f["دریافت پروفایل ناموفق بود"] = "Fetching the profile failed";
f["امتیاز"] = "Rating";
f["نظرها"] = "Reviews";
f["دربارهٔ قاری"] = "About the reciter";
f["نمونهٔ تلاوت‌ها"] = "Recitation samples";
f["خدمات حضوری"] = "In-person services";
f["خدمتی ثبت نشده"] = "No services registered";
f["این قاری فعلاً خدمت حضوری قابل رزروی ندارد؛ می‌توانید برای مراسم خود فراخوان بگذارید."] =
  "This reciter has no bookable in-person service yet; you can post a call for your ceremony.";
f["در رزرو مستقیم، قرارداد بدون فراخوان ساخته می‌شود؛ پس از پرداخت ودیعه، مراسم قطعی و نشانی مکان برای قاری ارسال می‌شود."] =
  "With direct booking, the contract is created without a call; once the deposit is paid, the ceremony is confirmed and the address is sent to the reciter.";

/* ───────────  صندوق فراخوان قاری (TeacherCeremonyScreen)  ─────────── */
f["فراخوان مراسم"] = "Ceremony call";
f["فراخوان‌های مراسم حضوری را مشاهده و اعلام پذیرش کنید"] = "Browse in-person ceremony calls and submit your offers";
f["فراخوان باز"] = "open calls";
f["⏳ {count} پذیرش فعال دارید که منتظر انتخاب برگزارکننده هستند."] =
  "⏳ You have {count} active offers waiting for the organizer's selection.";
f["فراخوان‌های باز"] = "Open calls";
f["پذیرش‌های من"] = "My offers";
f["فعلاً فراخوان مراسمی نیست"] = "No ceremony calls right now";
f["به‌محض ثبت فراخوان مراسم توسط برگزارکننده‌ها، همین‌جا نمایش داده می‌شود. برای دیده‌شدن در جستجوی مراسم، خدمات حضوری خود را ثبت کنید."] =
  "As soon as organizers post ceremony calls, they appear here. Register your in-person services to appear in ceremony search.";
f["ثبت خدمات حضوری"] = "Register in-person services";
f["به‌روزرسانی شد"] = "Updated";
f["پذیرشی ثبت نکرده‌اید"] = "You haven't submitted any offers";
f["با پذیرش فراخوان‌های مراسم، برگزارکننده‌ها شما را می‌بینند و انتخاب می‌کنند."] =
  "By accepting ceremony calls, organizers will see and choose you.";
f["نکته: اگر در پذیرش قیمت ننویسید، قیمت خدمت حضوریِ شما برای همان موضوع مبنای محاسبه می‌شود. پس از انتخاب‌شدن، قرارداد ساخته شده و ودیعه از برگزارکننده دریافت می‌گردد."] =
  "Note: if you don't name a price when accepting, your in-person service price for that topic is used. Once chosen, a contract is created and the deposit is collected from the organizer.";
f["پذیرش «{title}»"] = "Accept “{title}”";
f["پذیرش مراسم"] = "Accept ceremony";
f["بودجهٔ برگزارکننده:"] = "Organizer's budget:";
f["خدمات شما ✓"] = "Your services ✓";
f["⏳ پذیرش شما ثبت شد؛ منتظر انتخاب برگزارکننده هستید. نتیجه در «پذیرش‌های من» دیده می‌شود."] =
  "⏳ Your offer is submitted; you are waiting for the organizer's choice. The result appears in “My offers”.";
f["🤝 پذیرش این مراسم"] = "🤝 Accept this ceremony";
f["پیشنهاد قیمت از خدمات حضوری شما: {price}"] = "Suggested price from your in-person services: {price}";
f["پذیرش #{id} · {price}"] = "Offer #{id} · {price}";
f["پس گرفتن پذیرش"] = "Withdraw offer";
f["برگزارکننده شما را انتخاب کرد؛ قرارداد مراسم در «خدمات حضوری» قابل پیگیری است."] =
  "The organizer chose you; the ceremony contract can be followed under “In-person services”.";
f["این فراخوان بسته شد؛ پذیرش شما انتخاب نشد."] = "This call is closed; your offer was not chosen.";
f["حق‌الزحمهٔ پیشنهادی"] = "Proposed fee";
f["تومان — از پیشنهادها انتخاب کنید یا دقیق بنویسید"] = "Toman — pick a suggestion or type an exact amount";
f["حق‌الزحمهٔ پیشنهادی به تومان"] = "Proposed fee in Toman";
f["خالی بگذارید تا قیمت خدمت حضوری شما برای این موضوع اعمال شود."] =
  "Leave empty to apply your in-person service price for this topic.";
f["قیمت پیشنهادی خود را به تومان وارد کنید."] = "Enter your proposed price in Toman.";
f["پیام به برگزارکننده (اختیاری)"] = "Message to the organizer (optional)";
f["مثلاً: تجربهٔ اجرای مراسم عروسی و ختم را دارم…"] = "e.g. I have experience performing wedding and memorial ceremonies…";
f["ثبت پذیرش"] = "Submit offer";

/* ───────────  فرم ثبت فراخوان (CeremonyNewScreen)  ─────────── */
f["مراسم خود را ثبت کنید؛ قاریان حق‌الزحمهٔ خود را اعلام می‌کنند"] = "Register your ceremony; reciters will name their fee";
f["جزئیات مراسم را ثبت کنید"] = "Register the ceremony details";
f["قاریان اعلام آمادگی می‌کنند"] = "Reciters declare their readiness";
f["یک را قطعی کنید"] = "Finalize one";
f["تغییر موضوع"] = "Change topic";
f["۱. موضوع مراسم را انتخاب کنید"] = "1. Choose the ceremony topic";
f["از خدمات حضوری رسمی وُدّا — {count} خدمت تأییدشده"] = "From Vodda's official in-person services — {count} verified services";
f["دریافت خدمات ناموفق بود"] = "Fetching services failed";
f["خدمتی پیدا نشد"] = "No service found";
f["فعلاً خدمت حضوری ثبت‌شده‌ای در کاتالوگ نیست."] = "There are no registered in-person services in the catalog yet.";
f["۲. زمان و مکان"] = "2. Time & venue";
f["ساعت {time}"] = "at {time}";
f["تاریخ و ساعت برگزاری"] = "Ceremony date & time";
f["۳. مهمانان و قاریان"] = "3. Guests & reciters";
f["تعداد مهمانان"] = "Number of guests";
f["انتخاب سریع یا دکمه‌های + و −"] = "Quick pick or + and − buttons";
f["نفر"] = "guests";
f["تعداد قاریان موردنیاز"] = "Reciters needed";
f["۱ تا ۱۰ قاری"] = "1 to 10 reciters";
f["۱ قاری"] = "1 reciter";
f["کاهش تعداد قاریان"] = "Fewer reciters";
f["افزایش تعداد قاریان"] = "More reciters";
f["۴. بودجه و مخاطبان"] = "4. Budget & audience";
f["برای رعایت شرعی فضای مراسم"] = "to respect the ceremony's religious setting";
f["مخاطبان مراسم"] = "Ceremony audience";
f["{count} از ۳۰۰"] = "{count} of 300";
f["یادداشت برای قاریان (اختیاری)"] = "Note for reciters (optional)";
f["مثلاً: مراسم ختم قرآن است؛ تلاوت سورهٔ رعد و دعای پایانی مدنظر است…"] =
  "e.g. It is a Quran-khatm ceremony; recitation of Surah Ar-Ra'd and a closing prayer are planned…";
f["یادداشت فراخوان مراسم"] = "Ceremony call note";
f["فراخوان مراسم ثبت شد و برای قاریان ارسال گردید"] = "The ceremony call was registered and sent to reciters";

/* ───────────  کیت فیلدها (fields.tsx)  ─────────── */
f["مثلاً ۱۵۰۰۰۰۰"] = "e.g. 1500000";
f["مبلغ توافقی — بدون مبلغ ثابت"] = "Negotiable — no fixed amount";
f["مبلغ دلخواه…"] = "Custom amount…";
f["بودجهٔ پیشنهادی"] = "Proposed budget";
f["حق‌الزحمهٔ منصفانه برای قاریان"] = "A fair fee for reciters";
f["بازهٔ بودجهٔ پیشنهادی"] = "Proposed budget range";
f["حداقل بودجه به تومان"] = "Minimum budget in Toman";
f["حداکثر بودجه به تومان"] = "Maximum budget in Toman";
f["حداقل"] = "Min";
f["حداکثر"] = "Max";
f["بازهٔ اعلام‌شده به قاریان: {range}"] = "Range announced to reciters: {range}";
f["انتخاب کنید…"] = "Select…";
f["کاهش {x}"] = "Decrease {x}";
f["افزایش {x}"] = "Increase {x}";
f["شهر برگزاری"] = "Ceremony city";
f["اجباری"] = "required";
f["انتخاب شهر…"] = "Choose a city…";
f["شهر دیگر…"] = "Another city…";
f["نام شهر را بنویسید…"] = "Type the city name…";
f["نام شهر"] = "City name";
f["نوع مکان"] = "Venue type";
f["برای پرکردن سریع"] = "for a quick fill";
f["نوع مکان مراسم"] = "Ceremony venue type";
f["بدون نوع مشخص…"] = "No specific type…";
f["نشانی دقیق یا مشخصات مکان"] = "Exact address or venue details";
f["اختیاری و محرمانه — فقط برای قاریِ انتخاب‌شده نشان داده می‌شود"] =
  "Optional and confidential — shown only to the chosen reciter";
f["نشانی دقیق؛ مثلاً: مسجد جامع، سالن شماره ۲…"] = "Exact address; e.g. Grand Mosque, Hall No. 2…";
f["موقعیت یافت شد اما نشانی خودکار در دسترس نبود؛ شهر و نشانی را دستی وارد کنید."] =
  "Location found but the automatic address was unavailable; enter the city and address manually.";
f["دسترسی به موقعیت دستگاه داده نشد؛ مجوز موقعیت را در تنظیمات فعال کنید یا نشانی را دستی وارد کنید."] =
  "Device location access was denied; enable location permission in settings or enter the address manually.";
f["یافتن موقعیت بیش از حد طول کشید؛ لطفاً دوباره تلاش کنید."] = "Finding your location took too long; please try again.";
f["موقعیت دستگاه در دسترس نیست؛ نشانی را دستی وارد کنید."] = "Device location is unavailable; enter the address manually.";
f["شهر «{city}» از موقعیت دستگاه ثبت شد"] = "City “{city}” was registered from your device location";
f["موقعیت دستگاه ثبت شد"] = "Device location registered";
f["نشانی شناسایی‌شده: {address}"] = "Detected address: {address}";
f["مختصات: {lat} ، {lon}"] = "Coordinates: {lat}, {lon}";
f["تازه‌سازی موقعیت"] = "Refresh location";
f["درج در نشانی"] = "Use in address";
f["استفاده از موقعیت دستگاه برای پرکردن نشانی"] = "Use device location to fill the address";
f["در حال یافتن موقعیت…"] = "Finding your location…";
f["استفاده از موقعیت من"] = "Use my location";
f["شهر و نشانی به‌صورت خودکار از GPS پر می‌شود"] = "City and address are filled automatically from GPS";
f["پیش‌نمایش نقشهٔ موقعیت مراسم"] = "Preview map of the ceremony location";
f["مشاهده روی نقشه"] = "View on map";
f["بستن نقشه"] = "Close map";
f["موقعیت دستگاه شما فقط برای پرکردن متن نشانی استفاده می‌شود و تنها به قاریِ انتخاب‌شده نمایش داده می‌شود."] =
  "Your device location is only used to fill the address text and is shown solely to the chosen reciter.";
f["ساعت پیشنهادی"] = "Suggested time";
f["یا از پیکر بالا انتخاب کنید"] = "or pick from the picker above";
f["ساعت‌های پیشنهادی مراسم"] = "Suggested ceremony times";
f["ساعت دلخواه"] = "Custom time";
f["مدت اجرا"] = "Duration";
f["مدت اجرا به دقیقه"] = "Duration in minutes";
f["انتخاب مدت اجرا…"] = "Choose a duration…";
f["دقیقهٔ دلخواه…"] = "Custom minutes…";
f["شهرهای پذیرش مراسم"] = "Cities you serve";
f["از فهرست انتخاب یا بنویسید"] = "pick from the list or type";
f["همهٔ شهرها — بدون محدودیت"] = "All cities — no restriction";
f["حذف {city}"] = "Remove {city}";
f["افزودن شهر پذیرش"] = "Add a service city";
f["محدود به شهرهای…"] = "Limit to cities…";
f["افزودن شهر…"] = "Add a city…";
f["شهر دیگر را اینجا بنویسید (با ویرگول جدا کنید)…"] = "Type another city here (separate with commas)…";
f["شهرهای دیگر"] = "Other cities";
f["ساعت مراسم"] = "Ceremony hour";
f["دقیقهٔ مراسم"] = "Ceremony minute";
f["زمان مراسم به وقت رسمی ایران (تهران) است؛ تاریخ انتخابی: {date}"] =
  "The ceremony time is Iran official time (Tehran); selected date: {date}";
f["تاریخ و ساعت مراسم"] = "Ceremony date & time";
f["نمونهٔ تلاوت"] = "Recitation sample";
f["مرورگر شما از پخش صوت پشتیبانی نمی‌کند."] = "Your browser does not support audio playback.";

/* ───────────  داده‌های پرتردد fields.tsx (ترجمه در محل رندر)  ─────────── */
f["تهران"] = "Tehran";
f["کرج"] = "Karaj";
f["مشهد"] = "Mashhad";
f["قم"] = "Qom";
f["اصفهان"] = "Isfahan";
f["شیراز"] = "Shiraz";
f["تبریز"] = "Tabriz";
f["اهواز"] = "Ahvaz";
f["رشت"] = "Rasht";
f["یزد"] = "Yazd";
f["کرمان"] = "Kerman";
f["همدان"] = "Hamadan";
f["مسجد"] = "Mosque";
f["حسینیه"] = "Hosseiniyeh";
f["مصلی"] = "Mosalla";
f["سالن و تالار"] = "Hall & venue";
f["خانه"] = "Home";
f["فضای باز"] = "Open air";
f["صبح · ۱۰:۰۰"] = "Morning · 10:00";
f["ظهر · ۱۳:۰۰"] = "Noon · 13:00";
f["عصر · ۱۷:۰۰"] = "Afternoon · 17:00";
f["پس از مغرب · ۱۹:۰۰"] = "After sunset · 19:00";
f["پس از عشا · ۲۱:۰۰"] = "After Isha · 21:00";
f["تلاوت یک جزء"] = "One-juz recitation";
f["تلاوت یک جزء کامل مدنظر است"] = "A full juz recitation is planned";
f["ادعای پایانی"] = "Closing prayer";
f["ادعای پایانی مراسم هم اجرا شود"] = "The closing prayer should also be performed";
f["تواشیح و همخوانی"] = "Chant & chorus";
f["برنامهٔ تواشیح و همخوانی هم دارند"] = "There is also a chant & chorus program";
f["نیاز به مداحی"] = "Eulogy needed";
f["نیاز به مداحی هم داریم"] = "We also need a eulogist (maddah)";
f["میکروفن و صوت آماده"] = "Mic & sound ready";
f["سیستم صوتی و میکروفن آماده است"] = "Sound system and microphones are ready";
f["توافقی"] = "Negotiable";
f["بدون کف و سقف بودجه"] = "No budget floor or ceiling";
f["تا ۵۰۰ هزار"] = "Up to 500 thousand";
f["سقف ۵۰۰ هزار تومان"] = "Ceiling: 500 thousand Toman";
f["۵۰۰ تا ۱ میلیون"] = "500 thousand – 1 million";
f["بازهٔ اقتصادی"] = "Economy range";
f["۱ تا ۲ میلیون"] = "1 – 2 million";
f["پرترددترین بازه"] = "Most common range";
f["۲ تا ۳ میلیون"] = "2 – 3 million";
f["اجرای ویژه"] = "Special performance";
f["بالای ۳ میلیون"] = "Above 3 million";
f["مجلس بزرگ"] = "Large gathering";
f["بازهٔ دلخواه"] = "Custom range";
f["تعیین دقیق کف و سقف"] = "Set exact floor and ceiling";
f["بازهٔ دلخواه — تعیین دقیق کف و سقف"] = "Custom range — set exact floor and ceiling";

/* ───────────  پنل خدمات حضوری قاری (TeacherPresenceScreen)  ─────────── */
f["خدمت رسمی"] = "Official service";
f["کاتالوگ خدمات حضوری دریافت نشد."] = "Could not fetch the in-person services catalog.";
f["حق‌الزحمهٔ پایه"] = "Base fee";
f["تومان — مبنای پیشنهاد شما در فراخوان‌ها و رزرو مستقیم"] =
  "Toman — the basis of your offers in calls and direct bookings";
f["حق‌الزحمهٔ پایه برای خدمت {title}"] = "Base fee for the {title} service";
f["حضوری"] = "in-person";
f["توضیح خدمت (اختیاری)"] = "Service description (optional)";
f["مثلاً: تلاوت جزء ۳۰ با روخوانی معتبر؛ مناسب مراسم ختم…"] =
  "e.g. Recitation of Juz 30 with a valid tarteel; suitable for khatm ceremonies…";
f["ذخیرهٔ تغییرات"] = "Save changes";
f["افزودن خدمت حضوری"] = "Add in-person service";
f["در کاتالوگ مراسم دیده شوید و رزرو مستقیم دریافت کنید"] =
  "Get discovered in the ceremony catalog and receive direct bookings";
f["خدمت فعال"] = "active services";
f["خدمات من"] = "My services";
f["مراسم‌های من"] = "My ceremonies";
f["هنوز خدمت حضوری ثبت نکرده‌اید"] = "You haven't registered an in-person service yet";
f["با ثبت خدمت حضوری، در کاتالوگ «قاریان حضوری» نمایش داده می‌شوید و رزرو مستقیم دریافت می‌کنید."] =
  "By registering an in-person service you appear in the “In-person reciters” catalog and receive direct bookings.";
f["خدمت حضوری"] = "In-person service";
f["فعال در کاتالوگ"] = "Active in catalog";
f["غیرفعال"] = "Inactive";
f["ویرایش"] = "Edit";
f["حذف خدمت {title}"] = "Delete the {title} service";
f["ویرایش خدمت حضوری"] = "Edit in-person service";
f["خدمت حضوری جدید"] = "New in-person service";
f["قیمت پایه به‌عنوان پیشنهاد پذیرش فراخوان‌ها و رزرو مستقیم استفاده می‌شود؛ کارمزد سامانه هنگام تسویه از آن کسر می‌گردد."] =
  "Your base price is used as the proposed offer for calls and direct bookings; the platform fee is deducted from it at settlement.";
f["مراسمی در کار نیست"] = "No ceremonies yet";
f["با پذیرش فراخوان‌ها یا گرفتن رزرو مستقیم، قراردادهای مراسم شما این‌جا فهرست می‌شود."] =
  "By accepting calls or receiving direct bookings, your ceremony contracts are listed here.";
f["وضعیت ودیعه، نشانی دقیق مراسم و تسویه در جزئیات هر قرارداد دیده می‌شود."] =
  "The deposit status, exact ceremony address and settlement are shown in each contract's details.";
f["حذف خدمت حضوری"] = "Delete in-person service";
f["با حذف، این خدمت از کاتالوگ «قاریان حضوری» برداشته می‌شود و رزرو مستقیم دریافت نخواهید کرد. قراردادهای قبلی به قوت خود باقی هستند."] =
  "Deleting removes this service from the “In-person reciters” catalog and you will no longer receive direct bookings. Existing contracts remain valid.";
f["حذف خدمت"] = "Delete service";

export default f;

/* ───────────  پشتیبان‌های باقی‌مانده (audit کامل انگلیسی‌سازی)  ─────────── */
f["پیگیری فراخوان‌های ثبت‌شده و پذیرش‌های رسیده"] = "Track your calls and incoming offers";
f["پیگیری فراخوان‌های ثبت‌شدهٔ من"] = "Track your submitted calls";
f["فهرست قاریان تأییدشده و رزرو مستقیم مراسم"] = "Verified in-person reciters with direct booking";
f["فهرست قاریان حضوری و رزرو مستقیم"] = "In-person reciters and direct booking";
f["، "] = ", ";
f["؛"] = "; ";
f["خدمات حضوری قرآنی"] = "In-person Quranic services";

/* ───────────  خدمات حضوری رسمی (عنوان‌های بک‌اند presence_services)  ─────────── */
f["تلاوت مجلسی قرآن کریم"] = "Majlis recitation of the Holy Quran";
f["ختم قرآن برای درگذشتگان"] = "Quran khatm for the departed";
f["تلاوت در جشن‌ها و جشنواره‌های قرآنی"] = "Recitation at Quranic festivals & celebrations";
f["اذان و اقامه در مراسم"] = "Azan & iqamah at ceremonies";
f["تواشیح و همخوانی مجلسی"] = "Group hymns & chorale at gatherings";
f["قرائت دعا و زیارت در مراسم"] = "Prayer & ziyarah recitation at ceremonies";
f["کلاس حضوری قرآن در مؤسسه"] = "In-person Quran class at institutes";
