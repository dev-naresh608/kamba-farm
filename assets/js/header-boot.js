/*
 * Header boot — runs inline right after </header> on every page, before the
 * first paint, so the header never jumps or flashes on load:
 *   - shows the saved language (EN / हिं / मरा)
 *   - shows the saved basket count
 *   - highlights the menu section of the current page
 * This file is the source of the inline "header boot" script in each page.
 * Click handling lives in main.js.
 */
(function () {
  var doc = document;
  var root = doc.documentElement;
  var LANGS = { en: 'EN', hi: 'हिं', mr: 'मरा' };

  function read(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }

  window.kfApplyLanguage = function (lang) {
    if (!LANGS[lang]) lang = 'en';
    var deva = lang !== 'en';
    root.setAttribute('lang', lang);
    root.setAttribute('data-site-lang', lang);
    doc.querySelectorAll('[data-lang-current]').forEach(function (el) {
      el.textContent = LANGS[lang];
      el.classList.toggle('font-deva-label', deva);
      el.classList.toggle('text-deva-label', deva);
    });
    doc.querySelectorAll('button[data-lang]').forEach(function (btn) {
      var on = btn.getAttribute('data-lang') === lang;
      btn.setAttribute('aria-checked', String(on));
      btn.classList.toggle('text-secondary', on);
      btn.classList.toggle('font-bold', on);
      btn.classList.toggle('text-on-surface', !on);
      if (btn.hasAttribute('data-lang-pill')) btn.classList.toggle('bg-pale-leaf', on);
    });
    return lang;
  };
  window.kfApplyLanguage(read('kambafarm.lang') || 'en');

  // Badge shows how many DIFFERENT products are in the basket (6 jars of one item = 1)
  var count = 0;
  try {
    var saved = JSON.parse(read('kambafarm.basket.v1'));
    count = Array.isArray(saved) ? saved.length : 0;
  } catch (e) { /* empty basket */ }
  // Basket icon badge: hidden when empty, "99+" cap so it stays round
  window.kfShowBasketCount = function (n) {
    doc.querySelectorAll('[data-basket-count]').forEach(function (el) {
      el.textContent = n > 99 ? '99+' : String(n);
      el.classList.toggle('hidden', n < 1);
    });
    doc.querySelectorAll('[data-basket-link]').forEach(function (el) {
      el.setAttribute('aria-label', 'Basket, ' + n + (n === 1 ? ' product' : ' products'));
    });
  };
  window.kfShowBasketCount(count);

  // Logged in or not (demo login, stored in this browser): CSS shows the Login
  // button or the profile icon from <html data-auth="in|out">
  var session = null;
  try { session = JSON.parse(read('kambafarm.session.v1')); } catch (e) { session = null; }
  root.setAttribute('data-auth', session && session.email ? 'in' : 'out');

  // Profile avatar: show the visitor's initials once they have saved a name
  window.kfShowProfileAvatar = function (name) {
    var initials = String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2)
      .map(function (w) { return w.charAt(0); }).join('').toUpperCase();
    doc.querySelectorAll('[data-profile-avatar-text]').forEach(function (el) {
      el.textContent = initials;
      el.classList.toggle('hidden', !initials);
    });
    doc.querySelectorAll('[data-profile-avatar-icon]').forEach(function (el) {
      el.classList.toggle('hidden', !!initials);
    });
  };
  try {
    window.kfShowProfileAvatar((JSON.parse(read('kambafarm.profile.v1')) || {}).name);
  } catch (e) { /* no profile yet */ }

  var SECTION = {
    'our-story.html': 'discover', 'the-farm.html': 'discover', 'our-team.html': 'discover',
    'our-animals.html': 'discover', 'how-we-farm.html': 'discover',
    'shop.html': 'shop', 'product-turmeric.html': 'shop', 'special-enquiries.html': 'shop',
    'saturday-farm-tour.html': 'visit', 'kambafarm-weekend.html': 'visit', 'practical-information.html': 'visit',
    'product-knowledge-sheets.html': 'news', 'farm-stories.html': 'news',
    'recipes.html': 'news'
  };
  var file = window.location.pathname.split('/').pop() || 'index.html';
  if (file.indexOf('story-') === 0) SECTION[file] = 'news'; // single blog posts
  var here = file + window.location.search;

  doc.querySelectorAll('#site-header [data-nav-group]').forEach(function (group) {
    var active = SECTION[file] === group.getAttribute('data-nav-group');
    var trigger = group.querySelector('[data-nav-trigger]');
    if (active && trigger) {
      trigger.classList.remove('text-primary-container');
      trigger.classList.add('text-secondary');
      if (group.tagName === 'DETAILS') group.open = true;
    }
    group.querySelectorAll('a[href]').forEach(function (a) {
      if (a.getAttribute('href') !== here) return;
      a.classList.remove('text-on-surface');
      a.classList.add('bg-pale-leaf', 'text-leaf-dark');
      a.setAttribute('aria-current', 'page');
    });
  });
})();
