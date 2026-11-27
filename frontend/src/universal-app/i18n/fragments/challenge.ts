/** فرگمنت ترجمهٔ فارسی→انگلیسی برای حوزهٔ چالش‌های قرآنی — کلید = متن فارسی داخل کد. */
const f: Record<string, string> = {};

/* ───────────  مراحل چالش و حوزه‌ها (api.ts — challengePhaseLabel/ModeLabel)  ─────────── */
f["ثبت‌نام"] = "Register";
f["در حال اجرا"] = "Running";
f["رأی‌گیری"] = "Voting";
f["پایان‌یافته"] = "Finished";
f["لغوشده"] = "Canceled";
f["حوزهٔ صوتی"] = "Audio track";
f["حوزهٔ تشریحی"] = "Description track";

/* ───────────  رتبه‌ها (challengeRankLabel)  ─────────── */
f["رتبهٔ اول"] = "First place";
f["رتبهٔ دوم"] = "Second place";
f["رتبهٔ سوم"] = "Third place";
f["رتبهٔ چهارم"] = "Fourth place";
f["رتبهٔ پنجم"] = "Fifth place";
f["رتبهٔ {n}"] = "Rank {n}";
f["رتبهٔ شما"] = "Your rank";
f["شما"] = "You";

/* ───────────  امتیاز اینستاقرآن (pointReasonLabel)  ─────────── */
f["امتیاز شرکت در چالش"] = "Challenge participation points";
f["بازگشت امتیاز ثبت‌نام چالش"] = "Challenge registration refund";
f["پاداش رتبه در چالش"] = "Rank reward in challenge";
f["امتیاز مدیریت"] = "Admin score";
f["امتیاز اینستاقرآن"] = "InstaQuran points";
f["موجودی اینستاقرآن"] = "InstaQuran balance";
f["امتیاز پاداش رتبه"] = "Rank bonus points";
f["تاریخچهٔ امتیاز"] = "Points history";
f["هنوز امتیازی ثبت نشده است"] = "No points recorded yet";
f["۱۰ امتیاز اینستاقرآن برای ثبت‌نام ثبت شد"] = "10 InstaQuran points recorded for registering";

/* ───────────  کارت جذاب چالش و هیرؤ جزئیات  ─────────── */
f["پاداش ثبت‌نام"] = "Registration reward";
f["۱۰ امتیاز اینستاقرآن"] = "10 InstaQuran points";
f["تلاوت نمونهٔ استاد"] = "Sample recitation by a teacher";
f["مسابقهٔ فعال"] = "Live contest";
f["تا پایان مهلت ارسال"] = "Until the submission deadline";
f["ظرفیت تکمیل شد"] = "Capacity is full";
f["آمادهٔ آغاز"] = "Ready to start";
f["با تکمیل ظرفیت، چالش خودکار آغاز می‌شود"] = "The challenge starts automatically when capacity fills";
f["به رقابت بپیوندید"] = "Join the contest";
f["جزئیات و ثبت‌نام"] = "Details & registration";
f["امتیاز لازم نیست — فقط شرکت کنید"] = "No entry cost — just participate";

/* ───────────  کارت امتیاز پروفایل  ─────────── */
f["امتیاز اینستاقرآن شما"] = "Your InstaQuran points";
f["امتیازِ شما از رقابت‌های قرآنی وُدّا — شرکت، رتبه و پاداش"] =
  "Your points from Vodda Quran contests — participation, rank and rewards";
f["مشاهدهٔ چالش‌ها"] = "View challenges";
f["آخرین تغییرهای امتیاز"] = "Recent point changes";
f["چگونه امتیاز بگیرم؟"] = "How do I earn points?";
f["شرکت در هر چالش ۱۰ امتیاز و رتبهٔ اول تا پنجم تا ۱۰۰ امتیاز پاداش دارد."] =
  "Joining a challenge earns 10 points; ranks 1–5 earn up to 100 bonus points.";

/* ───────────  ورودی چالش در داشبورد مدیر و استاد  ─────────── */
f["مشاهده و شرکت در چالش‌ها"] = "View and join challenges";
f["به‌عنوان کاربر وارد فهرست چالش‌ها شوید؛ ثبت‌نام، ارسال اثر و رأی همین‌جاست."] =
  "Open the participant-side challenge list; registering, submitting and voting happen there.";
