/*!
 * Aubingo @Kambafarm — website interactions
 * Plain JavaScript, no libraries. The basket is stored in localStorage so it
 * stays the same while moving between pages (and between open tabs).
 */
(function () {
  'use strict';

  // Page-to-page transitions: when the browser skips one (back/forward cache,
  // reduced motion, fast clicks) its promises reject — mark them handled so the
  // console stays clean.
  function quietTransition(e) {
    var vt = e.viewTransition;
    if (!vt) return;
    ['ready', 'finished', 'updateCallbackDone'].forEach(function (k) {
      if (vt[k] && vt[k].catch) vt[k].catch(function () {});
    });
  }
  window.addEventListener('pagereveal', quietTransition);
  window.addEventListener('pageswap', quietTransition);

  /* =====================================================================
   * 0. Small helpers
   * =================================================================== */
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function rupees(n) { return '₹' + Number(n).toLocaleString('en-IN'); }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* =====================================================================
   * 1. Navigation — the old single-page "paths" now point at real pages
   * =================================================================== */
  var ROUTES = {
    'home': 'index.html',
    'shop': 'shop.html',
    'this-weeks-harvest': 'shop.html?cat=harvest',
    'from-our-kitchen': 'shop.html?cat=kitchen',
    'seeds-and-saplings': 'shop.html?cat=seeds',
    'special-enquiries': 'special-enquiries.html',
    'product-turmeric': 'product-turmeric.html',
    'recipes': 'product-knowledge-sheets.html',
    'product-knowledge-sheets': 'product-knowledge-sheets.html',
    'saturday-farm-tour': 'saturday-farm-tour.html',
    'kambafarm-weekend': 'kambafarm-weekend.html',
    'practical-information': 'practical-information.html',
    'farm-stories': 'farm-stories.html',
    'our-story': 'our-story.html',
    'the-farm': 'the-farm.html',
    'our-team': 'our-team.html',
    'our-animals': 'our-animals.html',
    'how-we-farm': 'how-we-farm.html',
    'basket': 'basket.html'
  };

  window.navigateTo = function (path) {
    window.location.href = ROUTES[path] || 'index.html';
  };

  /* Mobile menu ------------------------------------------------------- */
  function initMobileMenu() {
    var toggle = $('[data-menu-toggle]');
    var menu = $('#mobile-menu');
    if (!toggle || !menu) return;
    var icon = toggle.querySelector('.material-symbols-outlined');

    function setOpen(open) {
      menu.classList.toggle('hidden', !open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (icon) icon.textContent = open ? 'close' : 'menu';
    }

    toggle.addEventListener('click', function () {
      setOpen(menu.classList.contains('hidden'));
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 1280) setOpen(false);
    });
  }

  /* Language switcher --------------------------------------------------
   * The saved language is already shown before paint by the inline header
   * boot script (assets/js/header-boot.js); this only handles clicks. */
  var LANG_KEY = 'kambafarm.lang';
  var LANG_NAMES = { en: 'English', hi: 'हिंदी (Hindi)', mr: 'मराठी (Marathi)' };

  function initLanguage() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-lang]');
      if (!btn) return;
      var lang = btn.getAttribute('data-lang');
      try { localStorage.setItem(LANG_KEY, lang); } catch (err) { /* private mode */ }
      if (window.kfApplyLanguage) lang = window.kfApplyLanguage(lang);

      // close the desktop dropdown straight away (it would stay open while hovered)
      var switcher = btn.closest('[data-lang-switcher]');
      if (switcher) {
        switcher.setAttribute('data-closing', '');
        if (document.activeElement) document.activeElement.blur();
        switcher.addEventListener('mouseleave', function reopen() {
          switcher.removeAttribute('data-closing');
          switcher.removeEventListener('mouseleave', reopen);
        });
      }
      showMiniToast('Language: ' + LANG_NAMES[lang]);
    });

    // keep other open tabs in step
    window.addEventListener('storage', function (e) {
      if (e.key === LANG_KEY && window.kfApplyLanguage) window.kfApplyLanguage(e.newValue || 'en');
    });
  }

  /* =====================================================================
   * 2. Basket store
   * =================================================================== */
  var STORE_KEY = 'kambafarm.basket.v1';
  var MIN_ORDER = 500;
  var FREE_DELIVERY_FROM = 1200;
  var DELIVERY_FEE = 100;
  var WHATSAPP_NUMBER = '917990039450'; // testing number — replace with the farm's WhatsApp before launch

  var PRODUCT_IMAGES = {
    'Artisanal Turmeric Powder': 'https://lh3.googleusercontent.com/aida-public/AB6AXuArTOWGvSYzWe5nCxT2iY1XUnz51wSI388mSzDXXsJOFFAVD7UwZR_tgnOY1KpO2YIBUZAU1WTof7PicgrwceBSXZfwDnePatTRMCnPjPFlsT01lAUNOOv5_6lD1pnDGJH8VK8F2ZaDrgSvoR1u2dHQMGfyVrCPjXPLZTt8Jr6NsVCGe5Hn5N6AvUvWqVL3BpqPN9uRASGJ6Ol5ECpR4-FsRv3H_AYh2TDIP-c--kW1',
    'Raw Wildflower Honey': 'https://lh3.googleusercontent.com/aida-public/AB6AXuAX2fsa8J3YdG8aqoWJytnrlIZx7Uz-9MUiJ10p-VpoVxUWk7AZLvHpM24LMyXc9AiCy-igIm0sYXiqLgrfnx2K94zXNrM8YBVfa2la3T6TxfLiIdyzi5b71TYGRnCUeUp-FSY-1y0JzoC_FJmo_s_j1cb90pTYUFs3fCxYSxYz-TQaoLBaOSb0FqTYpSWLj2X-77cwnLVFBxzVq34kY_7NoCDrv79n1KuzZb6HCEYA',
    'Wood Pressed Sesame Oil': 'https://lh3.googleusercontent.com/aida-public/AB6AXuCyPWkCes9XZymRaDXChrPAGg-HPbnuvkCerlb423N4OuGGhaOWtsj97698p-w3Kh8nmJoCuyU7pWblw6vXlEBHYVVhoNarS_kDtivcKTAu5QE04hZIbtl0wajl5UxlyMqdqis7e_9Hf9OXBIFCCHXZNTXihy-GBdRSE05c4BAin1AH08RrwV7BLLzlRmKyAEs8mOOWPvRYDLXqAUhTy22Yb-uTjCm71Nly0gSQXeC7',
    'Native Jamun Sapling': 'https://lh3.googleusercontent.com/aida-public/AB6AXuDEJpi-SxX-X9vAD0Gw8NaxB4Dfolu6S9n47xV2HaiIBgbkeRG4hKrpNcbBxD3c2_nPv4JROtMcPhcwxlCEy8yO9qhKq9WjlvnO5Gh4lh4fhkUfA1IParQK7WK3dV5n4rqEakwF8m2-35-7MJ3NvVpIteQzD-bTqVtt7XaPXhRhH6-gBUSz-8nP-ayj0tg1cXcJLZVgtMrzQPP_x2hqA2uCTWbs4-m9_J9oSJm40t70'
  };

  var basket = loadBasket();

  function loadBasket() {
    try {
      var data = JSON.parse(localStorage.getItem(STORE_KEY));
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  function saveBasket() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(basket)); } catch (e) { /* private mode */ }
  }

  function findIndex(title, pack) {
    for (var i = 0; i < basket.length; i++) {
      if (basket[i].title === title && basket[i].pack === pack) return i;
    }
    return -1;
  }

  function basketSubtotal() {
    return basket.reduce(function (sum, item) { return sum + item.price * item.qty; }, 0);
  }

  function deliveryFor(subtotal) {
    if (subtotal <= 0) return 0;
    return subtotal >= FREE_DELIVERY_FROM ? 0 : DELIVERY_FEE;
  }

  /** Add (delta > 0) or remove (delta < 0) units of one product. */
  function changeQty(item, delta) {
    var i = findIndex(item.title, item.pack);
    if (i < 0) {
      if (delta <= 0) return;
      basket.push({ title: item.title, price: item.price, pack: item.pack, brand: item.brand, qty: delta });
    } else {
      basket[i].qty += delta;
      if (basket[i].qty <= 0) basket.splice(i, 1);
    }
    commitBasket();
  }

  function commitBasket() {
    saveBasket();
    renderBasketEverywhere();
  }

  function renderBasketEverywhere() {
    // header badge = number of different products, not total quantity
    if (window.kfShowBasketCount) window.kfShowBasketCount(basket.length);
    syncCardSteppers();
    renderFullBasketPage();
  }

  // keep several open tabs in step
  window.addEventListener('storage', function (e) {
    if (e.key === STORE_KEY) {
      basket = loadBasket();
      renderBasketEverywhere();
    }
  });

  /* =====================================================================
   * 3. Toasts
   * =================================================================== */
  var toastTimer;
  function showToast(message) {
    var toast = $('#basket-toast');
    if (!toast) return;
    var msg = toast.querySelector('[data-toast-msg]');
    if (msg) msg.textContent = message || 'Added to basket';
    toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.add('hidden'); }, 2500);
  }

  var miniTimer;
  function showMiniToast(message) {
    var toast = $('#mini-stepper-toast');
    var msg = $('#mini-stepper-toast-msg');
    if (!toast) return;
    if (message && msg) msg.textContent = message;
    clearTimeout(miniTimer);
    toast.classList.remove('hidden');
    requestAnimationFrame(function () {
      toast.classList.remove('opacity-0', 'translate-y-[-10px]');
      toast.classList.add('opacity-100', 'translate-y-0');
    });
    miniTimer = setTimeout(function () {
      toast.classList.remove('opacity-100', 'translate-y-0');
      toast.classList.add('opacity-0', 'translate-y-[-10px]');
      setTimeout(function () { toast.classList.add('hidden'); }, 300);
    }, 1800);
  }
  window.showToast = showToast;
  window.showMiniStepperToast = showMiniToast;

  /* =====================================================================
   * 4. Product cards (home + shop): "Add" button turns into a − n + stepper
   * =================================================================== */
  var slotDefaults = typeof WeakMap === 'function' ? new WeakMap() : null;

  function slotItem(slot) {
    return {
      title: slot.getAttribute('data-title'),
      price: parseFloat(slot.getAttribute('data-price')) || 0,
      pack: slot.getAttribute('data-pack'),
      brand: slot.getAttribute('data-brand') || ''
    };
  }

  function stepperHtml(qty) {
    var btn = 'inline-flex items-center justify-center w-[26px] h-[26px] rounded-full text-[#47710A] transition-colors';
    return '' +
      '<div class="flex items-center justify-between w-full max-w-[140px] rounded-full border-[1.5px] border-[#47710A] bg-[#EFF2E4] px-2 py-1">' +
        '<button type="button" class="' + btn + '" onclick="handleCardStepperDelta(this, -1)" aria-label="Remove one">' +
          '<span class="material-symbols-outlined text-[18px]">remove</span></button>' +
        '<span class="card-qty-number min-w-[24px] text-center text-[14px] font-bold text-[#061C00] select-none">' + qty + '</span>' +
        '<button type="button" class="' + btn + '" onclick="handleCardStepperDelta(this, 1)" aria-label="Add one more">' +
          '<span class="material-symbols-outlined text-[18px]">add</span></button>' +
      '</div>';
  }

  function syncCardSteppers() {
    $$('.product-card-cta-slot').forEach(function (slot) {
      var item = slotItem(slot);
      if (!item.title) return;
      var i = findIndex(item.title, item.pack);
      var qty = i >= 0 ? basket[i].qty : 0;
      var counter = slot.querySelector('.card-qty-number');

      if (qty > 0) {
        if (counter) counter.textContent = qty;
        else slot.innerHTML = stepperHtml(qty);
      } else if (counter && slotDefaults && slotDefaults.has(slot)) {
        slot.innerHTML = slotDefaults.get(slot);
      }
    });
  }

  function initCardSlots() {
    $$('.product-card-cta-slot').forEach(function (slot) {
      if (slotDefaults) slotDefaults.set(slot, slot.innerHTML);
    });
  }

  window.handleCardAdd = function (btn) {
    var slot = btn.closest('.product-card-cta-slot');
    if (!slot) return;
    var item = slotItem(slot);
    changeQty(item, 1);
    showToast('Added ' + item.title + ' to basket');
  };

  window.handleCardStepperDelta = function (btn, delta) {
    var slot = btn.closest('.product-card-cta-slot');
    if (!slot) return;
    var item = slotItem(slot);
    changeQty(item, delta);
    if (delta > 0) showMiniToast('Added +1 (' + item.title + ')');
  };

  /* =====================================================================
   * 5. Shop page — category, seller, search and stock filters
   * =================================================================== */
  var CAT_ACTIVE = 'shop-cat-btn h-9 px-space-md rounded-full bg-primary-container text-surface font-label-sm text-label-sm';
  var CAT_IDLE = 'shop-cat-btn h-9 px-space-md rounded-full bg-surface text-ink-muted hover:text-primary border border-line font-label-sm text-label-sm';
  var SELLER_ACTIVE = 'shop-seller-btn px-space-sm py-1 rounded-full font-label-sm text-label-sm bg-pale-leaf text-secondary font-bold';
  var SELLER_IDLE = 'shop-seller-btn px-space-sm py-1 rounded-full font-label-sm text-label-sm text-ink-muted hover:text-primary';

  var shop = { cat: 'all', seller: 'all' };

  window.setCategoryFilter = function (cat) {
    shop.cat = cat;
    $$('.shop-cat-btn').forEach(function (btn) {
      btn.className = btn.getAttribute('data-cat') === cat ? CAT_ACTIVE : CAT_IDLE;
    });
    if (window.history && history.replaceState && $('#shop-products-grid')) {
      var url = cat === 'all' ? 'shop.html' : 'shop.html?cat=' + cat;
      try { history.replaceState(null, '', url); } catch (e) { /* file:// in some browsers */ }
    }
    window.filterShopProducts();
  };

  window.setSellerFilter = function (seller) {
    shop.seller = seller;
    $$('.shop-seller-btn').forEach(function (btn) {
      btn.className = btn.getAttribute('data-seller') === seller ? SELLER_ACTIVE : SELLER_IDLE;
    });
    window.filterShopProducts();
  };

  window.filterShopProducts = function () {
    var search = (($('#shop-search') || {}).value || '').trim().toLowerCase();
    var inStockOnly = !!($('#stock-only-toggle') || {}).checked;

    $$('.product-item').forEach(function (card) {
      var visible =
        (card.getAttribute('data-title') || '').toLowerCase().indexOf(search) !== -1 &&
        (shop.cat === 'all' || card.getAttribute('data-category') === shop.cat) &&
        (shop.seller === 'all' || card.getAttribute('data-seller') === shop.seller) &&
        (!inStockOnly || card.getAttribute('data-stock') === 'true');
      card.classList.toggle('hidden', !visible);
    });
  };

  function initShop() {
    if (!$('#shop-products-grid')) return;
    var params = new URLSearchParams(window.location.search);
    var cat = params.get('cat');
    var known = $$('.shop-cat-btn').map(function (b) { return b.getAttribute('data-cat'); });
    window.setCategoryFilter(known.indexOf(cat) !== -1 ? cat : 'all');
  }

  /* =====================================================================
   * 6. Product detail page (Artisanal Turmeric Powder)
   * =================================================================== */
  var product = {
    title: 'Artisanal Turmeric Powder',
    brand: 'Aubingo',
    pack: { size: 250, price: 240, label: '250g Jar' },
    qty: 1
  };

  function renderProductPrice() {
    var price = $('#product-price');
    var qty = $('#product-qty-display');
    if (price) price.textContent = rupees(product.pack.price * product.qty);
    if (qty) qty.textContent = product.qty;
  }

  window.selectPackSize = function (size, price, btn) {
    product.pack = { size: size, price: price, label: size + 'g Jar' };
    $$('.pack-btn').forEach(function (b) {
      b.classList.remove('border-2', 'border-secondary', 'text-secondary');
      b.classList.add('border', 'border-line', 'text-ink-muted');
    });
    btn.classList.remove('border', 'border-line', 'text-ink-muted');
    btn.classList.add('border-2', 'border-secondary', 'text-secondary');
    renderProductPrice();
  };

  window.adjustProductQty = function (delta) {
    product.qty = Math.max(1, product.qty + delta);
    renderProductPrice();
    if (delta > 0) showMiniToast('Quantity updated (+1)');
  };

  window.addSelectedProductToBasket = function () {
    changeQty({ title: product.title, price: product.pack.price, pack: product.pack.label, brand: product.brand }, product.qty);
    showToast('Added ' + (product.qty > 1 ? product.qty + ' × ' : '') + product.title + ' to basket');
  };

  var THUMB_ACTIVE = 'thumb-btn rounded-lg overflow-hidden aspect-square border-2 border-secondary';
  var THUMB_IDLE = 'thumb-btn rounded-lg overflow-hidden aspect-square border border-line';

  function markThumb(index) {
    $$('.thumb-btn').forEach(function (btn, i) {
      btn.className = i === index ? THUMB_ACTIVE : THUMB_IDLE;
    });
  }

  window.changeProductThumb = function (index) {
    var main = $('#product-main-image');
    var thumb = $$('.thumb-btn')[index];
    var img = thumb && thumb.querySelector('img');
    if (!main || !img) return;
    main.style.opacity = '0.3';
    setTimeout(function () {
      main.src = img.src;
      main.alt = img.alt || main.alt;
      main.style.opacity = '1';
    }, 150);
    markThumb(index);
  };

  function initProduct() {
    var main = $('#product-main-image');
    if (!main) return;
    var thumbs = $$('.thumb-btn img');
    var match = 0;
    thumbs.forEach(function (img, i) { if (img.src === main.src) match = i; });
    markThumb(match);
    renderProductPrice();
  }

  /* Product knowledge sheets — category filter ------------------------ */
  var SHEET_ACTIVE = 'ks-filter-btn h-9 px-space-md rounded-full bg-primary-container text-surface font-label-sm text-label-sm';
  var SHEET_IDLE = 'ks-filter-btn h-9 px-space-md rounded-full bg-surface text-ink-muted hover:text-primary border border-line font-label-sm text-label-sm';

  window.setSheetFilter = function (cat) {
    var shown = 0;
    $$('.ks-filter-btn').forEach(function (btn) {
      var active = btn.getAttribute('data-sheet-filter') === cat;
      btn.className = active ? SHEET_ACTIVE : SHEET_IDLE;
      btn.setAttribute('aria-pressed', String(active));
    });
    $$('.knowledge-sheet-card').forEach(function (card) {
      var visible = cat === 'all' || card.getAttribute('data-sheet-category') === cat;
      card.classList.toggle('hidden', !visible);
      if (visible) shown++;
    });
    var grid = $('#knowledge-sheets-grid');
    var empty = $('#knowledge-sheets-empty');
    if (grid) grid.classList.toggle('hidden', shown === 0);
    if (empty) {
      empty.classList.toggle('hidden', shown > 0);
      empty.classList.toggle('flex', shown === 0);
    }
  };

  /* Farm stories (blog) — topic filter --------------------------------- */
  var STORY_ACTIVE = 'story-filter-btn h-9 px-space-md rounded-full bg-primary-container text-surface font-label-sm text-label-sm';
  var STORY_IDLE = 'story-filter-btn h-9 px-space-md rounded-full bg-surface text-ink-muted hover:text-primary border border-line font-label-sm text-label-sm';

  window.setStoryFilter = function (cat) {
    $$('.story-filter-btn').forEach(function (btn) {
      var active = btn.getAttribute('data-story-filter') === cat;
      btn.className = active ? STORY_ACTIVE : STORY_IDLE;
      btn.setAttribute('aria-pressed', String(active));
    });
    // the featured story only shows under "All" or its own topic
    var shownInGrid = 0;
    $$('#farm-stories .story-card').forEach(function (card) {
      var visible = cat === 'all' || card.getAttribute('data-story-category') === cat;
      card.classList.toggle('hidden', !visible);
      if (visible && !card.classList.contains('story-featured')) shownInGrid++;
    });
    var featured = $('#farm-stories .story-featured');
    var featuredShown = featured && !featured.classList.contains('hidden');
    var grid = $('#stories-grid');
    var empty = $('#stories-empty');
    if (grid) grid.classList.toggle('hidden', shownInGrid === 0);
    if (empty) {
      var none = shownInGrid === 0 && !featuredShown;
      empty.classList.toggle('hidden', !none);
      empty.classList.toggle('flex', none);
    }
  };

  /* Knowledge sheet modal --------------------------------------------- */
  window.openKnowledgeModal = function () {
    var modal = $('#knowledge-sheet-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    document.documentElement.classList.add('overflow-hidden');
  };

  window.closeKnowledgeModal = function () {
    var modal = $('#knowledge-sheet-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    document.documentElement.classList.remove('overflow-hidden');
  };

  function initModal() {
    var modal = $('#knowledge-sheet-modal');
    if (!modal) return;
    modal.addEventListener('click', function (e) {
      if (e.target === modal) window.closeKnowledgeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) window.closeKnowledgeModal();
    });
  }

  /* =====================================================================
   * 7. Saturday farm tour — ticket calculator and booking
   * =================================================================== */
  var TOUR_PRICE = { adult: 1750, child: 900 };

  function readCount(id, min) {
    var el = document.getElementById(id);
    var n = el ? parseInt(el.value, 10) : 0;
    return isNaN(n) ? min : Math.max(min, n);
  }

  window.recalcTourTotal = function () {
    var total = $('#tour-total-price');
    if (!total) return;
    var adults = readCount('tour-adult-count', 0);
    var children = readCount('tour-child-count', 0);
    total.textContent = rupees(adults * TOUR_PRICE.adult + children * TOUR_PRICE.child);
  };

  window.updateTourTickets = function (type, delta) {
    var id = type === 'adult' ? 'tour-adult-count' : 'tour-child-count';
    var min = type === 'adult' ? 1 : 0;
    var input = document.getElementById(id);
    if (input) input.value = Math.max(min, readCount(id, min) + delta);
    window.recalcTourTotal();
  };

  window.submitTourBooking = function () {
    var name = ($('#tour-name') || {}).value || '';
    var phone = ($('#tour-phone') || {}).value || '';
    var dateSelect = $('#tour-date-select');
    var agreement = $('#tour-agreement');
    if (!name.trim() || !phone.trim()) {
      alert('Please provide your name and WhatsApp contact number.');
      return;
    }
    if (agreement && !agreement.checked) {
      alert('Please confirm that you agree to the visitor protocol.');
      return;
    }
    var date = dateSelect ? dateSelect.options[dateSelect.selectedIndex].text.replace(/\s*\(.*\)$/, '') : '';
    alert('Thank you ' + name.trim() + '! Reserved ' + readCount('tour-adult-count', 1) + ' Adults & ' +
      readCount('tour-child-count', 0) + ' Children for ' + date + '. Confirmation dispatched via WhatsApp.');
  };

  /* =====================================================================
   * 8. Kambafarm Weekend — stay request
   * =================================================================== */
  window.selectAccommodation = function (roomName) {
    var room = $('#stay-room');
    if (room) room.value = roomName;
    var target = $('#weekend-form-section') || $('#stay-request-form');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  window.submitStayRequest = function (e) {
    e.preventDefault();
    var room = ($('#stay-room') || {}).value;
    var dates = ($('#stay-dates') || {}).value;
    var phone = ($('#stay-phone') || {}).value;
    alert('Stay Request Logged: ' + room + ' for ' + dates + '. Our homestead team will message ' + phone + ' to confirm availability.');
    e.target.reset();
  };

  /* =====================================================================
   * 9. Special enquiries
   * =================================================================== */
  window.prefillSpecialEnquiry = function (itemName) {
    var select = $('#enquiry-item');
    if (select) {
      for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].text.indexOf(itemName) !== -1) { select.selectedIndex = i; break; }
      }
    }
    var form = $('#special-enquiry-form');
    if (form) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  window.submitSpecialEnquiry = function (e) {
    e.preventDefault();
    var item = ($('#enquiry-item') || {}).value;
    var qty = ($('#enquiry-qty') || {}).value;
    var name = ($('#enquiry-name') || {}).value;
    alert('Enquiry recorded for ' + name + ' (' + qty + ' of ' + item + '). Farm manager Kailas will message you shortly.');
    e.target.reset();
  };

  /* =====================================================================
   * 10. Practical information — the five topics are now plain sections on
   *     one page (#tab-directions … #tab-policies), so links like
   *     practical-information.html#tab-policies scroll straight to them.
   * =================================================================== */

  /* =====================================================================
   * 11. Basket page
   * =================================================================== */
  function renderFullBasketPage() {
    var list = $('#full-basket-items-list');
    if (!list) return;

    // same rule as the header badge: number of different products, not total quantity
    var count = basket.length;
    var subtotal = basketSubtotal();
    var delivery = deliveryFor(subtotal);
    var grand = subtotal + delivery;
    var isEmpty = basket.length === 0;

    // Empty basket: show only the empty-state card, hide notes, summary and item count
    var emptyState = $('#basket-empty-state');
    var filled = $('#basket-filled-content');
    if (emptyState) emptyState.classList.toggle('hidden', !isEmpty);
    if (filled) filled.classList.toggle('hidden', isEmpty);

    var countEl = $('#full-basket-item-count');
    if (countEl) {
      countEl.textContent = count + (count === 1 ? ' item' : ' items');
      countEl.classList.toggle('hidden', isEmpty);
    }
    if (isEmpty) {
      list.innerHTML = '';
      return;
    }
    var subEl = $('#full-basket-subtotal');
    if (subEl) subEl.textContent = rupees(subtotal);
    var delEl = $('#full-basket-delivery');
    if (delEl) delEl.textContent = delivery === 0 ? 'Free' : rupees(delivery);
    var grandEl = $('#full-basket-grand-total');
    if (grandEl) grandEl.textContent = rupees(grand);

    var notice = $('#full-basket-min-notice');
    if (notice) {
      if (subtotal >= MIN_ORDER) {
        notice.className = 'bg-[#F7C75D] text-[#061C00] p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border border-[#F7C75D]';
        notice.innerHTML = '<span class="material-symbols-outlined text-[18px]">check_circle</span><span>Minimum order of ₹500 met for Pune doorstep delivery!</span>';
      } else if (subtotal > 0) {
        notice.className = 'bg-[#FBF3DC] text-[#8A3B18] p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border border-[#F7C75D]';
        notice.innerHTML = '<span class="material-symbols-outlined text-[18px]">info</span><span>Add ' + rupees(MIN_ORDER - subtotal) + ' more to meet the ₹500 minimum basket order.</span>';
      } else {
        notice.className = 'hidden';
      }
    }

    var checkout = $('#full-basket-checkout-btn');
    if (checkout) {
      if (subtotal >= MIN_ORDER) {
        checkout.disabled = false;
        checkout.className = 'w-full py-3.5 rounded-full bg-[#061C00] hover:bg-[#1A3310] text-[#FBF8EF] font-semibold text-xs tracking-wide transition-all shadow-md flex items-center justify-center gap-2 active:scale-95 cursor-pointer';
        checkout.innerHTML = '<span>Pay Online</span><span class="material-symbols-outlined text-[16px]">arrow_forward</span>';
      } else {
        checkout.disabled = true;
        checkout.className = 'w-full py-3.5 rounded-full bg-[#c4c8bc] text-[#45503D] font-semibold text-xs tracking-wide cursor-not-allowed flex items-center justify-center gap-2';
        checkout.innerHTML = '<span>Min Basket ₹500 (Add ' + rupees(MIN_ORDER - subtotal) + ' more)</span>';
      }
    }

    list.innerHTML = basket.map(function (item, idx) {
      var img = PRODUCT_IMAGES[item.title] || PRODUCT_IMAGES['Artisanal Turmeric Powder'];
      var badge = item.brand === 'Aubingo'
        ? '<span class="px-2 py-0.5 rounded-full bg-[#F7C75D] text-[#061C00] font-bold text-[10px]">Aubingo</span>'
        : '<span class="px-2 py-0.5 rounded-full bg-[#47710A] text-[#FBF8EF] font-bold text-[10px]">Kambafarm</span>';
      var title = escapeHtml(item.title);
      return '' +
        '<div class="bg-white rounded-2xl p-4 md:p-5 border border-line flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm group hover:border-[#47710A]/50 transition-all">' +
          '<div class="flex items-center gap-4">' +
            '<div class="w-20 h-20 rounded-xl overflow-hidden bg-[#EFF2E4] border border-line shrink-0"><img src="' + img + '" alt="' + title + '" class="w-full h-full object-cover"></div>' +
            '<div class="flex flex-col gap-1">' +
              '<div class="flex items-center gap-2">' + badge + '<span class="text-[11px] text-[#5E6B54]">' + escapeHtml(item.pack) + '</span></div>' +
              '<h3 class="font-bold text-[15px] text-[#061C00] leading-snug">' + title + '</h3>' +
              '<p class="text-xs text-[#45503D]">' + rupees(item.price) + ' per unit</p>' +
            '</div>' +
          '</div>' +
          '<div class="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-line">' +
            '<div class="flex items-center border-[1.5px] border-[#47710A] rounded-full bg-[#EFF2E4] px-2 py-1">' +
              '<button type="button" onclick="updateFullBasketItemQty(' + idx + ', -1)" class="w-6 h-6 flex items-center justify-center text-[#47710A] hover:bg-white rounded-full font-bold transition-all" aria-label="Remove one"><span class="material-symbols-outlined text-[16px]">remove</span></button>' +
              '<span class="w-8 text-center text-xs font-bold text-[#061C00] select-none">' + item.qty + '</span>' +
              '<button type="button" onclick="updateFullBasketItemQty(' + idx + ', 1)" class="w-6 h-6 flex items-center justify-center text-[#47710A] hover:bg-white rounded-full font-bold transition-all" aria-label="Add one more"><span class="material-symbols-outlined text-[16px]">add</span></button>' +
            '</div>' +
            '<div class="text-right min-w-[70px]">' +
              '<span class="block font-bold text-sm text-[#061C00]">' + rupees(item.price * item.qty) + '</span>' +
              '<button type="button" onclick="removeFullBasketItem(' + idx + ')" class="text-[11px] text-[#7D202B] hover:underline font-semibold mt-0.5">Remove</button>' +
            '</div>' +
          '</div>' +
        '</div>';
    }).join('');
  }

  window.updateFullBasketItemQty = function (idx, delta) {
    if (!basket[idx]) return;
    changeQty(basket[idx], delta);
    if (delta > 0) showMiniToast('Quantity updated (+1)');
  };

  window.removeFullBasketItem = function (idx) {
    if (!basket[idx]) return;
    var title = basket[idx].title;
    basket.splice(idx, 1);
    commitBasket();
    showMiniToast('Removed ' + title);
  };

  // "Pay Online" needs an account; WhatsApp ordering does not
  window.proceedFullCheckout = function () {
    var subtotal = basketSubtotal();
    if (subtotal < MIN_ORDER) return;
    if (!currentUser()) {
      openLoginRequired();
      return;
    }
    alert('Navigating to secure payment gateway. Total order value: ' + rupees(subtotal + deliveryFor(subtotal)) +
      '. Delivery across Pune & PCMC will be scheduled.');
  };

  function openLoginRequired() {
    var modal = $('#login-required');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'login-required';
      modal.setAttribute('data-kf-modal', '');
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'login-required-title');
      modal.className = 'fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#061C00]/60 backdrop-blur-sm';
      modal.innerHTML =
        '<div class="relative w-full max-w-md bg-white rounded-3xl border border-line shadow-[0_24px_60px_rgba(6,28,0,0.25)] p-6 sm:p-8 text-center">' +
          '<button type="button" class="absolute top-4 right-4 w-9 h-9 rounded-full text-ink-muted hover:bg-pale-leaf hover:text-[#061C00] flex items-center justify-center transition-colors" data-close-modal aria-label="Close"><span class="material-symbols-outlined text-[20px]">close</span></button>' +
          '<span class="mx-auto w-14 h-14 rounded-full bg-pale-leaf text-secondary flex items-center justify-center"><span class="material-symbols-outlined text-[28px]">lock</span></span>' +
          '<h2 id="login-required-title" class="mt-4 font-h3 text-[22px] leading-[30px] text-[#061C00]">Log in to pay online</h2>' +
          '<p class="mt-2 font-small text-small text-ink-muted">Online payment needs an account so we can send your receipt and delivery updates.</p>' +
          '<div class="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">' +
            '<a href="login.html?next=basket.html" class="h-12 rounded-full bg-[#061C00] hover:bg-[#1A3310] text-[#FBF8EF] font-label text-label flex items-center justify-center gap-2 transition-colors"><span class="material-symbols-outlined text-[18px]">login</span>Log in</a>' +
            '<a href="login.html?next=basket.html#signup" class="h-12 rounded-full border border-[#47710A] text-[#47710A] hover:bg-[#47710A] hover:text-[#FBF8EF] font-label text-label flex items-center justify-center gap-2 transition-colors"><span class="material-symbols-outlined text-[18px]">person_add</span>Sign up</a>' +
          '</div>' +
          '<div class="my-5 flex items-center gap-3 font-small text-[12px] text-ink-muted"><span class="flex-1 h-px bg-line"></span>or<span class="flex-1 h-px bg-line"></span></div>' +
          '<button type="button" class="w-full h-12 rounded-full bg-[#EFF2E4] hover:bg-[#E4E9D5] text-[#385A07] font-label text-label flex items-center justify-center gap-2 transition-colors" data-whatsapp-order><span class="material-symbols-outlined text-[18px]">chat</span>Send order on WhatsApp · no login needed</button>' +
        '</div>';
      document.body.appendChild(modal);
      modal.addEventListener('click', function (e) {
        if (e.target === modal || e.target.closest('[data-close-modal]')) closeLoginRequired();
        if (e.target.closest('[data-whatsapp-order]')) { closeLoginRequired(); window.sendBasketWhatsApp(); }
      });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLoginRequired(); });
    }
    modal.classList.remove('hidden');
    document.documentElement.classList.add('overflow-hidden');
    var first = modal.querySelector('a');
    if (first) first.focus();
  }

  function closeLoginRequired() {
    var modal = $('#login-required');
    if (!modal || modal.classList.contains('hidden')) return;
    modal.classList.add('hidden');
    document.documentElement.classList.remove('overflow-hidden');
  }

  // Opens WhatsApp straight into a chat with the farm, the full order summary typed in
  window.sendBasketWhatsApp = function () {
    if (!basket.length) return;
    var subtotal = basketSubtotal();
    var delivery = deliveryFor(subtotal);
    var lines = ['Hello Kambafarm! I would like to place this order:', ''];
    basket.forEach(function (item, n) {
      lines.push((n + 1) + '. ' + item.title + ' (' + item.pack + ') × ' + item.qty + ' = ' + rupees(item.price * item.qty));
    });
    lines.push('', 'Items subtotal: ' + rupees(subtotal), 'Delivery: ' + (delivery ? rupees(delivery) : 'Free'),
      'Total: ' + rupees(subtotal + delivery));
    var p = loadProfile();
    var details = [];
    if (p.name) details.push('Name: ' + p.name);
    if (p.phone) details.push('Phone: ' + p.phone);
    var address = [p.address, p.area, p.city].filter(Boolean).join(', ');
    if (address) details.push('Address: ' + address + (p.pincode ? ' - ' + p.pincode : ''));
    if (details.length) lines.push('', details.join('\n'));
    lines.push('', 'Please confirm the delivery day. Thank you!');
    window.open('https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(lines.join('\n')), '_blank', 'noopener');
  };

  /* =====================================================================
   * 12. Footer newsletter
   * =================================================================== */
  function initNewsletter() {
    $$('[data-newsletter-form]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var consent = form.parentNode.querySelector('input[type="checkbox"]');
        if (consent && !consent.checked) {
          alert('Please tick the consent box to receive farm news.');
          return;
        }
        form.reset();
        if (consent) consent.checked = false;
        showToast('Thank you — you are on the farm news list');
        // button briefly confirms the sign-up
        var btn = form.querySelector('.kf-btn-subscribe');
        var label = btn && btn.querySelector('.kf-sub-text');
        if (btn && label) {
          btn.classList.add('is-done');
          label.textContent = 'Subscribed ✓';
          setTimeout(function () {
            btn.classList.remove('is-done');
            label.textContent = 'Subscribe';
          }, 2200);
        }
      });
    });
  }

  /* =====================================================================
   * 13. Motion — header shadow on scroll, scroll-reveal, card hover lift
   * =================================================================== */
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Header: soft shadow once scrolled; slides away while scrolling down and
  // comes back when the visitor scrolls up, reaches the top, or moves the mouse
  // to the top edge of the window.
  function initHeaderShadow() {
    var header = $('#site-header');
    if (!header) return;
    var lastY = window.scrollY;
    var menu = $('#mobile-menu');
    var shownByHover = false;
    var REVEAL_ZONE = 32; // px from the top edge that brings the header back

    function setHidden(hidden) {
      header.classList.toggle('is-hidden', hidden);
      document.documentElement.classList.toggle('kf-header-hidden', hidden);
    }

    function keepVisible() {
      // never hide while the mobile menu or a dropdown is in use
      return (menu && !menu.classList.contains('hidden')) ||
        header.matches(':focus-within') || header.matches(':hover');
    }

    function update() {
      var y = window.scrollY;
      var delta = y - lastY;
      header.classList.toggle('is-scrolled', y > 8);
      if (y <= header.offsetHeight || keepVisible()) {
        setHidden(false);
      } else if (delta > 6) {
        setHidden(true);        // scrolling down
        shownByHover = false;
      } else if (delta < -6) {
        setHidden(false);       // scrolling up
        shownByHover = false;
      }
      if (Math.abs(delta) > 6) lastY = y;
    }
    // cheap enough to run on every scroll event (no rAF, so it also works in background tabs)
    window.addEventListener('scroll', update, { passive: true });
    update();

    // Mouse / trackpad: pointing at the top edge brings the hidden header back;
    // leaving it again (without scrolling up) tucks it away.
    if (window.matchMedia && window.matchMedia('(hover: hover)').matches) {
      document.addEventListener('mousemove', function (e) {
        if (e.clientY <= REVEAL_ZONE && header.classList.contains('is-hidden')) {
          shownByHover = true;
          setHidden(false);
        }
      }, { passive: true });
      header.addEventListener('mouseleave', function () {
        if (!shownByHover) return;
        shownByHover = false;
        if (window.scrollY > header.offsetHeight && !keepVisible()) setHidden(true);
      });
    }
  }

  // Links like practical-information.html#tab-policies: images and fonts above the
  // target finish loading after the browser's jump and push it down. Keep the target
  // lined up under the header for the first few seconds, unless the visitor scrolls.
  function initHashLanding() {
    var id = decodeURIComponent(window.location.hash.slice(1));
    var target = id && document.getElementById(id);
    if (!target || !('ResizeObserver' in window)) return;
    var done = false;
    function stop() { done = true; ro.disconnect(); }
    // offsetTop ignores the scroll-reveal transform, so the landing spot is exact
    function align() {
      if (done) return;
      var y = 0;
      for (var el = target; el; el = el.offsetParent) y += el.offsetTop;
      var header = document.getElementById('site-header');
      var offset = (header ? header.offsetHeight : 0) + 16;
      window.scrollTo({ top: Math.max(0, y - offset), behavior: 'instant' });
    }
    var ro = new ResizeObserver(align);
    ro.observe(document.body);
    ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (ev) {
      window.addEventListener(ev, stop, { once: true, passive: true });
    });
    setTimeout(stop, 3000);
    align();
  }

  // "On this page" contents (Practical information): highlight the section in view
  function initToc() {
    var links = $$('[data-toc-link]');
    if (!links.length || !('IntersectionObserver' in window)) return;
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    function setActive(id) {
      links.forEach(function (a) {
        var on = a === map[id];
        a.classList.toggle('bg-pale-leaf', on);
        a.classList.toggle('text-leaf-dark', on);
        a.classList.toggle('font-semibold', on);
        a.classList.toggle('text-on-surface', !on);
        if (on) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { if (entry.isIntersecting) setActive(entry.target.id); });
    }, { rootMargin: '-30% 0px -60% 0px' });
    Object.keys(map).forEach(function (id) {
      var section = document.getElementById(id);
      if (section) io.observe(section);
    });
    setActive(Object.keys(map)[0]);
  }

  // On touch screens give small text links / pills a bigger invisible hit area
  function initTapTargets() {
    if (!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches)) return;
    $$('main a, main button').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.width > 0 && r.height < 36 && getComputedStyle(el).position === 'static') el.classList.add('kf-tap');
    });
  }

  function initCardHover() {
    $$('main div[class*="hover:border-secondary"]').forEach(function (card) {
      if (/rounded-(xl|2xl)/.test(card.className)) card.classList.add('kf-card');
    });
  }

  function initReveal() {
    if (reduceMotion || !('IntersectionObserver' in window)) return;

    var targets = [];
    // 1) every content band after the first one (the first is the hero / page title)
    var page = $('main section');
    if (page) {
      Array.prototype.slice.call(page.children).slice(1).forEach(function (band) {
        if (band.offsetHeight > 0) targets.push(band);
      });
    }
    // 2) cards inside grids, staggered left-to-right
    $$('main .grid, main [data-reveal-group]').forEach(function (grid) {
      if (grid.id === 'full-basket-items-list') return;
      // phone swipe rows: cards come in sideways, so don't fade them up
      if (grid.scrollWidth > grid.clientWidth + 1) return;
      var cards = Array.prototype.slice.call(grid.children).filter(function (el) {
        return /rounded-(xl|2xl)/.test(el.className) || el.classList.contains('product-item');
      });
      cards.forEach(function (card, i) {
        card.style.setProperty('--kf-delay', (i % 4) * 90 + 'ms');
        targets.push(card);
      });
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        io.unobserve(el);
        el.classList.add('is-visible');
        var delay = parseInt(el.style.getPropertyValue('--kf-delay'), 10) || 0;
        // hand the element back to its normal styles once the animation is over
        setTimeout(function () {
          el.classList.remove('kf-reveal', 'is-visible');
          el.style.removeProperty('--kf-delay');
        }, delay + 800);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });

    targets.forEach(function (el) {
      el.classList.add('kf-reveal');
      io.observe(el);
    });
  }

  /* =====================================================================
   * 14. Profile (basic, stored on this device only — no account / server)
   * =================================================================== */
  var PROFILE_KEY = 'kambafarm.profile.v1';
  var LANG_SHORT = { en: 'EN', hi: 'हिं', mr: 'मरा' };

  function loadProfile() {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {}; } catch (e) { return {}; }
  }

  function renderProfileSummary(p) {
    var name = (p.name || '').trim();
    var initials = name.split(/\s+/).filter(Boolean).slice(0, 2)
      .map(function (w) { return w.charAt(0); }).join('').toUpperCase();
    var box = $('[data-profile-initials]');
    if (box) {
      box.innerHTML = initials
        ? escapeHtml(initials)
        : '<span class="material-symbols-outlined text-[36px] text-[#FBF8EF]" aria-hidden="true">person</span>';
    }
    var nameEl = $('[data-profile-name]');
    if (nameEl) nameEl.textContent = name || 'Guest';
    var contact = $('[data-profile-contact]');
    if (contact) {
      var bits = [p.phone, p.email].filter(Boolean);
      contact.textContent = bits.length ? bits.join(' · ') : 'Add your details to speed up delivery and farm bookings.';
    }
    var basketEl = $('[data-profile-basket]');
    if (basketEl) basketEl.textContent = basket.length;
    var langEl = $('[data-profile-lang]');
    if (langEl) langEl.textContent = LANG_SHORT[document.documentElement.getAttribute('data-site-lang') || 'en'] || 'EN';
    if (window.kfShowProfileAvatar) window.kfShowProfileAvatar(name);
  }

  function initProfile() {
    var form = $('#profile-form');
    if (!form) return;
    // the profile belongs to an account: send logged-out visitors to log in first
    if (!currentUser()) {
      window.location.replace('login.html?next=profile.html');
      return;
    }
    var error = $('#profile-error');
    var p = loadProfile();
    ['name', 'phone', 'email', 'address', 'area', 'city', 'pincode'].forEach(function (k) {
      if (form.elements[k]) form.elements[k].value = p[k] || (k === 'city' ? 'Pune' : '');
    });
    form.elements.news.checked = !!p.news;
    form.elements.whatsapp.checked = p.whatsapp !== false;
    form.elements.lang.value = document.documentElement.getAttribute('data-site-lang') || 'en';
    renderProfileSummary(p);

    function fail(msg, field) {
      error.textContent = msg;
      error.classList.remove('hidden');
      if (field) field.focus();
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      error.classList.add('hidden');
      var data = {};
      ['name', 'phone', 'email', 'address', 'area', 'city', 'pincode'].forEach(function (k) {
        data[k] = form.elements[k].value.trim();
      });
      data.news = form.elements.news.checked;
      data.whatsapp = form.elements.whatsapp.checked;
      if (!data.name) return fail('Please add your name.', form.elements.name);
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return fail('That email address doesn\'t look right.', form.elements.email);
      if (data.phone && data.phone.replace(/\D/g, '').length < 10) return fail('Please enter a 10-digit WhatsApp number.', form.elements.phone);
      if (data.pincode && !/^\d{6}$/.test(data.pincode)) return fail('PIN code should be 6 digits.', form.elements.pincode);
      try { localStorage.setItem(PROFILE_KEY, JSON.stringify(data)); } catch (err) { /* private mode */ }
      // keep the account's copy in step, so the details come back after logging in again
      var session = currentUser();
      var users = readJSON(USERS_KEY, {});
      if (session && users[session.email]) {
        users[session.email].profile = data;
        users[session.email].name = data.name;
        writeJSON(USERS_KEY, users);
        writeJSON(SESSION_KEY, { email: session.email, name: data.name });
      }
      var lang = form.elements.lang.value;
      try { localStorage.setItem(LANG_KEY, lang); } catch (err) { /* private mode */ }
      if (window.kfApplyLanguage) window.kfApplyLanguage(lang);
      renderProfileSummary(data);
      showToast('Profile saved');
    });

    var clear = $('[data-profile-clear]');
    if (clear) clear.addEventListener('click', function () {
      if (!window.confirm('Remove your saved name, contact and address from this device?')) return;
      try { localStorage.removeItem(PROFILE_KEY); } catch (err) { /* private mode */ }
      form.reset();
      form.elements.city.value = 'Pune';
      form.elements.whatsapp.checked = true;
      form.elements.lang.value = document.documentElement.getAttribute('data-site-lang') || 'en';
      error.classList.add('hidden');
      renderProfileSummary({});
      showToast('Your details were cleared');
    });
  }

  /* =====================================================================
   * 15. Demo login / sign-up
   *     Front-end only (accounts live in this browser's localStorage) so the
   *     mockup can show logged-in / logged-out states. Replace with the real
   *     store's login before going live.
   * =================================================================== */
  var USERS_KEY = 'kambafarm.users.v1';
  var SESSION_KEY = 'kambafarm.session.v1';

  function readJSON(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode */ }
  }
  function currentUser() {
    var s = readJSON(SESSION_KEY, null);
    return s && s.email ? s : null;
  }

  // passwords are never stored as typed
  function hashPassword(email, password) {
    var text = 'kambafarm:' + email.toLowerCase() + ':' + password;
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
      });
    }
    var h = 5381;
    for (var i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
    return Promise.resolve('d' + (h >>> 0).toString(16));
  }

  function startSession(user) {
    writeJSON(SESSION_KEY, { email: user.email, name: user.name });
    writeJSON(PROFILE_KEY, user.profile || { name: user.name, email: user.email, phone: user.phone || '', city: 'Pune', whatsapp: true });
    document.documentElement.setAttribute('data-auth', 'in');
    if (window.kfShowProfileAvatar) window.kfShowProfileAvatar(user.name);
  }

  function logout() {
    try {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(PROFILE_KEY);
    } catch (e) { /* private mode */ }
    document.documentElement.setAttribute('data-auth', 'out');
    if (window.kfShowProfileAvatar) window.kfShowProfileAvatar('');
  }

  // only ever send people back to one of our own pages
  function nextUrl() {
    var next = new URLSearchParams(window.location.search).get('next');
    return next && /^[a-z0-9-]+\.html(#[a-z0-9-]+)?$/i.test(next) ? next : 'profile.html';
  }

  function initAuthButtons() {
    document.addEventListener('click', function (e) {
      if (!e.target.closest('[data-logout]')) return;
      logout();
      showToast('You are logged out');
      var page = window.location.pathname.split('/').pop();
      if (page === 'profile.html') setTimeout(function () { window.location.href = 'index.html'; }, 600);
      if (page === 'login.html') setTimeout(function () { window.location.reload(); }, 600);
    });
  }

  function initLogin() {
    var forms = $('#auth-forms');
    if (!forms) return;
    var loginForm = $('#login-form');
    var signupForm = $('#signup-form');
    var error = $('#auth-error');
    var signedIn = $('#auth-signed-in');
    var TAB_ON = 'flex-1 h-11 rounded-full font-label text-label transition-colors bg-white text-[#061C00] shadow-sm';
    var TAB_OFF = 'flex-1 h-11 rounded-full font-label text-label transition-colors text-[#45503D] hover:text-[#061C00]';

    function showError(msg, field) {
      error.textContent = msg;
      error.classList.remove('hidden');
      if (field) field.focus();
    }
    function clearError() { error.classList.add('hidden'); }

    function setTab(tab) {
      $$('[data-auth-tab]').forEach(function (b) {
        var on = b.getAttribute('data-auth-tab') === tab;
        b.className = on ? TAB_ON : TAB_OFF;
        b.setAttribute('aria-selected', String(on));
      });
      loginForm.classList.toggle('hidden', tab !== 'login');
      loginForm.classList.toggle('flex', tab === 'login');
      signupForm.classList.toggle('hidden', tab !== 'signup');
      signupForm.classList.toggle('flex', tab === 'signup');
      $('[data-auth-title]').textContent = tab === 'login' ? 'Welcome back' : 'Create your account';
      $('[data-auth-sub]').textContent = tab === 'login'
        ? 'Log in to pay online and use your saved details.'
        : 'Sign up to pay online, save your address and book farm visits faster.';
      clearError();
      try { history.replaceState(null, '', window.location.pathname + window.location.search + (tab === 'signup' ? '#signup' : '')); } catch (e) { /* file:// */ }
    }

    $$('[data-auth-tab]').forEach(function (b) {
      b.addEventListener('click', function () { setTab(b.getAttribute('data-auth-tab')); });
    });
    $$('[data-auth-tab-link]').forEach(function (b) {
      b.addEventListener('click', function () { setTab(b.getAttribute('data-auth-tab-link')); });
    });
    $$('[data-toggle-password]').forEach(function (b) {
      b.addEventListener('click', function () {
        var input = b.parentNode.querySelector('input');
        var show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        b.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
        b.querySelector('.material-symbols-outlined').textContent = show ? 'visibility_off' : 'visibility';
      });
    });

    function showSignedIn(user) {
      forms.classList.add('hidden');
      signedIn.classList.remove('hidden');
      signedIn.classList.add('flex');
      var initials = String(user.name || user.email).trim().split(/\s+/).slice(0, 2)
        .map(function (w) { return w.charAt(0); }).join('').toUpperCase();
      $('[data-auth-initials]').textContent = initials;
      $('[data-auth-email]').textContent = user.email;
    }

    var user = currentUser();
    if (user) showSignedIn(user);
    setTab(window.location.hash === '#signup' ? 'signup' : 'login');

    var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      clearError();
      var email = loginForm.elements.email.value.trim().toLowerCase();
      var password = loginForm.elements.password.value;
      if (!EMAIL.test(email)) return showError('Please enter a valid email address.', loginForm.elements.email);
      if (!password) return showError('Please enter your password.', loginForm.elements.password);
      var account = readJSON(USERS_KEY, {})[email];
      if (!account) return showError('No account found for this email. Create one in the Sign up tab.', loginForm.elements.email);
      hashPassword(email, password).then(function (hash) {
        if (hash !== account.hash) return showError('That password is not right. Please try again.', loginForm.elements.password);
        startSession(account);
        showToast('Welcome back, ' + account.name.split(' ')[0]);
        setTimeout(function () { window.location.href = nextUrl(); }, 700);
      });
    });

    signupForm.addEventListener('submit', function (e) {
      e.preventDefault();
      clearError();
      var name = signupForm.elements.name.value.trim();
      var email = signupForm.elements.email.value.trim().toLowerCase();
      var phone = signupForm.elements.phone.value.trim();
      var password = signupForm.elements.password.value;
      if (!name) return showError('Please add your full name.', signupForm.elements.name);
      if (!EMAIL.test(email)) return showError('Please enter a valid email address.', signupForm.elements.email);
      if (phone && phone.replace(/\D/g, '').length < 10) return showError('Please enter a 10-digit WhatsApp number.', signupForm.elements.phone);
      if (password.length < 6) return showError('Your password needs at least 6 characters.', signupForm.elements.password);
      var users = readJSON(USERS_KEY, {});
      if (users[email]) return showError('An account with this email already exists. Please log in.', signupForm.elements.email);
      hashPassword(email, password).then(function (hash) {
        var account = {
          name: name, email: email, phone: phone, hash: hash,
          profile: { name: name, email: email, phone: phone, city: 'Pune', whatsapp: true }
        };
        users[email] = account;
        writeJSON(USERS_KEY, users);
        startSession(account);
        showToast('Account created. Welcome, ' + name.split(' ')[0] + '!');
        setTimeout(function () { window.location.href = nextUrl(); }, 700);
      });
    });
  }

  /* =====================================================================
   * Boot
   * =================================================================== */
  function init() {
    initMobileMenu();
    initLanguage();
    initCardSlots();
    initShop();
    initProduct();
    initModal();
    initNewsletter();
    window.recalcTourTotal();
    renderBasketEverywhere();
    initHeaderShadow();
    initCardHover();
    initTapTargets();
    initHashLanding();
    initToc();
    initAuthButtons();
    initLogin();
    initProfile();
    initReveal();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // Turn transitions back on once the first frames are painted (see .kf-preload in style.css)
  function enableTransitions() {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { document.documentElement.classList.remove('kf-preload'); });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enableTransitions);
  else enableTransitions();
  // rAF doesn't run in background tabs — make sure transitions still come back
  setTimeout(function () { document.documentElement.classList.remove('kf-preload'); }, 400);
})();
