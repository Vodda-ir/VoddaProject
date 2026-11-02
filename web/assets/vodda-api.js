/* وُدّا — لایه اتصال به API واقعی بک‌اند */
(function () {
  'use strict';

  var API_BASE = 'https://api.vodda.ir/api/v1';
  var FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

  function fa(n) {
    return String(n).replace(/\d/g, function (d) { return FA_DIGITS[d]; });
  }
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
  function letterAvatar(name) {
    var ch = String(name || 'ا').trim().charAt(0);
    return '<div class="v-letter-av" aria-hidden="true">' + esc(ch) + '</div>';
  }

  /* ---------- شبکه ---------- */
  function get(path) {
    return fetch(API_BASE + path, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      credentials: 'omit'
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function normalizeTeacher(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var user = raw.user && typeof raw.user === 'object' ? raw.user : {};
    var id = Number(raw.id);
    if (!Number.isInteger(id) || id <= 0) return null;
    return {
      id: id,
      name: String(user.name || 'استاد وُدّا'),
      field: String(raw.field || ''),
      tag: String(raw.tag || ''),
      level: String(raw.level || ''),
      city: String(raw.city || ''),
      bio: String(raw.bio || ''),
      price30: Number(raw.price30 || 0),
      price60: Number(raw.price60 || 0),
      female: !!raw.female,
      verified: !!raw.verified,
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
    qs.set('offset', '0');
    return get('/teachers?' + qs.toString()).then(function (res) {
      var rows = res && Array.isArray(res.data) ? res.data : [];
      return rows.map(normalizeTeacher).filter(Boolean);
    });
  }

  function teacherDetail(id) {
    return get('/teachers/' + encodeURIComponent(id)).then(function (res) {
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

  /* ---------- کارت استاد (طرح ثابت سایت) ---------- */
  function cardHTML(t) {
    var sub = [t.field, t.level].filter(Boolean).join(' · ') || 'آموزگار قرآن و تلاوت';
    var stars = '★★★★★';
    var meta = t.reviews > 0 ? fa(t.rating.toLocaleString('en-US', { maximumFractionDigits: 1 })) + ' (' + fa(t.reviews) + ' نظر)' : 'جدید';
    return '<a class="t-card v-real" href="/teachers/' + t.id + '">' +
      '<span class="online-badge"><span class="dot"></span>آنلاین</span>' +
      '<div class="t-av">' + letterAvatar(t.name) + '</div>' +
      '<h3>' + esc(t.name) + (t.verified ? ' <span class="v-verified" title="مدارک تأییدشده">✓</span>' : '') + '</h3>' +
      '<div class="sp">' + esc(sub) + '</div>' +
      '<div class="stars">' + stars + ' <span>' + esc(meta) + '</span></div>' +
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
      '.v-av-lg{width:64px;height:64px;border-radius:50%;font-size:26px;flex:none;align-self:center}' +
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

  function stateHTML(msg, spin) {
    return '<div class="v-state">' + (spin ? '<span class="v-spin"></span>' : '') + esc(msg) + '</div>';
  }

  /* ---------- لندینگ: کاروسل استادان زنده ---------- */
  function mountTeacherCarousel(containerId) {
    injectStyles();
    var box = document.getElementById(containerId);
    if (!box) return;
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
      '<h3><a href="/teachers/' + t.id + '">' + esc(t.name) + (t.verified ? ' ✓' : '') + '</a></h3>' +
      '<div class="sp">' + esc([t.field, t.tag || t.level].filter(Boolean).join(' · ') || 'آموزگار قرآن و تلاوت') + '</div>' +
      '<div class="stars">★★★★★ <span>' + esc(meta) + '</span></div>' +
      '<div class="meta"><span>جلسه موفق: <b>+' + fa(t.sessions) + '</b></span>' +
      (t.city ? '<span>شهر: <b>' + esc(t.city) + '</b></span>' : '') + '</div>' +
      '</div>' +
      '<span class="badge-online"><span class="online-dot pulse"></span>آنلاین</span>' +
      '<div class="side">' +
      '<div class="price">از <b>' + money(t.price30) + '</b> تومان</div>' +
      '<a class="btn btn-primary btn-sm" href="/teachers/' + t.id + '">رزرو</a>' +
      '</div>' +
      '</div>';
  }

  function renderGroups(rows) {
    var groups = {};
    var order = [];
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
    /* جایگزینی جراحی: فقط section.grpها عوض می‌شوند؛ چیپ‌ها و سرصفحه دست‌نخورده می‌مانند */
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
      var active = chipBox ? chipBox.querySelector('.fchip.active') : null;
      var label = active ? active.textContent.trim() : '';
      var q = input ? input.value.trim() : '';
      var rows = all.filter(function (t) {
        var hay = (t.name + ' ' + t.field + ' ' + t.level + ' ' + t.city).toLowerCase();
        var okQ = !q || hay.indexOf(q.toLowerCase()) !== -1;
        var okF = !label || label === 'همه' || hay.indexOf(label.toLowerCase()) !== -1;
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
          Array.prototype.forEach.call(chipBox.querySelectorAll('.fchip'), function (x) { x.classList.remove('active'); });
          c.classList.add('active');
          applyFilter();
        });
      });
    }

    /* چیپ‌های داینامیک از روی رشته‌های واقعی استادان */
    function rebuildChips() {
      if (!chipBox) return;
      var fields = [];
      all.forEach(function (t) {
        if (t.field && fields.indexOf(t.field) === -1) fields.push(t.field);
      });
      if (!fields.length) return;
      chipBox.innerHTML = '<button class="fchip active" type="button">همه</button>' +
        fields.map(function (f) { return '<button class="fchip" type="button">' + esc(f) + '</button>'; }).join('');
      bindChips();
    }

    if (input) {
      var urlQ = new URLSearchParams(location.search).get('q');
      input.value = urlQ || ''; /* مقدار نمونه دمو پاک می‌شود */
      input.addEventListener('input', function () { applyFilter(); });
    }
    bindChips();

    renderInto('<section class="grp"><div class="sec-head"><h2>استادان</h2></div>' +
      stateHTML('در حال دریافت استادان…', true) + '</section>');
    searchTeachers({ limit: 100 }).then(function (rows) {
      all = rows;
      document.title = 'جستجوی استادان | وُدّا';
      rebuildChips();
      applyFilter();
    }).catch(function () {
      renderInto('<section class="grp"><div class="sec-head"><h2>استادان</h2></div>' +
        stateHTML('دریافت فهرست استادان ناموفق بود — لطفاً صفحه را دوباره بارگذاری کنید.') + '</section>');
    });
  }

  /* ---------- پروفایل استاد ---------- */
  function mountTeacherProfile() {
    injectStyles();
    var id = Number(new URLSearchParams(location.search).get('id'));
    if (!Number.isInteger(id) || id <= 0) {
      location.replace('/search.html');
      return;
    }

    var cta = document.querySelector('.pro-cta .btn-primary');
    if (cta) cta.setAttribute('href', '/teachers/' + id);
    var chatCta = document.querySelector('.pro-cta a[href*="chat.html"]');
    if (chatCta) chatCta.remove();

    teacherDetail(id).then(function (res) {
      var t = res.teacher;

      var av = document.querySelector('.pro-av img');
      if (av) av.outerHTML = letterAvatar(t.name);
      var badge = document.querySelector('.pro-av .badge-online');
      if (badge && !t.verified) badge.remove();

      var h1 = document.querySelector('.pro-info h1');
      if (h1) h1.textContent = t.name + (t.verified ? ' ✓' : '');
      document.title = t.name + ' — ' + (t.field || 'آموزگار قرآن') + ' | وُدّا';

      var sp = document.querySelector('.pro-info .sp');
      if (sp) sp.textContent = [t.field, t.tag || t.level].filter(Boolean).join(' · ') || 'آموزگار قرآن و تلاوت';

      var stars = document.querySelector('.pro-info .stars span');
      if (stars) stars.textContent = rating(t.rating) + ' (' + fa(t.reviews) + ' نظر)';

      var chips = document.querySelector('.pro-info .chips');
      if (chips) {
        var pills = [];
        if (t.verified) pills.push('<span class="pill green">✓ مدارک تأییدشده</span>');
        if (t.city) pills.push('<span class="pill">' + esc(t.city) + '</span>');
        if (t.level) pills.push('<span class="pill">' + esc(t.level) + '</span>');
        if (t.sessions > 0) pills.push('<span class="pill">+' + fa(t.sessions) + ' جلسه موفق</span>');
        chips.innerHTML = pills.join('') || chips.innerHTML;
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
          '<p class="muted" style="font-size:13px;line-height:1.9">برای مشاهده تقویم زنده و رزرو جلسه، وارد صفحه رزرو شوید.</p>' +
          '<a class="btn btn-primary" href="/teachers/' + t.id + '" style="width:100%;text-align:center">📅 رزرو جلسه</a>' +
          '<p class="muted mt" style="text-align:center;font-size:11px">پرداخت امن · امکان لغو تا ۶ ساعت قبل</p>';
      }

      var about = document.getElementById('tp-about');
      if (about && t.bio) {
        about.innerHTML = '<p style="line-height:2.1;font-size:14px">' + esc(t.bio) + '</p>';
      }

      var services = document.getElementById('tp-services');
      if (services) {
        var rows = (t.services || []).filter(function (s) { return s && s.active !== false; });
        services.innerHTML = rows.length
          ? rows.map(function (s) {
              return '<div class="v-srv"><div><b>' + esc(s.title) + '</b><div class="v-srv-meta">' +
                fa(s.duration || 30) + ' دقیقه</div></div>' +
                '<div class="price"><b>' + money(s.price) + '</b> تومان</div></div>';
            }).join('')
          : stateHTML('خدمتی ثبت نشده است.');
      }

      var comments = document.getElementById('tp-comments');
      if (comments) {
        comments.innerHTML = res.reviews.length
          ? res.reviews.map(function (r) {
              return '<div class="v-rev"><div class="v-rev-head"><b>' + esc(r.learnerName) + '</b>' +
                '<span>' + '★★★★★'.slice(0, Math.max(1, Math.round(r.rating))) + ' · ' +
                esc(r.createdAt ? new Date(r.createdAt).toLocaleDateString('fa-IR') : '') + '</span></div>' +
                '<p>' + esc(r.text) + '</p></div>';
            }).join('')
          : stateHTML('هنوز نظری ثبت نشده است.');
      }
    }).catch(function () {
      /* fallback: پروفایل نمونه می‌ماند */
    });
  }

  /* ---------- جست‌وجوی هدر لندینگ ---------- */
  function bindHeaderSearch() {
    var input = document.getElementById('q');
    if (!input) return;
    function go() {
      var v = input.value.trim();
      location.href = '/search.html' + (v ? '?q=' + encodeURIComponent(v) : '');
    }
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
  }

  window.VoddaAPI = {
    searchTeachers: searchTeachers,
    teacherDetail: teacherDetail,
    mountTeacherCarousel: mountTeacherCarousel,
    mountSearchPage: mountSearchPage,
    mountTeacherProfile: mountTeacherProfile,
    bindHeaderSearch: bindHeaderSearch
  };
})();