f["داوری چالش‌ها"] = "Judge challenges";
f["به‌عنوان استاد داور، رأی شما جداگانه در نتایج شمرده می‌شود."] =
  "As a judge teacher, your vote counts separately in the results.";

/* ───────────  مدیریت — لغو، بازگشایی و حذف کامل  ─────────── */
f["لغو چالش"] = "Cancel challenge";
f["لغو چالش بازگشت‌پذیر نیست؛ امتیاز ثبت‌نام شرکت‌کنندگان بازگردانده می‌شود. ادامه می‌دهید؟"] =
  "Canceling cannot be undone; participants' registration points will be refunded. Continue?";
f["چالش لغو شد."] = "Challenge canceled.";
f["لغو چالش انجام نشد."] = "Canceling the challenge failed.";
f["بازگشایی چالش"] = "Reopen challenge";
f["چالش به مرحلهٔ ثبت‌نام بازگشت."] = "The challenge is back to the registration stage.";
f["بازگشایی چالش انجام نشد."] = "Reopening the challenge failed.";
f["با حذف چالش، همهٔ شرکت‌کنندگان و رأی‌های آن هم حذف می‌شوند. ادامه می‌دهید؟"] =
  "Deleting the challenge also removes all its participants and votes. Continue?";
f["حذف چالش‌های لغوشده"] = "Delete canceled challenge";
f["سهمیهٔ رأی شما"] = "Your vote quota";

/* ───────────  فهرست چالش‌ها  ─────────── */
f["چالش‌های قرآنی"] = "Quran Challenges";
f["رقابت‌های قرآنی وُدّا — ثبت‌نام، ارسال، رأی‌گیری و امتیاز"] =
  "Vodda Quran contests — register, submit, vote and earn points";
f["رقابت‌های تلاوت و تشریح — ثبت‌نام، ارسال، رأی و امتیاز اینستاقرآن"] =
  "Recitation & description contests — register, submit, vote and earn InstaQuran points";
f["در حال دریافت چالش‌ها…"] = "Loading challenges…";
f["در حال دریافت چالش…"] = "Loading challenge…";
f["دریافت چالش‌ها ناموفق بود"] = "Could not load challenges";
f["فهرست چالش‌ها دریافت نشد"] = "Could not fetch the challenge list";
f["فهرست چالش‌ها دریافت نشد."] = "Could not fetch the challenge list.";
f["هنوز چالشی برگزار نشده است"] = "No challenge has been held yet";
f["به‌زودی نخستین چالش قرآنی اینجا آغاز می‌شود؛ منتظر باشید."] =
  "The first Quran challenge will start here soon; stay tuned.";
f["ظرفیت: {a} از {b}"] = "Capacity: {a} of {b}";
f["ظرفیت تکمیل"] = "Capacity full";
f["ثبت‌نام‌شده"] = "Registered";
f["ثبت‌نام در چالش"] = "Register for the challenge";
f["ثبت‌نام در چالش انجام نشد"] = "Registering for the challenge failed";
f["بازگشت به چالش‌ها"] = "Back to challenges";
f["چالش پیدا نشد"] = "Challenge not found";
f["نشانی این چالش نامعتبر است."] = "This challenge address is invalid.";
f["دریافت جزئیات چالش ناموفق بود"] = "Could not load the challenge details";
f["جزئیات چالش دریافت نشد."] = "Could not load the challenge details.";
f["پاسخ جزئیات چالش نامعتبر بود."] = "The challenge details response was invalid.";

/* ───────────  جزئیات — تلاوت نمونه و ظرفیت  ─────────── */
f["تلاوت نمونه"] = "Sample recitation";
f["تلاوت نمونهٔ استاد: {n}"] = "Sample recitation by teacher {n}";
f["شما در این چالش ثبت‌نام کرده‌اید؛ منتظر آغاز رقابت باشید."] =
  "You are registered in this challenge; the contest will start soon.";
f["ثبت‌نام این چالش پایان یافته است."] = "Registration for this challenge has ended.";
f["این چالش لغو شده است."] = "This challenge has been canceled.";

