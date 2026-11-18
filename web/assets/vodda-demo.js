/* وُدّا — لایه نمایشی (دمو) ── داده جعلی برای پیش‌نمایش ظاهر سایت
   ─────────────────────────────────────────────────────────────────
   چه می‌کند؟
   ۱) به همه استادانِ واقعیِ بک‌اند، آواتار نمونه نسبت می‌دهد (بر اساس id).
   ۲) اگر بازدیدکننده وارد نشده باشد، صفحات «جلسات من / کیف پول / پروفایل»
      و ثبت رزرو را با داده نمایشی پر می‌کند تا ظاهر سایت دیده شود.
   ۳) هیچ داده واقعی را تغییر نمی‌دهد؛ کاربر واقعیِ واردشده، داده خودش را می‌بیند
      (فقط آواتار نمونه‌های خالی استادان را می‌بیند).
   حذف کامل: فقط تگ این اسکریپت را از صفحات بردارید. */
(function () {
  'use strict';

  var BFF = '/api/backend/';
  var realFetch = window.fetch ? window.fetch.bind(window) : null;
  if (!realFetch) return;

  /* ---------- آواتارهای نمونه ---------- */
  var MALE = ['/img/avatars/m1.jpg', '/img/avatars/m2.jpg', '/img/avatars/m3.jpg',
              '/img/avatars/m4.jpg', '/img/avatars/m5.jpg', '/img/avatars/m6.jpg'];
  var FEMALE = ['/img/avatars/f1.jpg', '/img/avatars/f2.jpg', '/img/avatars/f3.jpg',
                '/img/avatars/f4.jpg', '/img/avatars/f5.jpg', '/img/avatars/f6.jpg'];
  function pickAvatar(id, female) {
    var list = female ? FEMALE : MALE;
    var n = Math.abs(Number(id) || 0);
    return list[(n * 7 + 3) % list.length];
  }

  /* ---------- کاربر نمایشی ---------- */
  var DEMO_USER = {
    id: 0, name: 'سارا محمدی', mobile: '0912***4567', role: 'student',
    wallet: 2450000, city: 'تهران',
    bio: 'دانش‌آموز قرآن — علاقه‌مند به روخوانی و حفظ جزء سی.'
  };

  /* ---------- داده نمایشی جلسات ---------- */
  function iso(offsetDays) {
    var d = new Date(Date.now() + offsetDays * 86400000);
    return d.toISOString().slice(0, 10);
  }
  var DEMO_UPCOMING = [
    { id: 'd1', service: 'روخوانی و تجوید — جزء ۱', status: 'confirmed',
      local_date: iso(2), local_start: '16:00', local_end: '16:30', duration: 30,
      teacher: { user: { name: 'احمد ربانی نژاد' } } },
    { id: 'd2', service: 'حفظ قرآن — جزء ۳۰', status: 'pending',
      local_date: iso(4), local_start: '10:30', local_end: '11:00', duration: 30,
      teacher: { user: { name: 'فاطمه کریمی' } } },
    { id: 'd3', service: 'مداحی و آواز مقامی', status: 'pending',
      local_date: iso(7), local_start: '19:00', local_end: '20:00', duration: 60,
      teacher: { user: { name: 'عبدالرحمن حیدری' } } }
  ];
  var DEMO_PAST = [
    { id: 'p1', service: 'روخوانی و تجوید — جزء ۲۸', status: 'done',
      local_date: iso(-3), local_start: '17:00', local_end: '17:30', duration: 30,
      teacher: { user: { name: 'احمد ربانی نژاد' } } },
    { id: 'p2', service: 'تجوید و صوت و لحن', status: 'done',
      local_date: iso(-8), local_start: '09:00', local_end: '09:30', duration: 30,
      teacher: { user: { name: 'سکینه موسوی' } } },
    { id: 'p3', service: 'روخوانی قرآن کریم', status: 'canceled',
      local_date: iso(-12), local_start: '14:00', local_end: '14:30', duration: 30,
      teacher: { user: { name: 'یاسر رحمانی' } } }
  ];

  /* ---------- داده نمایشی کیف پول ---------- */
  function txISO(offsetDays, hm) { return iso(offsetDays) + 'T' + (hm || '12:00') + ':00Z'; }
  var DEMO_TX = [
    { title: 'شارژ کیف پول — درگاه بانکی', type: 'charge', amount: 1000000, created_at: txISO(-1, '09:15') },
    { title: 'رزرو جلسه حفظ قرآن — استاد فاطمه کریمی', type: 'session', amount: -380000, created_at: txISO(-2, '14:40') },
    { title: 'شارژ کیف پول — کد هدیه وُدّا', type: 'charge', amount: 200000, created_at: txISO(-6, '18:05') },
    { title: 'رزرو جلسه روخوانی — استاد احمد ربانی نژاد', type: 'session', amount: -350000, created_at: txISO(-9, '11:20') },
    { title: 'بازگشت وجه — لغو جلسه توسط استاد', type: 'charge', amount: 350000, created_at: txISO(-10, '08:00') },
    { title: 'رزرو جلسه تجوید — استاد سکینه موسوی', type: 'session', amount: -420000, created_at: txISO(-15, '16:30') },
    { title: 'شارژ کیف پول — درگاه بانکی', type: 'charge', amount: 1500000, created_at: txISO(-21, '20:10') },
    { title: 'رزرو جلسه مداحی — استاد عبدالرحمن حیدری', type: 'session', amount: -650000, created_at: txISO(-24, '13:45') },
    { title: 'کد تخفیف اولین جلسه (۲۰٪)', type: 'charge', amount: 200000, created_at: txISO(-27, '10:00') }
  ];

  /* ---------- تعیین وضعیت (هم‌زمان، قبل از هر درخواست) ----------
     کوکی واقعی لاگین: vodda_session=1  |  مارکر دمو: vodda_demo=1       */
  function hasCookie(name) { return document.cookie.indexOf(name) !== -1; }
  function setDemoCookie() {
    document.cookie = 'vodda_session=1; path=/; max-age=604800; SameSite=Lax';
    document.cookie = 'vodda_demo=1; path=/; max-age=604800; SameSite=Lax';
  }
  function clearDemoCookie() {
    document.cookie = 'vodda_session=1; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'vodda_demo=1; path=/; max-age=0; SameSite=Lax';
  }

  var demoMode;
  if (hasCookie('vodda_session=1') && !hasCookie('vodda_demo=1')) {
    demoMode = false;             /* کاربر واقعی لاگین‌شده */
  } else if (hasCookie('vodda_demo=1')) {
    demoMode = true;              /* بازدیدکننده در حالت دمو */
  } else {
    setDemoCookie();              /* بازدیدکننده جدید → دمو */
    demoMode = true;
  }

  /* خودترمیمی: اگر تشخیص اولیه اشتباه بود (کوکی کهنه)، یک بار صفحه را
     با وضعیت درست دوباره بارگذاری کن. */
  var healed = false;
  function flipTo(demo) {
    if (healed || demoMode === demo) return false;
    healed = true;
    demoMode = demo;
    if (demo) setDemoCookie(); else clearDemoCookie();
    location.reload();
    return true;
  }

  function jsonRes(status, obj) {
    return new Response(JSON.stringify(obj), {
      status: status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

  function readJSON(r) {
    return r.json().catch(function () { return null; }).then(function (j) { return j; });
  }

  /* افزودن آواتار به داده استادان — در هر دو حالت (واقعی/دمو) */
  function enrichTeachersData(body) {
    if (!body || typeof body !== 'object') return body;
    var t = body && body.data && body.data.teacher;
    if (t && t.user && !t.user.avatar_url) t.user.avatar_url = pickAvatar(t.id, t.female);
    if (Array.isArray(body.data)) {
      body.data.forEach(function (row) {
        if (row && row.user && !row.user.avatar_url) row.user.avatar_url = pickAvatar(row.id, row.female);
      });
    }
    return body;
  }

  /* GET واقعی + آواتار */
  function realWithAvatars(url, init) {
    return realFetch(url, init).then(function (r) {
      if (r.status !== 200) return r;
      return r.json().catch(function () { return null; }).then(function (j) {
        if (!j) return jsonRes(200, {});
        return jsonRes(200, enrichTeachersData(j));
      });
    });
  }

  function isBFF(url) { return typeof url === 'string' && url.indexOf(BFF) === 0; }
  function rel(url) { return url.slice(BFF.length); }

  function handle(url, init) {
    var method = (init && init.method || 'GET').toUpperCase();
    var path = rel(url);

    /* ── من ── */
    if (path === 'me') {
      if (method === 'PUT' && demoMode) {
        return Promise.resolve(jsonRes(200, { data: DEMO_USER }));
      }
      /* بررسی واقعی وضعیت ورود + خودترمیمی */
      return realFetch(BFF + 'me', { credentials: 'same-origin', cache: 'no-store' })
        .then(function (r) {
          if (r.status === 200) {
            if (flipTo(false)) return new Promise(function () {}); /* reload */
            return r;
          }
          if (flipTo(true)) return new Promise(function () {});    /* reload */
          return jsonRes(200, { data: DEMO_USER });
        })
        .catch(function () {
          if (flipTo(true)) return new Promise(function () {});
          return jsonRes(200, { data: DEMO_USER });
        });
    }

    /* ── حالت واقعی: فقط آواتار ── */
    if (!demoMode) {
      if (method === 'GET' && /^teachers/.test(path)) return realWithAvatars(url, init);
      return realFetch(url, init);
    }

    /* ── حالت دمو ── */
    if (method === 'GET') {
      if (/^teachers/.test(path)) return realWithAvatars(url, init);
      if (/^sessions(\?|$)/.test(path)) {
        var when = /[?&]when=past/.test(url) ? DEMO_PAST : DEMO_UPCOMING;
        return Promise.resolve(jsonRes(200, { data: when }));
      }
      if (/^wallet\/transactions/.test(path)) {
        return Promise.resolve(jsonRes(200, { data: DEMO_TX }));
      }
    }
    if (method === 'POST' && /^sessions(\?|$)/.test(path)) {
      /* ثبت رزرو نمایشی — بلافاصله در «جلسات پیش‌رو» دیده می‌شود */
      var body = {};
      try { body = JSON.parse(init.body || '{}'); } catch (e) {}
      var when = String(body.scheduled_at || '').slice(0, 10) || iso(3);
      var hm = String(body.scheduled_at || '').slice(11, 16) || '16:00';
      var endH = Math.min(23, parseInt(hm, 10) + 1);
      DEMO_UPCOMING.push({
        id: 'demo-' + Date.now(), service: 'جلسه آموزشی قرآن', status: 'pending',
        local_date: when, local_start: hm, local_end: endH + ':00', duration: 60,
        teacher: { user: { name: 'استاد وُدّا' } }
      });
      return Promise.resolve(jsonRes(200, { data: { id: 'demo-' + Date.now() } }));
    }
    if (method === 'POST' && /^support\/messages/.test(path)) {
      return Promise.resolve(jsonRes(200, { data: { ok: true } }));
    }
    if (method === 'POST' && /^sessions\/.+\/cancel/.test(path)) {
      var idm = path.match(/^sessions\/(.+?)\/cancel/);
      var id = idm ? idm[1] : '';
      [DEMO_UPCOMING, DEMO_PAST].forEach(function (list) {
        list.forEach(function (s) { if (String(s.id) === id) s.status = 'canceled'; });
      });
      return Promise.resolve(jsonRes(200, { data: { ok: true } }));
    }

    /* بقیه: واقعی */
    return realFetch(url, init);
  }

  window.fetch = function (url, init) {
    /* لاگین/خروج واقعی: کوکی دمو را پاک کن تا داده واقعی دیده شود */
    if (typeof url === 'string' && url.indexOf('/api/auth/') === 0) {
      var name = url.slice('/api/auth/'.length);
      var resp = realFetch(url, init);
      if (name === 'verify-otp' || name === 'logout') {
        return resp.then(function (r) {
          if (r.ok || name === 'logout') clearDemoCookie();
          return r;
        });
      }
      return resp;
    }
    if (isBFF(url)) return handle(url, init || {});
    return realFetch(url, init);
  };

  /* خروج نمایشی: کوکی دمو را پاک کن و برو خانه */
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a,button') : null;
    if (!a) return;
    var txt = (a.textContent || '').replace(/\s+/g, ' ');
    if (/خروج/.test(txt) && demoMode === true) {
      ev.preventDefault(); ev.stopPropagation();
      clearDemoCookie();
      window.location.href = '/';
    }
  }, true);
})();
