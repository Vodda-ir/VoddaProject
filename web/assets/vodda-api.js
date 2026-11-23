/* وُدّا — لایه کامل اتصال فرانت‌اند به بک‌اند واقعی (Go API از طریق BFF هم‌مبأ)
   مسیرها: /api/auth/* (کوکی HttpOnly) · /api/backend/* (پروکسی BFF با Bearer)
   بدون هیچ داده جعلی — همه ارقام از بک‌اند واقعی می‌آید. */
(function () {
  'use strict';

  var BFF = '/api/backend/';

  /* ---------- ابزارها ---------- */
  var FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
  function fa(n) { return String(n).replace(/\d/g, function (d) { return FA_DIGITS[d]; }); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function money(n) {
    n = Number(n || 0);
    return n > 0 ? n.toLocaleString('fa-IR') : '—';
  }
  function rating(n) {
    n = Number(n || 0);
    return n > 0 ? n.toLocaleString('fa-IR', { maximumFractionDigits: 1 }) : '—';
  }
  function letterAvatar(name, cls) {
    var ch = String(name || 'ا').trim().charAt(0);
    return '<div class="av-letter' + (cls ? ' ' + cls : '') + '" aria-hidden="true">' + esc(ch) + '</div>';
  }
  function faDate(iso) {
    try {
      var d = new Date(String(iso).length === 10 ? iso + 'T00:00:00Z' : iso);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('fa-IR', { timeZone: 'UTC' });
    } catch (e) { return '—'; }
  }
  var WEEKDAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
  function weekdayName(dateStr) {
    try {
      var d = new Date(String(dateStr).length === 10 ? dateStr + 'T00:00:00Z' : dateStr);
      if (isNaN(d.getTime())) return '';
      return WEEKDAYS[d.getUTCDay()];
    } catch (e) { return ''; }
  }
  function faToEn(s) {
    var out = '', i, ch;
    for (i = 0; i < s.length; i++) {
      ch = s.charCodeAt(i);
      if (ch >= 1776 && ch <= 1785) out += String.fromCharCode(ch - 1776 + 48);
      else if (ch >= 1632 && ch <= 1641) out += String.fromCharCode(ch - 1632 + 48);
      else out += s.charAt(i);
    }
    return out;
  }
  function normalizeMobile(m) {
    m = faToEn(String(m || '').trim()).replace(/[\s-]/g, '');
    if (m.indexOf('+98') === 0) m = '0' + m.slice(3);
    else if (m.indexOf('98') === 0 && m.length === 12) m = '0' + m.slice(2);
    return m;
  }
  function validMobile(m) { return /^09\d{9}$/.test(m); }
  function maskMobile(m) {
    m = String(m || '');
    return m.length >= 10 ? fa(m.slice(0, 4)) + '***' + fa(m.slice(-4)) : fa(m);
  }
  var toastTimer = null;
  function toast(msg) {
    var el = document.getElementById('vtoast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'vtoast';
      el.className = 'vtoast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 3200);
  }
  function stateHTML(msg, spin) {
    return '<div class="v-state">' + (spin ? '<span class="v-spin"></span>' : '') + esc(msg) + '</div>';
  }
  function errText(e) {
    return (e && e.message) ? e.message : 'خطای غیرمنتظره رخ داد';
  }
  function qsGet(name) {
    return new URLSearchParams(location.search).get(name);
  }

  /* ---------- لایه شبکه (هم‌مبأ + کوکی) ---------- */
  function api(method, path, body) {
    var init = {
      method: method,
      headers: { 'Accept': 'application/json' },
      credentials: 'same-origin',
      cache: 'no-store'
    };
    if (body instanceof FormData) {
      init.body = body;
    } else if (body != null) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
    return fetch(BFF + path, init).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) {
          var e = new Error((j && j.error) ? j.error : ('خطای شبکه (' + r.status + ')'));
          e.status = r.status;
          throw e;
        }
        return j;
      });
    });
  }
  function authPost(name, body) {
    return fetch('/api/auth/' + name, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      credentials: 'same-origin',
      cache: 'no-store',
      body: JSON.stringify(body || {})
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) {
          var e = new Error((j && j.error) ? j.error : ('خطا (' + r.status + ')'));
          e.status = r.status;
          throw e;
        }
        return j;
      });
    });
  }

  /* ---------- نشست ---------- */
  function isLogged() {
    if (document.cookie.indexOf('vodda_session=1') === -1) return false;
    return true;
  }
  function me() { return api('GET', 'me').then(function (j) { return j.data; }); }
  function logout() {
    return fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin', cache: 'no-store' })
      .then(function () { location.href = '/'; });
  }
  function requireLogin(nextUrl) {
    location.href = '/login.html?next=' + encodeURIComponent(nextUrl || location.pathname + location.search);
  }

  /* نوار حساب در هدر همه صفحات */
  function sessionNav() {
    var box = document.getElementById('v-authbox');
    if (!box) return;
    if (!isLogged()) {
      box.innerHTML = '<a class="btn btn-ghost btn-sm" href="/login.html">ورود</a>' +
        '<a class="btn btn-brand btn-sm" href="/login.html?mode=register">ثبت‌نام</a>';
      return;
    }
    box.innerHTML = '<a class="uname" href="/profile.html">حساب کاربری</a>' +
      '<a class="btn btn-brand btn-sm" href="/book.html">رزرو جلسه</a>';
    me().then(function (u) {
      if (u && u.name) box.innerHTML =
        '<a class="uname" href="/profile.html">' + esc(u.name) + '</a>' +
        '<a class="btn btn-brand btn-sm" href="/book.html">رزرو جلسه</a>';
    }).catch(function () { /* 401: نشست منقضی — همان حالت پیش‌فرض می‌ماند */ });
  }

  /* ---------- استادان (عمومی) ---------- */
  function normalizeTeacher(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var user = raw.user && typeof raw.user === 'object' ? raw.user : {};
    var id = Number(raw.id);
    if (!Number.isInteger(id) || id <= 0) return null;
    return {
      id: id,
      name: String(user.name || 'استاد وُدّا'),
      avatar: String(user.avatar_url || ''),
      field: String(raw.field || ''),
      tag: String(raw.tag || ''),
      level: String(raw.level || ''),
      city: String(raw.city || ''),
      bio: String(raw.bio || ''),
      price30: Number(raw.price30 || 0),
      price60: Number(raw.price60 || 0),
      female: !!raw.female,
      verified: !!raw.verified,
      available: raw.available !== false,
      rating: Number(raw.rating || 0),
      reviews: Number(raw.reviews || 0),
      sessions: Number(raw.sessions || 0),
      followers: Number(raw.followers || 0),
      services: Array.isArray(raw.services) ? raw.services : []
    };
  }
  function searchTeachers(params) {
    params = params || {};
    var qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    if (params.field) qs.set('field', params.field);
    if (params.city) qs.set('city', params.city);
    if (typeof params.female === 'boolean') qs.set('female', String(params.female));
    qs.set('limit', String(Math.min(100, params.limit || 50)));
    qs.set('offset', String(params.offset || 0));
    return api('GET', 'teachers?' + qs.toString()).then(function (res) {
      var rows = res && Array.isArray(res.data) ? res.data : [];
      return rows.map(normalizeTeacher).filter(Boolean);
    });
  }
  function teacherDetail(id) {
    return api('GET', 'teachers/' + encodeURIComponent(id)).then(function (res) {
      var data = (res && res.data) || {};
      var t = normalizeTeacher(data.teacher);
      if (!t) throw new Error('پروفایل استاد یافت نشد');
      var reviews = Array.isArray(data.reviews) ? data.reviews : [];
      return {
        teacher: t,
        reviews: reviews.map(function (r) {
          return {
            id: Number(r.id || 0),
            rating: Number(r.rating || 0),
            text: String(r.text || ''),
            createdAt: String(r.createdAt || ''),
            learnerName: String(r.learnerName || 'کاربر وُدّا')
          };
        })
      };
    });
  }
  function availability(teacherId, serviceId, days) {
    var qs = new URLSearchParams({
      service_id: String(serviceId),
      days: String(Math.min(60, Math.max(1, days || 14)))
    });
    return api('GET', 'teachers/' + encodeURIComponent(teacherId) + '/availability?' + qs.toString())
      .then(function (res) {
        var rows = res && Array.isArray(res.data) ? res.data : [];
        return rows.filter(function (s) { return s && s.start_at && s.local_date && s.local_start; });
      });
  }

  /* ---------- اقدامات کاربر ---------- */
  function bookSession(teacherId, serviceId, scheduledAt, note) {
    return api('POST', 'sessions', {
      teacher_id: teacherId, service_id: serviceId, scheduled_at: scheduledAt, note: note || ''
    }).then(function (j) { return j.data; });
  }
  function mySessions(when) {
    return api('GET', 'sessions' + (when ? '?when=' + encodeURIComponent(when) : ''))
      .then(function (j) { return Array.isArray(j.data) ? j.data : []; });
  }
  function cancelSession(id) {
    return api('POST', 'sessions/' + encodeURIComponent(id) + '/cancel').then(function (j) { return j.data; });
  }
  function walletTransactions(limit, offset) {
    var qs = new URLSearchParams({ limit: String(limit || 100), offset: String(offset || 0) });
    return api('GET', 'wallet/transactions?' + qs.toString())
      .then(function (j) { return Array.isArray(j.data) ? j.data : []; });
  }
  function updateProfile(payload) {
    if (payload instanceof FormData) return api('PUT', 'me', payload).then(function (j) { return j.data; });
    return api('PUT', 'me', {
      name: payload.name || '', city: payload.city || '', bio: payload.bio || ''
    }).then(function (j) { return j.data; });
  }
  function sendSupport(name, contact, message) {
    return api('POST', 'support/messages', { name: name, contact: contact, message: message });
  }
  function requestOTP(mobile) { return authPost('request-otp', { mobile: mobile }); }
  function verifyOTP(mobile, code) { return authPost('verify-otp', { mobile: mobile, code: code }); }

  var STATUS_LABEL = {
    pending: 'در انتظار تأیید استاد',
    confirmed: 'تأیید شده',
    done: 'برگزار شده',
    canceled: 'لغو شده'
  };
  var STATUS_CLASS = { pending: 'b-pending', confirmed: 'b-confirmed', done: 'b-done', canceled: 'b-canceled' };
  function statusBadge(status) {
    var s = String(status || '');
    return '<span class="badge ' + (STATUS_CLASS[s] || 'b-done') + '">' + esc(STATUS_LABEL[s] || s) + '</span>';
  }

  /* ---------- کارت استاد ---------- */
  function teacherLink(t) { return '/teacher.html?id=' + t.id; }
  function avatarHTML(t, big) {
    if (t.avatar) {
      return '<div class="t-av' + (big ? ' v-av-big' : '') + '"><img src="' + esc(t.avatar) + '" alt="' + esc(t.name) + '" loading="lazy" onerror="this.outerHTML=window.VoddaAPI?window.VoddaAPI._letterAv(' + "'" + esc(t.name).replace(/'/g, "\\'") + "'" + '):null"></div>';
    }
    return '<div class="t-av' + (big ? ' v-av-big' : '') + '">' + letterAvatar(t.name) + '</div>';
  }
  function _letterAv(name) { return letterAvatar(name); }
  function cardHTML(t) {
    var sub = [t.field, t.level].filter(Boolean).join(' · ') || 'آموزگار قرآن و تلاوت';
    var meta = t.reviews > 0
      ? rating(t.rating) + ' (' + fa(t.reviews) + ' نظر)'
      : 'جدید';
    return '<a class="t-card v-real" href="' + teacherLink(t) + '">' +
      (t.available ? '<span class="online-badge"><span class="dot"></span>آنلاین</span>' : '') +
      avatarHTML(t) +
      '<h3>' + esc(t.name) + (t.verified ? ' <span class="v-verified" title="مدارک تأییدشده">✓</span>' : '') + '</h3>' +
      '<div class="sp">' + esc(sub) + '</div>' +
      '<div class="stars">★★★★★ <span>' + esc(meta) + '</span></div>' +
      '<div class="price">از <b>' + money(t.price30) + '</b> تومان / جلسه</div>' +
      '<div class="t-acts"><span class="btn btn-brand">مشاهده و رزرو</span></div>' +
      '</a>';
  }
  function injectStyles() {
    if (document.getElementById('v-api-style')) return;
    var st = document.createElement('style');
    st.id = 'v-api-style';
    st.textContent =
      '.v-letter-av{width:100%;height:100%;display:grid;place-items:center;font-weight:800;font-size:34px;' +
      'color:var(--brand-700,#0e9f5c);background:var(--brand-50,#e9f9f1);border:1px solid var(--line,#e8ebf0);border-radius:24px}' +
      '.v-verified{display:inline-grid;place-items:center;width:20px;height:20px;border-radius:50%;background:var(--brand,#12b76a);' +
      'color:#fff;font-size:12px;vertical-align:middle}' +
      '.v-state{padding:26px 18px;text-align:center;color:var(--ink2,#5a6472);font-size:14px}' +
      '.v-spin{display:inline-block;width:22px;height:22px;border:3px solid var(--brand-50,#e9f9f1);border-top-color:var(--brand,#12b76a);' +
      'border-radius:50%;animation:vspin 1s linear infinite;vertical-align:-6px;margin-inline-end:8px}' +
      '@keyframes vspin{to{transform:rotate(360deg)}}' +
      '.v-srv{display:flex;justify-content:space-between;gap:12px;padding:12px 14px;border:1px solid var(--line,#e8ebf0);' +
      'border-radius:14px;margin-bottom:10px;flex-wrap:wrap;align-items:center}' +
      '.v-srv b{font-size:14px}.v-srv .v-srv-meta{font-size:12px;color:var(--ink2,#5a6472)}' +
      '.v-rev{padding:14px;border:1px solid var(--line,#e8ebf0);border-radius:14px;margin-bottom:10px}' +
      '.v-rev .v-rev-head{display:flex;justify-content:space-between;gap:10px;font-size:13px;color:var(--ink2,#5a6472);margin-bottom:6px}' +
      '.v-rev p{margin:0;font-size:14px;line-height:1.9}';
    document.head.appendChild(st);
  }

  /* ---------- لندینگ: کاروسل استادان زنده ---------- */
  function mountTeacherCarousel(containerId) {
    injectStyles();
    var box = document.getElementById(containerId);
    if (!box) return;
    box.innerHTML = stateHTML('در حال دریافت استادان…', true);
    searchTeachers({ limit: 12 }).then(function (teachers) {
      box.innerHTML = teachers.length
        ? teachers.map(cardHTML).join('')
        : stateHTML('به‌زودی! استادان تأییدشده همین‌جا نمایش داده می‌شوند.');
    }).catch(function () {
      box.innerHTML = stateHTML('اتصال به سرور برقرار نشد — لطفاً بعداً دوباره سر بزنید.');
    });
  }

  /* ---------- جست‌وجو ---------- */
  function searchRowHTML(t) {
    var meta = t.reviews > 0 ? rating(t.rating) + ' (' + fa(t.reviews) + ' نظر)' : 'جدید';
    return '<div class="trow">' +
      '<div class="v-letter-av v-av-lg" aria-hidden="true">' + esc(String(t.name || 'ا').trim().charAt(0)) + '</div>' +
      '<div class="info">' +
      '<h3><a href="' + teacherLink(t) + '">' + esc(t.name) + (t.verified ? ' ✓' : '') + '</a></h3>' +
      '<div class="sp">' + esc([t.field, t.tag || t.level].filter(Boolean).join(' · ') || 'آموزگار قرآن و تلاوت') + '</div>' +
      '<div class="stars">★★★★★ <span>' + esc(meta) + '</span></div>' +
      '<div class="meta"><span>جلسه موفق: <b>+' + fa(t.sessions) + '</b></span>' +
      (t.city ? '<span>شهر: <b>' + esc(t.city) + '</b></span>' : '') + '</div>' +
      '</div>' +
      '<span class="badge-online"><span class="online-dot pulse"></span>' + (t.available ? 'آنلاین' : 'آفلاین') + '</span>' +
      '<div class="side">' +
      '<div class="price">از <b>' + money(t.price30) + '</b> تومان</div>' +
      '<a class="btn btn-primary btn-sm" href="' + teacherLink(t) + '">رزرو</a>' +
      '</div>' +
      '</div>';
  }
  function renderGroups(rows) {
    var groups = {}, order = [];
    rows.forEach(function (t) {
      var k = t.field || 'استادان';
      if (!groups[k]) { groups[k] = []; order.push(k); }
      groups[k].push(t);
    });
    return order.map(function (k) {
      var arr = groups[k];
      return '<section class="grp"><div class="sec-head"><h2>' + esc(k) + '</h2><span>' + fa(arr.length) + ' نتیجه</span></div>' +
        arr.map(searchRowHTML).join('') + '</section>';
    }).join('');
  }
  function mountSearchPage() {
    injectStyles();
    var input = document.getElementById('q');
    var firstGrp = document.querySelector('section.grp');
    var resultsRoot = firstGrp
      ? firstGrp.parentElement
      : (document.querySelector('.res-head') ? document.querySelector('.res-head').parentElement : null);
    if (!resultsRoot) return;

    var all = [];
    var chips = Array.prototype.slice.call(document.querySelectorAll('.fchip'));
    var chipBox = chips.length ? chips[0].parentElement : null;
    function renderInto(html) {
      var olds = resultsRoot.querySelectorAll('section.grp');
      if (olds.length) {
        olds[0].insertAdjacentHTML('beforebegin', html);
        Array.prototype.forEach.call(olds, function (x) { if (x.parentNode) x.parentNode.removeChild(x); });
      } else {
        resultsRoot.insertAdjacentHTML('beforeend', html);
      }
    }
    function applyFilter() {
      var active = chipBox ? chipBox.querySelector('.fchip.sel, .fchip.active') : null;
      var label = active ? active.textContent.trim() : '';
      var q = input ? input.value.trim() : '';
      var rows = all.filter(function (t) {
        var hay = (t.name + ' ' + t.field + ' ' + t.level + ' ' + t.city).toLowerCase();
        var okQ = !q || hay.indexOf(q.toLowerCase()) !== -1;
        var okF = !label || label === 'همه' || label === 'همه رشته‌ها' || hay.indexOf(label.toLowerCase()) !== -1;
        return okQ && okF;
      });
      renderInto(rows.length
        ? renderGroups(rows)
        : '<section class="grp"><div class="sec-head"><h2>نتایج جست‌وجو</h2></div>' +
          stateHTML('استادی با این مشخصات پیدا نشد — عبارت دیگری را امتحان کنید.') + '</section>');
    }
    function bindChips() {
      if (!chipBox) return;
      Array.prototype.forEach.call(chipBox.querySelectorAll('.fchip'), function (c) {
        c.addEventListener('click', function () {
          Array.prototype.forEach.call(chipBox.querySelectorAll('.fchip'), function (x) { x.classList.remove('sel', 'active'); });
          c.classList.add('sel');
          applyFilter();
        });
      });
    }
    if (input) {
      var urlQ = qsGet('q');
      input.value = urlQ || '';
      input.addEventListener('input', function () { applyFilter(); });
    }
    bindChips();
    renderInto('<section class="grp"><div class="sec-head"><h2>استادان</h2></div>' +
      stateHTML('در حال دریافت استادان…', true) + '</section>');
    searchTeachers({ limit: 100 }).then(function (rows) {
      all = rows;
      document.title = 'جستجوی استادان | وُدّا';
      applyFilter();
    }).catch(function () {
      renderInto('<section class="grp"><div class="sec-head"><h2>استادان</h2></div>' +
        stateHTML('دریافت فهرست استادان ناموفق بود — لطفاً صفحه را دوباره بارگذاری کنید.') + '</section>');
    });
  }

  /* ---------- پروفایل استاد ---------- */
  function mountTeacherProfile() {
    injectStyles();
    var id = Number(qsGet('id'));
    if (!Number.isInteger(id) || id <= 0) { location.replace('/search.html'); return; }

    var info = document.querySelector('.pro-info');
    if (info) info.innerHTML = stateHTML('در حال دریافت پروفایل استاد…', true);

    teacherDetail(id).then(function (res) {
      var t = res.teacher;
      document.title = t.name + ' — ' + (t.field || 'آموزگار قرآن') + ' | وُدّا';

      var avBox = document.querySelector('.pro-av');
      if (avBox) {
        avBox.innerHTML = t.avatar
          ? '<img class="avatar av-xl" src="' + esc(t.avatar) + '" alt="' + esc(t.name) + '" onerror="this.outerHTML=window.VoddaAPI._letterAvP()">' + (t.verified ? '<span class="badge-online"><span class="dot"></span>مدارک تأییدشده</span>' : '')
          : '<div class="v-letter-av" style="width:132px;height:132px;border-radius:50%;font-size:52px">' + esc(t.name.charAt(0)) + '</div>' + (t.verified ? '<span class="badge-online"><span class="dot"></span>مدارک تأییدشده</span>' : '');
      }

      if (info) {
        info.innerHTML =
          '<h1>' + esc(t.name) + (t.verified ? ' ✓' : '') + '</h1>' +
          '<div class="sp">' + esc([t.field, t.tag || t.level].filter(Boolean).join(' · ') || 'آموزگار قرآن و تلاوت') + '</div>' +
          '<div class="stars">★★★★★ <span>' + esc(t.reviews > 0 ? rating(t.rating) + ' (' + fa(t.reviews) + ' نظر)' : 'جدید') + '</span></div>' +
          '<div class="chips">' +
          (t.verified ? '<span class="pill green">✓ مدارک تأییدشده</span>' : '') +
          (t.city ? '<span class="pill">' + esc(t.city) + '</span>' : '') +
          (t.level ? '<span class="pill">' + esc(t.level) + '</span>' : '') +
          (t.available ? '<span class="pill green">آماده رزرو</span>' : '<span class="pill">فعلاً غیرفعال</span>') +
          '</div>' +
          '<div class="pro-cta">' +
          '<a class="btn btn-primary" href="/book.html?teacher=' + t.id + '">📅 رزرو جلسه</a>' +
          '<a class="btn btn-ghost" href="/search.html">استادان دیگر</a>' +
          '</div>';
      }

      var stats = document.querySelectorAll('.stat-row b');
      if (stats.length >= 4) {
        stats[0].textContent = rating(t.rating);
        stats[1].textContent = fa(t.reviews);
        stats[2].textContent = fa(t.sessions);
        stats[3].textContent = fa(t.followers);
      }

      var bookBox = document.querySelector('.book-box');
      if (bookBox) {
        bookBox.innerHTML =
          '<div class="from">شروع قیمت جلسات از <b>' + money(t.price30) + ' <small style="font-size:11px">تومان</small></b></div>' +
          '<p class="muted" style="font-size:13px;line-height:1.9">تقویم زنده استاد را ببینید و همین حالا نوبت بگیرید.</p>' +
          '<a class="btn btn-primary" href="/book.html?teacher=' + t.id + '" style="width:100%;text-align:center">📅 رزرو جلسه</a>' +
          '<p class="muted mt" style="text-align:center;font-size:11px">پرداخت از کیف پول · امکان لغو تا پیش از شروع</p>';
      }

      var about = document.getElementById('tp-about');
      if (about) {
        about.innerHTML = '<div class="card" style="box-shadow:none">' +
          (t.bio ? '<p style="line-height:2.1;font-size:14px">' + esc(t.bio) + '</p>'
                 : '<p class="muted" style="font-size:13.5px">درباره استاد هنوز توضیحی ثبت نشده است.</p>') + '</div>';
      }

      var services = document.getElementById('tp-services');
      if (services) {
        var rows = (t.services || []).filter(function (s) { return s && s.active !== false; });
        services.innerHTML = '<div class="card" style="box-shadow:none">' + (rows.length
          ? rows.map(function (s) {
              return '<div class="v-srv"><div><b>' + esc(s.title) + '</b><div class="v-srv-meta">' +
                fa(s.duration || 30) + ' دقیقه</div></div>' +
                '<div style="display:flex;align-items:center;gap:12px"><div class="v-srv-price"><b>' + money(s.price) + '</b> تومان</div>' +
                '<a class="btn btn-primary btn-sm" href="/book.html?teacher=' + t.id + '&service=' + encodeURIComponent(s.id) + '">رزرو</a></div></div>';
            }).join('')
          : stateHTML('خدمتی فعال ثبت نشده است.')) + '</div>';
      }

      var comments = document.getElementById('tp-comments');
      if (comments) {
        comments.innerHTML = '<div class="card" style="box-shadow:none">' + (res.reviews.length
          ? res.reviews.map(function (r) {
              return '<div class="v-rev"><div class="v-rev-head"><b>' + esc(r.learnerName) + '</b>' +
                '<span>' + '★★★★★'.slice(0, Math.max(1, Math.round(r.rating))) + ' · ' +
                esc(r.createdAt ? faDate(r.createdAt) : '') + '</span></div>' +
                '<p>' + esc(r.text) + '</p></div>';
            }).join('')
          : stateHTML('هنوز نظری ثبت نشده است.')) + '</div>';
      }

      /* استادان مرتبط — داده واقعی */
      var rel = document.getElementById('relatedCar');
      if (rel) {
        searchTeachers({ limit: 8 }).then(function (rows) {
          var others = rows.filter(function (x) { return x.id !== t.id; }).slice(0, 6);
          rel.innerHTML = others.length ? others.map(cardHTML).join('') : '';
        }).catch(function () { rel.innerHTML = ''; });
      }

      /* JSON-LD واقعی برای موتورهای جست‌وجو */
      var ld = document.getElementById('v-jsonld');
      if (ld) {
        var ldObj = {
          '@context': 'https://schema.org', '@type': 'Person',
          name: t.name,
          jobTitle: t.field || 'استاد قرآن',
          url: location.origin + '/teacher.html?id=' + t.id
        };
        if (t.reviews > 0) ldObj.aggregateRating = { '@type': 'AggregateRating', ratingValue: String(t.rating), reviewCount: String(t.reviews) };
        ld.textContent = JSON.stringify(ldObj);
      }
    }).catch(function (e) {
      if (info) {
        info.innerHTML = '<h1>پروفایل در دسترس نیست</h1>' +
          '<div class="sp muted">' + esc(errText(e)) + '</div>' +
          '<div class="chips" style="margin-top:14px"><a class="btn btn-primary" href="/search.html">بازگشت به جست‌وجوی استادان</a></div>';
      }
      var bookBox2 = document.querySelector('.book-box');
      if (bookBox2) bookBox2.innerHTML = '';
    });
  }
  function _letterAvP() { return '<div class="v-letter-av" style="width:132px;height:132px;border-radius:50%;font-size:52px">ا</div>'; }

  /* ---------- هدر لندینگ: جست‌وجو ---------- */
  function bindHeaderSearch() {
    var input = document.getElementById('q');
    if (!input) return;
    function go() {
      var v = input.value.trim();
      location.href = '/search.html' + (v ? '?q=' + encodeURIComponent(v) : '');
    }
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
  }

  /* ═══════════ صفحه رزرو (book.html) ═══════════ */
  function mountBookPage() {
    injectStyles();
    var root = document.getElementById('book-root');
    if (!root) return;
    var teacherId = Number(qsGet('teacher'));
    if (!Number.isInteger(teacherId) || teacherId <= 0) {
      root.innerHTML = '<div class="card"><div class="v-state">ابتدا یک استاد را انتخاب کنید.<br><br>' +
        '<a class="btn btn-brand" href="/search.html">جست‌وجوی استادان</a></div></div>';
      return;
    }
    var preService = Number(qsGet('service')) || 0;
    var preSlot = qsGet('slot') || '';

    root.innerHTML = stateHTML('در حال دریافت اطلاعات استاد…', true);

    teacherDetail(teacherId).then(function (res) {
      var t = res.teacher;
      document.title = 'رزرو جلسه با ' + t.name + ' | وُدّا';
      var services = (t.services || []).filter(function (s) { return s && s.active !== false; });

      root.innerHTML =
        '<div class="card mb16" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">' +
          '<div style="width:64px;height:64px;flex:none">' + (t.avatar
            ? '<img src="' + esc(t.avatar) + '" alt="' + esc(t.name) + '" style="width:64px;height:64px;border-radius:20px;object-fit:cover" onerror="this.style.display=\'none\'">'
            : letterAvatar(t.name)) + '</div>' +
          '<div style="flex:1;min-width:180px"><h2 style="font-size:17px;font-weight:800">' + esc(t.name) + (t.verified ? ' ✓' : '') + '</h2>' +
          '<div class="muted small">' + esc([t.field, t.level].filter(Boolean).join(' · ')) + '</div></div>' +
          '<a class="btn btn-ghost btn-sm" href="' + teacherLink(t) + '">مشاهده پروفایل</a>' +
        '</div>' +
        '<div class="alert alert-warn">💳 پرداخت جلسه هنگام تأیید نهایی از کیف پول شما انجام می‌شود. موجودی فعلی کیف پول در <a href="/credit.html" style="font-weight:700">صفحه کیف پول</a> قابل مشاهده است.</div>' +
        '<div class="card">' +
          '<h3 style="font-size:15.5px;font-weight:800;margin-bottom:12px">۱) انتخاب خدمت</h3>' +
          '<div id="bk-services"></div>' +
          '<div id="bk-cal-wrap" class="hide">' +
            '<h3 style="font-size:15.5px;font-weight:800;margin:20px 0 6px">۲) انتخاب روز و ساعت</h3>' +
            '<div class="daybar" id="bk-days"></div>' +
            '<div id="bk-slots" class="slotgrid"></div>' +
          '</div>' +
          '<div id="bk-note-wrap" class="hide mt16">' +
            '<label class="small muted" for="bk-note">یادداشت برای استاد (اختیاری)</label>' +
            '<textarea class="input" id="bk-note" maxlength="480" placeholder="مثلاً: هدفم اصلاح تجوید در سوره بقره است…"></textarea>' +
          '</div>' +
          '<div id="bk-err" class="ferr" role="alert"></div>' +
          '<button class="btn btn-brand btn-lg btn-block mt16 hide" id="bk-submit" disabled>ثبت رزرو</button>' +
          '<p class="muted small center mt12" id="bk-sum"></p>' +
        '</div>';

      if (!services.length) {
        document.getElementById('bk-services').innerHTML = stateHTML('این استاد فعلاً خدمت فعالی ندارد.');
        return;
      }

      var selected = { service: services[0].id, slot: '' };
      if (preService && services.some(function (s) { return Number(s.id) === preService; })) selected.service = preService;

      function renderServices() {
        document.getElementById('bk-services').innerHTML = services.map(function (s) {
          var on = Number(s.id) === Number(selected.service);
          return '<div class="srv' + (on ? ' active' : '') + '" data-sid="' + esc(s.id) + '" role="radio" aria-checked="' + on + '" tabindex="0">' +
            '<span class="radio-dot"></span>' +
            '<div style="flex:1;min-width:140px"><b>' + esc(s.title) + '</b>' +
            '<div class="srv-meta">' + fa(s.duration || 30) + ' دقیقه</div></div>' +
            '<span class="srv-price">' + money(s.price) + ' تومان</span>' +
            '</div>';
        }).join('');
        Array.prototype.forEach.call(document.querySelectorAll('#bk-services .srv'), function (el) {
          function pick() {
            selected.service = Number(el.getAttribute('data-sid'));
            selected.slot = '';
            renderServices();
            loadCalendar();
          }
          el.addEventListener('click', pick);
          el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
        });
      }

      var slotsByDay = [];
      function loadCalendar() {
        var wrap = document.getElementById('bk-cal-wrap');
        var days = document.getElementById('bk-days');
        var slotBox = document.getElementById('bk-slots');
        wrap.classList.remove('hide');
        days.innerHTML = stateHTML('در حال دریافت تقویم استاد…', true);
        slotBox.innerHTML = '';
        availability(teacherId, selected.service, 14).then(function (slots) {
          slotsByDay = {};
          slots.forEach(function (s) {
            if (!slotsByDay[s.local_date]) slotsByDay[s.local_date] = [];
            slotsByDay[s.local_date].push(s);
          });
          var dates = Object.keys(slotsByDay).sort();
          if (!dates.length) {
            days.innerHTML = stateHTML('استاد در ۱۴ روز آینده بازه آزاد ندارد — خدمت دیگری را امتحان کنید یا بعداً سر بزنید.');
            updateSubmit();
            return;
          }
          var activeDate = dates[0];
          days.innerHTML = dates.slice(0, 14).map(function (d) {
            return '<button type="button" class="day' + (d === activeDate ? ' active' : '') + '" data-date="' + d + '">' +
              '<div class="d-name">' + esc(weekdayName(d)) + '</div>' +
              '<div class="d-date">' + esc(faDate(d)) + '</div>' +
              '<div class="d-count">' + fa(slotsByDay[d].length) + ' نوبت</div></button>';
          }).join('');
          Array.prototype.forEach.call(days.querySelectorAll('.day'), function (el) {
            el.addEventListener('click', function () {
              Array.prototype.forEach.call(days.querySelectorAll('.day'), function (x) { x.classList.remove('active'); });
              el.classList.add('active');
              renderSlots(el.getAttribute('data-date'));
            });
          });
          renderSlots(activeDate);
        }).catch(function (e) {
          days.innerHTML = stateHTML('دریافت تقویم ناموفق بود: ' + errText(e));
        });
      }
      function renderSlots(date) {
        var slotBox = document.getElementById('bk-slots');
        var list = slotsByDay[date] || [];
        slotBox.innerHTML = list.map(function (s) {
          var on = selected.slot === s.start_at;
          return '<button type="button" class="slot' + (on ? ' active' : '') + '" data-start="' + esc(s.start_at) + '" data-end="' + esc(s.end_at || '') + '">' +
            esc(fa(s.local_start)) + '<small>تا ' + esc(fa(s.local_end)) + '</small></button>';
        }).join('');
        Array.prototype.forEach.call(slotBox.querySelectorAll('.slot'), function (el) {
          el.addEventListener('click', function () {
            selected.slot = el.getAttribute('data-start');
            Array.prototype.forEach.call(slotBox.querySelectorAll('.slot'), function (x) { x.classList.remove('active'); });
            el.classList.add('active');
            updateSubmit();
          });
        });
        if (preSlot && list.some(function (s) { return s.start_at === preSlot; })) {
          selected.slot = preSlot;
          Array.prototype.forEach.call(slotBox.querySelectorAll('.slot'), function (el) {
            if (el.getAttribute('data-start') === preSlot) el.classList.add('active');
          });
          preSlot = '';
        }
        updateSubmit();
      }
      function updateSubmit() {
        var btn = document.getElementById('bk-submit');
        var sum = document.getElementById('bk-sum');
        var chosen = null;
        services.forEach(function (s) { if (Number(s.id) === Number(selected.service)) chosen = s; });
        document.getElementById('bk-note-wrap').classList.remove('hide');
        if (selected.slot) {
          btn.classList.remove('hide');
          btn.disabled = false;
          var d = selected.slot.slice(0, 10);
          var dur = chosen ? Number(chosen.duration || 30) : 30;
          sum.innerHTML = 'جمع قابل پرداخت: <b>' + money(chosen ? chosen.price : 0) + ' تومان</b> — ' + esc(faDate(d)) + ' · مدت ' + fa(dur) + ' دقیقه';
        } else {
          btn.disabled = true;
          sum.textContent = 'برای ثبت رزرو، یک ساعت را انتخاب کنید.';
        }
      }

      document.getElementById('bk-submit').addEventListener('click', function () {
        var err = document.getElementById('bk-err');
        err.classList.remove('show');
        if (!isLogged()) {
          var back = '/book.html?teacher=' + teacherId + '&service=' + selected.service +
            (selected.slot ? '&slot=' + encodeURIComponent(selected.slot) : '');
          requireLogin(back);
          return;
        }
        var btn = this;
        btn.disabled = true;
        btn.textContent = 'در حال ثبت…';
        var note = document.getElementById('bk-note') ? document.getElementById('bk-note').value.trim() : '';
        bookSession(teacherId, selected.service, selected.slot, note).then(function () {
          root.innerHTML = '<div class="card center" style="padding:44px 22px">' +
            '<div style="font-size:44px">✅</div>' +
            '<h2 style="font-size:19px;font-weight:800;margin-top:10px">رزرو شما ثبت شد</h2>' +
            '<p class="muted mt8">درخواست شما برای استاد ارسال شد؛ پس از تأیید استاد، جلسه قطعی می‌شود. وضعیت را در «جلسات من» دنبال کنید.</p>' +
            '<div class="mt16"><a class="btn btn-brand btn-lg" href="/session.html">مشاهده جلسات من</a></div></div>';
          setTimeout(function () { location.href = '/session.html?booked=1'; }, 3000);
        }).catch(function (e) {
          btn.disabled = false;
          btn.textContent = 'ثبت رزرو';
          err.textContent = errText(e);
          if (String(e.message).indexOf('موجودی') !== -1) {
            err.insertAdjacentHTML('beforeend', ' — برای شارژ کیف پول به <a href="/credit.html" style="font-weight:700;text-decoration:underline">صفحه کیف پول</a> بروید.');
          }
          err.classList.add('show');
          if (e.status === 401) requireLogin(location.pathname + location.search);
          if (e.status === 409) loadCalendar();
        });
      });

      renderServices();
      loadCalendar();
    }).catch(function (e) {
      root.innerHTML = '<div class="card"><div class="v-state">' + esc(errText(e)) + '<br><br>' +
        '<a class="btn btn-brand" href="/search.html">انتخاب استاد</a></div></div>';
    });
  }

  /* ═══════════ جلسات من (session.html) ═══════════ */
  function mountSessionsPage() {
    injectStyles();
    var root = document.getElementById('sess-root');
    if (!root) return;
    if (!isLogged()) {
      root.innerHTML = '<div class="card center" style="padding:40px 20px"><div style="font-size:38px">🔒</div>' +
        '<h2 class="mt12" style="font-size:17px">برای مشاهده جلسات، وارد حساب شوید</h2>' +
        '<div class="mt16"><button class="btn btn-brand btn-lg" id="sess-login">ورود / ثبت‌نام</button></div></div>';
      document.getElementById('sess-login').addEventListener('click', function () { requireLogin('/session.html'); });
      return;
    }
    var booked = qsGet('booked');
    var when = qsGet('when') === 'past' ? 'past' : 'upcoming';

    root.innerHTML =
      (booked ? '<div class="alert alert-ok">✅ رزرو شما با موفقیت ثبت شد و در انتظار تأیید استاد است.</div>' : '') +
      '<div class="vtabs" role="tablist">' +
        '<button type="button" data-when="upcoming" class="' + (when === 'upcoming' ? 'active' : '') + '">جلسات پیش‌رو</button>' +
        '<button type="button" data-when="past" class="' + (when === 'past' ? 'active' : '') + '">گذشته</button>' +
      '</div>' +
      '<div id="sess-list">' + stateHTML('در حال دریافت جلسات…', true) + '</div>';

    Array.prototype.forEach.call(root.querySelectorAll('.vtabs button'), function (b) {
      b.addEventListener('click', function () {
        location.href = '/session.html?when=' + b.getAttribute('data-when');
      });
    });

    function load() {
      var list = document.getElementById('sess-list');
      list.innerHTML = stateHTML('در حال دریافت جلسات…', true);
      mySessions(when).then(function (rows) {
        if (!rows.length) {
          list.innerHTML = '<div class="card center" style="padding:36px 20px"><div style="font-size:36px">📅</div>' +
            '<p class="mt12 muted">' + (when === 'upcoming' ? 'هنوز جلسه‌ای در پیش ندارید.' : 'جلسه گذشته‌ای ثبت نشده است.') + '</p>' +
            '<div class="mt16"><a class="btn btn-brand" href="/search.html">رزرو اولین جلسه</a></div></div>';
          return;
        }
        list.innerHTML = rows.map(function (s) {
          var teacherName = '';
          try {
            teacherName = (s.teacher && s.teacher.user && s.teacher.user.name) || '';
          } catch (e) { teacherName = ''; }
          var canCancel = when === 'upcoming' && (s.status === 'pending' || s.status === 'confirmed');
          return '<div class="row-card">' +
            '<div class="rc-main">' +
              '<h3>' + esc(s.service || 'جلسه آموزشی') + '</h3>' +
              '<div class="meta">' + esc(weekdayName(s.local_date)) + ' ' + esc(faDate(s.local_date)) +
                ' · ساعت ' + esc(fa(s.local_start)) + ' تا ' + esc(fa(s.local_end)) +
                ' · ' + fa(s.duration || 30) + ' دقیقه' +
                (teacherName ? ' · با ' + esc(teacherName) : '') + '</div>' +
            '</div>' +
            '<div class="rc-side">' + statusBadge(s.status) +
              (canCancel ? '<button class="btn btn-danger btn-sm" data-cancel="' + esc(s.id) + '">لغو</button>' : '') +
            '</div>' +
          '</div>';
        }).join('');
        Array.prototype.forEach.call(list.querySelectorAll('[data-cancel]'), function (b) {
          b.addEventListener('click', function () {
            var id = b.getAttribute('data-cancel');
            if (!confirm('این جلسه لغو شود؟ مبلغ به کیف پول شما برمی‌گردد.')) return;
            b.disabled = true;
            b.textContent = '…';
            cancelSession(id).then(function () {
              toast('جلسه لغو شد و مبلغ به کیف پول بازگشت');
              load();
            }).catch(function (e) {
              b.disabled = false;
              b.textContent = 'لغو';
              toast(errText(e));
            });
          });
        });
      }).catch(function (e) {
        list.innerHTML = e.status === 401
          ? stateHTML('نشست شما منقضی شده — <a href="/login.html?next=%2Fsession.html" style="color:var(--brand-700);font-weight:700">دوباره وارد شوید</a>.')
          : stateHTML('دریافت جلسات ناموفق بود: ' + esc(errText(e)));
      });
    }
    load();
  }

  /* ═══════════ پروفایل (profile.html) ═══════════ */
  function mountProfilePage() {
    injectStyles();
    var root = document.getElementById('prof-root');
    if (!root) return;
    if (!isLogged()) { requireLogin('/profile.html'); return; }
    root.innerHTML = stateHTML('در حال دریافت پروفایل…', true);
    var welcome = qsGet('welcome');

    me().then(function (u) {
      document.title = 'پروفایل — ' + (u.name || 'کاربر وُدّا') + ' | وُدّا';
      root.innerHTML =
        (welcome ? '<div class="alert alert-ok">🎉 خوش آمدید! برای تجربه بهتر، نام خود را وارد کنید.</div>' : '') +
        '<div class="grid2">' +
        '<div class="card">' +
          '<h3 style="font-size:15.5px;font-weight:800;margin-bottom:14px">اطلاعات حساب</h3>' +
          '<div class="field"><label for="pf-name">نام و نام خانوادگی</label>' +
            '<input class="input" id="pf-name" maxlength="100" value="' + esc(u.name || '') + '" placeholder="مثلاً زهرا محمدی"></div>' +
          '<div class="field"><label for="pf-city">شهر</label>' +
            '<input class="input" id="pf-city" maxlength="60" value="' + esc(u.city || '') + '" placeholder="مثلاً قم"></div>' +
          '<div class="field"><label for="pf-bio">درباره من</label>' +
            '<textarea class="input" id="pf-bio" maxlength="480" placeholder="معرفی کوتاه (برای استادان نمایش داده می‌شود)">' + esc(u.bio || '') + '</textarea></div>' +
          '<div class="field"><label for="pf-avatar">تصویر پروفایل</label>' +
            '<input class="input" type="file" id="pf-avatar" accept="image/png,image/jpeg,image/webp">' +
            '<p class="hint">حداکثر ۵ مگابایت — JPG/PNG/WebP</p></div>' +
          '<div id="pf-err" class="ferr" role="alert"></div>' +
          '<button class="btn btn-brand btn-block" id="pf-save">ذخیره تغییرات</button>' +
        '</div>' +
        '<div>' +
          '<div class="card mb16">' +
            '<h3 style="font-size:15.5px;font-weight:800;margin-bottom:12px">خلاصه حساب</h3>' +
            '<div class="kv" style="display:flex;justify-content:space-between;padding:7px 0;font-size:13.5px"><span class="muted">شماره موبایل</span><b dir="ltr">' + esc(fa(u.mobile || '')) + '</b></div>' +
            '<div class="kv" style="display:flex;justify-content:space-between;padding:7px 0;font-size:13.5px"><span class="muted">نقش</span><b>' + esc(u.role === 'teacher' ? 'استاد' : (u.role === 'admin' ? 'مدیر' : 'قرآن‌آموز')) + '</b></div>' +
            '<div class="kv" style="display:flex;justify-content:space-between;padding:7px 0;font-size:13.5px"><span class="muted">موجودی کیف پول</span><b>' + money(u.wallet) + ' تومان</b></div>' +
            '<div class="mt12"><a class="btn btn-ghost btn-sm" href="/credit.html">کیف پول</a> <a class="btn btn-ghost btn-sm" href="/session.html">جلسات من</a></div>' +
          '</div>' +
          (u.role === 'teacher'
            ? '<div class="card mb16"><h3 style="font-size:15px;font-weight:800">پنل استاد</h3><p class="muted small mt8">مدیریت خدمات، تقویم کاری و درخواست‌های جلسه در پنل استاد.</p><a class="btn btn-brand btn-sm mt12" href="/panel/teacher">ورود به پنل استاد</a></div>'
            : '<div class="card mb16"><h3 style="font-size:15px;font-weight:800">تدریس در وُدّا</h3><p class="muted small mt8">اگر استاد قرآن یا مداح هستید، پروفایل تدریس بسازید و شاگرد بگیرید.</p><a class="btn btn-brand btn-sm mt12" href="/panel/teacher/register">ثبت‌نام استاد</a></div>') +
          '<div class="card"><button class="btn btn-danger btn-block" id="pf-logout">خروج از حساب</button></div>' +
        '</div>' +
        '</div>';

      document.getElementById('pf-save').addEventListener('click', function () {
        var err = document.getElementById('pf-err');
        err.classList.remove('show');
        var btn = this;
        btn.disabled = true;
        btn.textContent = 'در حال ذخیره…';
        var name = document.getElementById('pf-name').value.trim();
        var city = document.getElementById('pf-city').value.trim();
        var bio = document.getElementById('pf-bio').value.trim();
        var fileInput = document.getElementById('pf-avatar');
        var file = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
        var p;
        if (file) {
          var fd = new FormData();
          fd.append('name', name); fd.append('city', city); fd.append('bio', bio);
          fd.append('avatar', file);
          p = updateProfile(fd);
        } else {
          p = updateProfile({ name: name, city: city, bio: bio });
        }
        p.then(function () {
          toast('تغییرات ذخیره شد ✓');
          sessionNav();
          btn.textContent = 'ذخیره شد ✓';
          setTimeout(function () { btn.disabled = false; btn.textContent = 'ذخیره تغییرات'; }, 1600);
        }).catch(function (e) {
          btn.disabled = false;
          btn.textContent = 'ذخیره تغییرات';
          err.textContent = errText(e);
          err.classList.add('show');
        });
      });
      document.getElementById('pf-logout').addEventListener('click', function () {
        logout();
      });
    }).catch(function (e) {
      root.innerHTML = e.status === 401
        ? stateHTML('نشست منقضی شده — <a href="/login.html?next=%2Fprofile.html" style="color:var(--brand-700);font-weight:700">دوباره وارد شوید</a>.')
        : stateHTML('دریافت پروفایل ناموفق بود: ' + esc(errText(e)));
    });
  }

  /* ═══════════ کیف پول — تراکنش‌ها (orders.html) ═══════════ */
  function mountWalletPage() {
    injectStyles();
    var root = document.getElementById('wallet-root');
    if (!root) return;
    if (!isLogged()) {
      root.innerHTML = '<div class="card center" style="padding:40px 20px"><div style="font-size:38px">🔒</div>' +
        '<h2 class="mt12" style="font-size:17px">برای مشاهده تراکنش‌ها، وارد حساب شوید</h2>' +
        '<div class="mt16"><button class="btn btn-brand btn-lg" id="wal-login">ورود / ثبت‌نام</button></div></div>';
      document.getElementById('wal-login').addEventListener('click', function () { requireLogin('/orders.html'); });
      return;
    }
    root.innerHTML = stateHTML('در حال دریافت اطلاعات کیف پول…', true);
    Promise.all([me(), walletTransactions(100)]).then(function (res) {
      var u = res[0], txs = res[1];
      root.innerHTML =
        '<div class="card mb16 center" style="background:linear-gradient(135deg,var(--brand-700),var(--brand));color:#fff;border:0">' +
          '<p style="font-size:13px;opacity:.9">موجودی کیف پول</p>' +
          '<div style="font-size:30px;font-weight:800;margin-top:4px">' + money(u.wallet) + ' <span style="font-size:14px;font-weight:500">تومان</span></div>' +
          '<div class="mt12"><a class="btn btn-sm" style="background:rgba(255,255,255,.16);color:#fff" href="/credit.html">شارژ کیف پول</a></div>' +
        '</div>' +
        '<h3 style="font-size:15.5px;font-weight:800;margin-bottom:12px">گردش حساب</h3>' +
        '<div id="tx-list">' +
          (txs.length ? txs.map(function (t) {
            var amt = Number(t.amount || 0);
            var pos = amt >= 0;
            var typeLabel = { charge: 'شارژ', session: 'رزرو جلسه', earning: 'درآمد جلسه', withdrawal: 'برداشت', commission: 'کارمزد' }[String(t.type || '')] || 'تراکنش';
            return '<div class="row-card">' +
              '<div class="rc-main"><h3>' + esc(t.title || typeLabel) + '</h3>' +
                '<div class="meta">' + esc(typeLabel) + ' · ' + esc(faDate(t.created_at)) + '</div></div>' +
              '<div class="rc-side"><span class="' + (pos ? 'amount-pos' : 'amount-neg') + '">' +
                (pos ? '+' : '−') + ' ' + money(Math.abs(amt)) + ' تومان</span></div>' +
            '</div>';
          }).join('') : stateHTML('هنوز تراکنشی ثبت نشده است.')) +
        '</div>';
    }).catch(function (e) {
      root.innerHTML = e.status === 401
        ? stateHTML('نشست منقضی شده — <a href="/login.html?next=%2Forders.html" style="color:var(--brand-700);font-weight:700">دوباره وارد شوید</a>.')
        : stateHTML('دریافت تراکنش‌ها ناموفق بود: ' + esc(errText(e)));
    });
  }

  /* ═══════════ شارژ کیف پول (credit.html) ═══════════ */
  function mountCreditPage() {
    injectStyles();
    var root = document.getElementById('credit-root');
    if (!root) return;
    var box = function (inner) { root.innerHTML = inner; };
    if (!isLogged()) {
      box('<div class="card center" style="padding:40px 20px"><div style="font-size:38px">🔒</div>' +
        '<h2 class="mt12" style="font-size:17px">برای شارژ کیف پول، وارد حساب شوید</h2>' +
        '<div class="mt16"><button class="btn btn-brand btn-lg" id="cr-login">ورود / ثبت‌نام</button></div></div>');
      document.getElementById('cr-login').addEventListener('click', function () { requireLogin('/credit.html'); });
      return;
    }
    box(stateHTML('در حال دریافت اطلاعات…', true));
    me().then(function (u) {
      box(
        '<div class="card mb16 center" style="background:linear-gradient(135deg,var(--brand-700),var(--brand));color:#fff;border:0">' +
          '<p style="font-size:13px;opacity:.9">موجودی فعلی</p>' +
          '<div style="font-size:30px;font-weight:800;margin-top:4px">' + money(u.wallet) + ' <span style="font-size:14px;font-weight:500">تومان</span></div>' +
        '</div>' +
        '<div class="alert alert-warn">🔌 درگاه پرداخت اینترنتی به‌زودی فعال می‌شود. تا آن زمان، مبلغ شارژ را از طریق فرم زیر به پشتیبانی اعلام کنید تا به‌صورت دستی کیف پول شما شارژ شود.</div>' +
        '<div class="card">' +
          '<h3 style="font-size:15.5px;font-weight:800;margin-bottom:14px">درخواست شارژ کیف پول</h3>' +
          '<div class="field"><label for="cr-amount">مبلغ (تومان)</label>' +
            '<input class="input input-lg" id="cr-amount" inputmode="numeric" placeholder="مثلاً ۵۰۰٬۰۰۰">' +
            '<p class="hint">پیشنهاد: ۲۰۰٬۰۰۰ · ۵۰۰٬۰۰۰ · ۱٬۰۰۰٬۰۰۰</p></div>' +
          '<div class="field"><label for="cr-contact">شماره تماس / راه ارتباطی</label>' +
            '<input class="input" id="cr-contact" dir="ltr" value="' + esc(u.mobile || '') + '"></div>' +
          '<div class="field"><label for="cr-msg">توضیحات</label>' +
            '<textarea class="input" id="cr-msg" placeholder="توضیح کوتاه درباره درخواست شارژ">درخواست شارژ کیف پول وُدّا</textarea></div>' +
          '<div id="cr-err" class="ferr" role="alert"></div>' +
          '<button class="btn btn-brand btn-block btn-lg" id="cr-send">ارسال درخواست به پشتیبانی</button>' +
        '</div>');
      document.getElementById('cr-send').addEventListener('click', function () {
        var err = document.getElementById('cr-err');
        err.classList.remove('show');
        var amount = faToEn(document.getElementById('cr-amount').value).replace(/[^\d]/g, '');
        var contact = document.getElementById('cr-contact').value.trim();
        var msg = document.getElementById('cr-msg').value.trim();
        if (!amount || Number(amount) < 10000) {
          err.textContent = 'لطفاً مبلغ معتبری (حداقل ۱۰٬۰۰۰ تومان) وارد کنید.';
          err.classList.add('show');
          return;
        }
        if (!contact) {
          err.textContent = 'یک راه ارتباطی (شماره تماس) وارد کنید.';
          err.classList.add('show');
          return;
        }
        var btn = this;
        btn.disabled = true;
        btn.textContent = 'در حال ارسال…';
        sendSupport(u.name || 'کاربر وُدّا', contact,
          'درخواست شارژ کیف پول به مبلغ ' + Number(amount).toLocaleString('en-US') + ' تومان — ' + msg)
          .then(function () {
            box('<div class="card center" style="padding:44px 22px"><div style="font-size:44px">📨</div>' +
              '<h2 style="font-size:18px;font-weight:800;margin-top:10px">درخواست شما ثبت شد</h2>' +
              '<p class="muted mt8">کارشناسان وُدّا در اسرع وقت برای هماهنگی پرداخت و شارژ کیف پول با شما تماس می‌گیرند.</p>' +
              '<div class="mt16"><a class="btn btn-brand" href="/search.html">انتخاب استاد و رزرو جلسه</a></div></div>');
          }).catch(function (e) {
            btn.disabled = false;
            btn.textContent = 'ارسال درخواست به پشتیبانی';
            err.textContent = errText(e);
            err.classList.add('show');
          });
      });
    }).catch(function (e) {
      box(e.status === 401
        ? stateHTML('نشست منقضی شده — <a href="/login.html?next=%2Fcredit.html" style="color:var(--brand-700);font-weight:700">دوباره وارد شوید</a>.')
        : stateHTML('خطا در دریافت اطلاعات: ' + esc(errText(e))));
    });
  }

  /* ═══════════ ورود (login.html) ═══════════ */
  function mountLoginPage() {
    injectStyles();
    var root = document.getElementById('login-root');
    if (!root) return;
    var next = qsGet('next') || '/profile.html';
    if (isLogged()) { location.replace(next); return; }
    document.getElementById('lg-form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var err = document.getElementById('lg-err');
      err.classList.remove('show');
      var mobile = normalizeMobile(document.getElementById('lg-mobile').value);
      if (!validMobile(mobile)) {
        err.textContent = 'شماره موبایل معتبر وارد کنید (مثلاً ۰۹۱۲۳۴۵۶۷۸۹).';
        err.classList.add('show');
        return;
      }
      var btn = document.getElementById('lg-btn');
      btn.disabled = true;
      btn.textContent = 'در حال ارسال کد…';
      requestOTP(mobile).then(function () {
        location.href = '/otp.html?m=' + encodeURIComponent(mobile) + '&next=' + encodeURIComponent(next);
      }).catch(function (e) {
        btn.disabled = false;
        btn.textContent = 'دریافت کد تأیید';
        err.textContent = e.status >= 500
          ? 'ارسال کد در این لحظه ممکن نشد — چند لحظه بعد دوباره تلاش کنید.'
          : errText(e);
        err.classList.add('show');
      });
    });
  }

  /* ═══════════ کد تأیید (otp.html) ═══════════ */
  function mountOtpPage() {
    injectStyles();
    var root = document.getElementById('otp-root');
    if (!root) return;
    var mobile = normalizeMobile(qsGet('m') || '');
    var next = qsGet('next') || '/profile.html';
    if (!validMobile(mobile)) { location.replace('/login.html'); return; }
    document.getElementById('otp-mobile').textContent = maskMobile(mobile);

    var input = document.getElementById('otp-code');
    input.addEventListener('input', function () {
      this.value = faToEn(this.value).replace(/[^\d]/g, '').slice(0, 5);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') document.getElementById('otp-btn').click();
    });
    input.focus();

    document.getElementById('otp-btn').addEventListener('click', function () {
      var err = document.getElementById('otp-err');
      err.classList.remove('show');
      var code = faToEn(input.value).trim();
      if (!/^\d{5}$/.test(code)) {
        err.textContent = 'کد ۵ رقمی را کامل وارد کنید.';
        err.classList.add('show');
        return;
      }
      var btn = this;
      btn.disabled = true;
      btn.textContent = 'در حال بررسی…';
      verifyOTP(mobile, code).then(function (res) {
        var data = (res && res.data) || {};
        var needProfile = !!data.need_profile;
        location.href = needProfile ? '/profile.html?welcome=1' : next;
      }).catch(function (e) {
        btn.disabled = false;
        btn.textContent = 'تأیید و ورود';
        err.textContent = errText(e);
        err.classList.add('show');
        input.value = '';
        input.focus();
      });
    });

    var resendBtn = document.getElementById('otp-resend');
    var left = 60;
    resendBtn.disabled = true;
    resendBtn.textContent = 'ارسال مجدد کد (۱:۰۰)';
    var iv = setInterval(function () {
      left -= 1;
      if (left <= 0) {
        clearInterval(iv);
        resendBtn.disabled = false;
        resendBtn.textContent = 'ارسال مجدد کد';
      } else {
        resendBtn.textContent = 'ارسال مجدد کد (' + fa(Math.floor(left / 60)) + ':' + fa(String(left % 60).padStart(2, '0')) + ')';
      }
    }, 1000);
    resendBtn.addEventListener('click', function () {
      resendBtn.disabled = true;
      requestOTP(mobile).then(function () {
        toast('کد جدید ارسال شد');
        left = 60;
        var iv2 = setInterval(function () {
          left -= 1;
          if (left <= 0) { clearInterval(iv2); resendBtn.disabled = false; resendBtn.textContent = 'ارسال مجدد کد'; }
          else resendBtn.textContent = 'ارسال مجدد کد (' + fa(Math.floor(left / 60)) + ':' + fa(String(left % 60).padStart(2, '0')) + ')';
        }, 1000);
      }).catch(function (e) {
        resendBtn.disabled = false;
        toast(errText(e));
      });
    });
  }

  /* ---------- موکاپ گوشی لندینگ — داده واقعی ---------- */
  function mountPhoneMock() {
    var box = document.getElementById('phoneMockList');
    if (!box) return;
    searchTeachers({ limit: 3 }).then(function (rows) {
      box.innerHTML = rows.slice(0, 3).map(function (t) {
        return '<div class="scr-teacher"><span class="scr-av">' + letterAvatar(t.name) + '</span>' +
          '<div><b>' + esc(t.name) + '</b><span>' + esc(t.field || 'آموزگار قرآن') + '</span></div>' +
          '<span class="scr-price">' + money(t.price30) + '</span></div>';
      }).join('');
    }).catch(function () { box.innerHTML = ''; });
  }

  /* ---------- استارت ---------- */
  function boot() {
    sessionNav();
    var page = document.body.getAttribute('data-page');
    if (page === 'login') mountLoginPage();
    else if (page === 'otp') mountOtpPage();
    else if (page === 'book') mountBookPage();
    else if (page === 'sessions') mountSessionsPage();
    else if (page === 'profile') mountProfilePage();
    else if (page === 'wallet') mountWalletPage();
    else if (page === 'credit') mountCreditPage();
    if (document.getElementById('phoneMockList')) mountPhoneMock();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  /* ---------- API عمومی ---------- */
  window.VoddaAPI = {
    fa: fa, esc: esc, money: money, rating: rating, faDate: faDate, weekdayName: weekdayName,
    normalizeMobile: normalizeMobile, validMobile: validMobile, maskMobile: maskMobile,
    toast: toast,
    isLogged: isLogged, me: me, logout: logout,
    requestOTP: requestOTP, verifyOTP: verifyOTP,
    searchTeachers: searchTeachers, teacherDetail: teacherDetail, availability: availability,
    bookSession: bookSession, mySessions: mySessions, cancelSession: cancelSession,
    walletTransactions: walletTransactions, updateProfile: updateProfile, sendSupport: sendSupport,
    mountTeacherCarousel: mountTeacherCarousel,
    mountSearchPage: mountSearchPage,
    mountTeacherProfile: mountTeacherProfile,
    bindHeaderSearch: bindHeaderSearch,
    /* کمکی داخلی برای fallback تصویر */
    _letterAv: _letterAv, _letterAvP: _letterAvP
  };
})();