/* ───────────  جزئیات — ارسال (مرحلهٔ اجرا)  ─────────── */
f["ارسال در چالش"] = "Challenge submission";
f["مهلت ارسال"] = "Submission deadline";
f["مهلت رأی‌گیری"] = "Voting deadline";
f["ارسال شما"] = "Your submission";
f["متن تلاوت یا توضیح شما"] = "Your recitation text or description";
f["متن ارسال خود را بنویسید…"] = "Write your submission…";
f["فایل صوتی (اختیاری)"] = "Audio file (optional)";
f["انتخاب فایل صوتی از دستگاه"] = "Pick an audio file from your device";
f["حذف فایل انتخابی"] = "Remove selected file";
f["webm/ogg/mp3/m4a/wav — حداکثر ۵ مگابایت"] = "webm/ogg/mp3/m4a/wav — up to 5 MB";
f["ثبت ارسال"] = "Submit";
f["برای ارسال، متن یا فایل صوتی لازم است."] = "A text or an audio file is required to submit.";
f["حجم فایل صوتی باید حداکثر ۵ مگابایت باشد."] = "The audio file must be at most 5 MB.";
f["ارسال شما در چالش ثبت شد"] = "Your submission was recorded";
f["ارسال در چالش انجام نشد"] = "Submitting to the challenge failed";
f["پاسخ ثبت مشارکت نامعتبر بود."] = "The submission response was invalid.";

/* ───────────  جزئیات — رأی‌گیری  ─────────── */
f["ارسال‌های شرکت‌کنندگان"] = "Participant submissions";
f["هنوز ارسالی برای رأی‌گیری ثبت نشده است"] = "No submission is open for voting yet";
f["رأی"] = "Vote";
f["رأی دادید"] = "Voted";
f["رأی شما ثبت شد"] = "Your vote was recorded";
f["ثبت رأی انجام نشد"] = "Voting failed";
f["رأی اساتید داور جداگانه ثبت می‌شود"] = "Judges' scores are recorded separately";
f["رأی مخاطبان"] = "Audience vote";
f["رأی اساتید داور"] = "Judges' vote";
f["نظر مدیریت"] = "Admin review";
f["امتیاز نهایی"] = "Final score";

/* ───────────  جزئیات — کارنامه و رتبه‌بندی  ─────────── */
f["کارنامهٔ چالش"] = "Challenge report card";
f["رتبه‌بندی نهایی"] = "Final ranking";
f["برای شما در این چالش کارنامه‌ای ثبت نشده است."] =
  "No report card was recorded for you in this challenge.";
f["پاداش: رتبهٔ اول ۱۰۰، دوم ۷۰، سوم ۵۰، چهارم ۳۰ و پنجم ۲۰ امتیاز اینستاقرآن"] =
  "Rewards: 100 InstaQuran points for 1st place, 70 for 2nd, 50 for 3rd, 30 for 4th and 20 for 5th";
f["هنوز رتبه‌ای برای نمایش نیست"] = "No ranks to show yet";

/* ───────────  مدیریت — آمار و فهرست  ─────────── */
f["چالش‌ها"] = "Challenges";
f["ایجاد و داوری رقابت‌های قرآنی"] = "Create and judge Quran contests";
f["کل چالش‌ها"] = "All challenges";
f["در ثبت‌نام"] = "In registration";
f["در حال اجرا و رأی‌گیری"] = "Running & voting";
f["شرکت‌کنندگان"] = "Participants";
f["هنوز شرکت‌کننده‌ای ثبت‌نام نکرده است"] = "No participants have registered yet";
f["هنوز چالشی ساخته نشده است"] = "No challenge has been created yet";
f["ارسال ثبت کرده"] = "Submission received";
f["ایجاد"] = "Created";
f["حذف چالش"] = "Delete challenge";
f["حذف چالش بازگشت‌پذیر نیست. ادامه می‌دهید؟"] = "Deleting the challenge cannot be undone. Continue?";
f["چالش حذف شد."] = "Challenge deleted.";
f["حذف چالش انجام نشد."] = "Deleting the challenge failed.";

/* ───────────  مدیریت — چرخهٔ وضعیت  ─────────── */
f["شروع"] = "Start";
f["شروع رأی‌گیری"] = "Start voting";
f["انتشار نتایج"] = "Publish results";
f["با شروع چالش، ثبت‌نام بسته می‌شود. ادامه می‌دهید؟"] =
  "Starting the challenge closes registration. Continue?";
f["با رفتن به رأی‌گیری، ارسال برای همه بسته می‌شود. ادامه می‌دهید؟"] =
  "Moving to voting closes submissions for everyone. Continue?";
f["با انتشار، رتبه‌ها نهایی و امتیازهای اینستاقرآن ثبت می‌شوند. ادامه می‌دهید؟"] =
  "Publishing finalizes the ranks and records InstaQuran points. Continue?";
f["چالش آغاز شد."] = "Challenge started.";
f["چالش به مرحلهٔ رأی‌گیری رفت."] = "The challenge moved to the voting stage.";
f["نتایج منتشر شد و امتیازها ثبت شدند."] = "Results published and points recorded.";
f["تغییر وضعیت چالش انجام نشد."] = "Changing the challenge status failed.";

/* ───────────  مدیریت — ویرایشگر چالش  ─────────── */
f["چالش جدید"] = "New challenge";
f["ویرایش چالش"] = "Edit challenge";
f["عنوان چالش"] = "Challenge title";
f["عنوان چالش باید حداقل ۳ نویسه باشد."] = "The challenge title must be at least 3 characters.";
f["توضیح چالش"] = "Challenge description";
f["قواعد رقابت و چیزی که شرکت‌کنندگان باید ارسال کنند…"] =
  "Contest rules and what participants should submit…";
f["حوزهٔ رقابت"] = "Contest track";
f["تلاوت صوتی"] = "Audio recitation";
f["توضیح نوشتاری"] = "Written description";
f["فایل صوتی تلاوت نمونه"] = "Sample recitation audio file";
f["آدرس فایل یا بارگذاری از دستگاه"] = "File URL or upload from device";
f["بارگذاری فایل صوتی از دستگاه"] = "Upload an audio file from your device";
f["بارگذاری فایل صوتی انجام نشد."] = "Uploading the audio file failed.";
f["در حال بارگذاری…"] = "Uploading…";
f["نام استاد تلاوت نمونه"] = "Sample recitation teacher name";
f["مثلاً استاد ماهر المعیلی"] = "e.g. teacher's name";
f["ظرفیت (۲ تا ۵۰۰)"] = "Capacity (2–500)";
f["ظرفیت باید عددی بین ۲ تا ۵۰۰ باشد."] = "Capacity must be a number between 2 and 500.";
f["مدت اجرا (ساعت)"] = "Running duration (hours)";
f["مدت رأی‌گیری (ساعت)"] = "Voting duration (hours)";
f["مدت اجرا و رأی‌گیری باید حداقل یک ساعت باشد."] =
  "Running and voting must each be at least one hour.";
f["برای حوزهٔ صوتی، فایل صوتی نمونه لازم است."] = "The audio track requires a sample audio file.";
f["وزن نمره‌دهی (اختیاری)"] = "Score weights (optional)";
f["وزن رأی مخاطبان"] = "Audience weight";
f["وزن رأی اساتید داور"] = "Judges' weight";
f["وزن نظر مدیریت"] = "Admin weight";
f["مجموع وزن‌ها باید ۱۰۰ باشد؛ خالی = ۴۰/۴۰/۲۰"] = "Weights must sum to 100; empty = 40/40/20";
f["وزن‌ها ناقص است؛ هر سه وزن را پر کنید یا همه را خالی بگذارید."] =
  "Weights are incomplete; fill all three or leave all empty.";
f["ذخیره چالش"] = "Save challenge";
f["در حال ذخیره…"] = "Saving…";
f["چالش ساخته شد."] = "Challenge created.";
f["چالش به‌روزرسانی شد."] = "Challenge updated.";
f["ذخیره چالش انجام نشد."] = "Saving the challenge failed.";
f["مثلاً چالش تلاوت جزء سی‌ام"] = "e.g. Juz 30 recitation challenge";

/* ───────────  مدیریت — امتیازدهی شرکت‌کنندگان  ─────────── */
f["۰ تا ۱۰۰"] = "0–100";
f["ثبت امتیاز"] = "Save score";
f["امتیاز باید عددی بین ۰ تا ۱۰۰ باشد."] = "The score must be a number between 0 and 100.";
f["امتیاز ثبت شد."] = "Score saved.";
f["ثبت امتیاز انجام نشد."] = "Saving the score failed.";

/* ───────────  مشترک  ─────────── */
f["تلاش دوباره"] = "Try again";
f["تأیید"] = "Confirm";
f["حذف"] = "Delete";
f["ویرایش"] = "Edit";
f["خطایی رخ داد. دوباره تلاش کنید."] = "Something went wrong. Please try again.";
f["دریافت نتایج ناموفق بود"] = "Could not load the results";
f["در حال دریافت نتایج…"] = "Loading results…";

export default f;
