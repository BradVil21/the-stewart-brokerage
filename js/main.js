/* ==========================================================================
   The Stewart Brokerage — main.js
   Small-business health insurance · Florida · Texas · Nevada
   --------------------------------------------------------------------------
   Vanilla JS, no dependencies. Every init() no-ops safely when its markup
   isn't present, so one file serves every page.

   01. helpers
   02. reveal engine
   03. mobile navigation
   04. sticky header
   05. countdown (optional)
   06. FAQ accordion
   07. reviews carousel
   08. form validation & submission
   09. quote funnel wizard
   10. back-to-top + year
   ========================================================================== */

(function () {
  'use strict';

  /* ---------- 01. helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Marks the doc JS-capable; CSS only hides pre-animation content under `.js`.
  document.documentElement.classList.add('js');

  /* ---------- 02. reveal engine ---------- */
  const STAGGER_SEQ = 110;
  const STAGGER_WORD = 42;

  function prepareWordAnimation(el) {
    if (el.dataset.animPrepared) return;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) if (walker.currentNode.nodeValue.trim()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const frag = document.createDocumentFragment();
      node.nodeValue.split(/(\s+)/).forEach((chunk) => {
        if (!chunk) return;
        if (/^\s+$/.test(chunk)) { frag.appendChild(document.createTextNode(chunk)); return; }
        const span = document.createElement('span');
        span.className = 'anim-word';
        span.textContent = chunk;
        frag.appendChild(span);
      });
      node.parentNode.replaceChild(frag, node);
    });
    $$('.anim-word', el).forEach((w, i) => w.style.setProperty('--d', (i * STAGGER_WORD) + 'ms'));
    el.dataset.animPrepared = '1';
  }

  function prepareSequence(el) {
    if (el.dataset.animPrepared) return;
    Array.from(el.children).forEach((c, i) => c.style.setProperty('--d', (i * STAGGER_SEQ) + 'ms'));
    el.dataset.animPrepared = '1';
  }

  function initReveal() {
    const items = $$('[data-anim], .step, .stat__num');
    if (!items.length) return;

    $$('[data-anim="word"]').forEach(prepareWordAnimation);
    $$('[data-anim="seq"]').forEach(prepareSequence);

    const showAll = () => items.forEach((el) => {
      el.classList.add('is-visible');
      if (el.dataset.count) el.textContent = (el.dataset.prefix || '') + el.dataset.count + (el.dataset.suffix || '');
    });

    if (reduceMotion || !('IntersectionObserver' in window)) { showAll(); return; }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) reveal(entry.target); });
    }, { threshold: 0.12, rootMargin: '0px 0px -70px 0px' });

    function reveal(el) {
      if (el.classList.contains('is-visible')) return;
      el.classList.add('is-visible');
      if (el.dataset.count) countUp(el);
      io.unobserve(el);
    }

    items.forEach((el) => io.observe(el));

    const revealInView = () => items.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) reveal(el);
    });

    requestAnimationFrame(revealInView);
    window.addEventListener('load', revealInView);
    window.addEventListener('hashchange', () => setTimeout(revealInView, 100));

    // Safety net — content must never stay invisible because an observer missed.
    window.setTimeout(() => items.forEach(reveal), 6000);
  }

  function countUp(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = '1';
    const target = parseFloat(el.dataset.count) || 0;
    const prefix = el.dataset.prefix || '';   // "$" belongs BEFORE the number
    const suffix = el.dataset.suffix || '';
    const duration = 1500;
    const start = performance.now();
    (function frame(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + Math.round(target * eased).toLocaleString() + suffix;
      if (p < 1) requestAnimationFrame(frame);
    })(start);
  }

  /* ---------- 03. mobile navigation ---------- */
  function initNav() {
    const toggle = $('#navToggle');
    const nav = $('#nav');
    if (!toggle || !nav) return;

    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      nav.classList.toggle('is-open', open);
      document.body.classList.toggle('nav-open', open);
    };

    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', (e) => { if (e.target.closest('a') && window.innerWidth <= 1024) setOpen(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
    });
    document.addEventListener('click', (e) => {
      if (!nav.classList.contains('is-open')) return;
      if (nav.contains(e.target) || toggle.contains(e.target)) return;
      setOpen(false);
    });
    window.addEventListener('resize', () => { if (window.innerWidth > 1024) setOpen(false); });
  }

  /* ---------- 04. sticky header ---------- */
  function initStickyHeader() {
    const header = $('#header');
    if (!header) return;
    const onScroll = () => header.classList.toggle('is-stuck', window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- 05. countdown (optional) ---------- */
  function initCountdown() {
    const box = $('#countdown');
    if (!box) return;
    const deadline = new Date(box.dataset.deadline).getTime();
    if (Number.isNaN(deadline)) return;
    const out = {
      days: $('[data-cd="days"]', box), hours: $('[data-cd="hours"]', box),
      minutes: $('[data-cd="minutes"]', box), seconds: $('[data-cd="seconds"]', box)
    };
    const pad = (n) => String(n).padStart(2, '0');
    function tick() {
      const diff = deadline - Date.now();
      if (diff <= 0) {
        Object.values(out).forEach((el) => el && (el.textContent = '00'));
        box.classList.add('is-expired');
        const note = $('#countdownNote');
        if (note) note.textContent = 'Open enrollment has ended — ask us about Special Enrollment options.';
        window.clearInterval(id);
        return;
      }
      const s = Math.floor(diff / 1000);
      out.days && (out.days.textContent = Math.floor(s / 86400));
      out.hours && (out.hours.textContent = pad(Math.floor(s / 3600) % 24));
      out.minutes && (out.minutes.textContent = pad(Math.floor(s / 60) % 60));
      out.seconds && (out.seconds.textContent = pad(s % 60));
    }
    tick();
    const id = window.setInterval(tick, 1000);
  }

  /* ---------- 06. FAQ accordion ---------- */
  function initAccordion() {
    const items = $$('.acc');
    if (!items.length) return;

    items.forEach((item, i) => {
      const btn = $('.acc__btn', item);
      const panel = $('.acc__panel', item);
      if (!btn || !panel) return;

      const panelId = panel.id || `acc-panel-${i + 1}`;
      panel.id = panelId;
      panel.setAttribute('role', 'region');
      btn.setAttribute('aria-controls', panelId);
      panel.style.height = '0px';

      btn.addEventListener('click', () => {
        const isOpen = btn.getAttribute('aria-expanded') === 'true';
        items.forEach((other) => {
          if (other === item) return;
          const ob = $('.acc__btn', other), op = $('.acc__panel', other);
          if (ob && op && ob.getAttribute('aria-expanded') === 'true') {
            ob.setAttribute('aria-expanded', 'false');
            op.style.height = '0px';
          }
        });
        btn.setAttribute('aria-expanded', String(!isOpen));
        panel.style.height = isOpen ? '0px' : panel.scrollHeight + 'px';
      });

      window.addEventListener('resize', () => {
        if (btn.getAttribute('aria-expanded') === 'true') panel.style.height = panel.scrollHeight + 'px';
      });
    });
  }

  /* ---------- 07. reviews carousel ----------
     The track is duplicated in the markup so the CSS scroll loops seamlessly.
     Pointer drag lets people browse manually; releasing resumes the drift.  */
  function initReviews() {
    const viewport = $('#reviewsViewport');
    const track = $('#reviewsTrack');
    if (!viewport || !track) return;

    let down = false, startX = 0, scrollStart = 0;

    viewport.addEventListener('pointerdown', (e) => {
      down = true;
      startX = e.clientX;
      scrollStart = viewport.scrollLeft;
      track.classList.add('is-paused');
      viewport.setPointerCapture(e.pointerId);
    });
    viewport.addEventListener('pointermove', (e) => {
      if (!down) return;
      viewport.scrollLeft = scrollStart - (e.clientX - startX);
    });
    const release = () => { down = false; track.classList.remove('is-paused'); };
    viewport.addEventListener('pointerup', release);
    viewport.addEventListener('pointercancel', release);
    viewport.addEventListener('pointerleave', release);
  }

  /* ---------- 08. form validation & submission ---------- */
  const RULES = {
    required: (v) => v.trim().length > 0,
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
    phone: (v) => v.trim() === '' || /^[\d\s().+-]{7,}$/.test(v.trim())
  };

  function fieldError(input, message) {
    const wrap = input.closest('.field');
    const slot = document.querySelector(`[data-error-for="${input.id}"]`);
    if (wrap) wrap.classList.toggle('is-invalid', Boolean(message));
    if (slot) slot.textContent = message || '';
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }

  function validateInput(input) {
    const label = (input.labels && input.labels[0]?.textContent.trim()) || 'This field';
    if (input.type === 'checkbox') {
      if (input.required && !input.checked) { fieldError(input, 'Please tick this box to continue.'); return false; }
      fieldError(input, ''); return true;
    }
    if (input.required && !RULES.required(input.value)) { fieldError(input, `${label} is required.`); return false; }
    if (input.type === 'email' && input.value && !RULES.email(input.value)) { fieldError(input, 'Enter a valid email address.'); return false; }
    if (input.type === 'tel' && !RULES.phone(input.value)) { fieldError(input, 'Enter a valid phone number.'); return false; }
    fieldError(input, '');
    return true;
  }

  // Shared submit handler. Replace `deliver()` with a real POST — see README.
  function deliver(payload) {
    // ------------------------------------------------------------------
    // DEMO SUBMISSION — no backend wired up yet.
    // Swap for your handler (Formspree, Netlify Forms, HubSpot, your API):
    //
    //   return fetch('https://your-endpoint', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(payload)
    //   });
    // ------------------------------------------------------------------
    console.log('[Stewart Brokerage] submission (demo):', payload);
    return new Promise((resolve) => setTimeout(resolve, 700));
  }

  function initForms() {
    const forms = $$('form.form, form.newsletter');
    if (!forms.length) return;

    forms.forEach((form) => {
      const inputs = $$('input, select, textarea', form);
      const statusEl = document.getElementById(form.id.replace(/Form$/, '') + 'Status')
        || form.parentElement?.querySelector('.form__status');

      inputs.forEach((input) => {
        input.addEventListener('blur', () => validateInput(input));
        input.addEventListener('input', () => {
          if (input.getAttribute('aria-invalid') === 'true') validateInput(input);
        });
      });

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const results = inputs.map(validateInput);
        if (results.includes(false)) {
          if (statusEl) { statusEl.textContent = 'Please fix the highlighted fields.'; statusEl.className = 'form__status is-err'; }
          inputs[results.indexOf(false)]?.focus();
          return;
        }
        const btn = $('button[type="submit"]', form);
        const label = btn ? btn.textContent : '';
        if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

        deliver(Object.fromEntries(new FormData(form).entries())).then(() => {
          if (btn) { btn.disabled = false; btn.textContent = label; }
          if (statusEl) {
            statusEl.textContent = 'Thanks — we’ve got it. Petrina will be in touch shortly.';
            statusEl.className = 'form__status is-ok';
          }
          form.reset();
          inputs.forEach((i) => fieldError(i, ''));
        });
      });
    });
  }

  /* ---------- 09. quote funnel wizard ----------
     Markup contract:
       #quoteFunnel            wrapper
       .fstep[data-step]       one panel per question
       [data-next] / [data-back]  navigation buttons
       .opt input              radio (single) or checkbox (multi) per question
       #funnelSummary          <ul> filled on the review step
       #progressFill / #progressStep / #progressPct
  --------------------------------------------------------------------------- */
  function initFunnel() {
    const root = $('#quoteFunnel');
    if (!root) return;

    const steps = $$('.fstep', root);
    const fill = $('#progressFill');
    const stepLabel = $('#progressStep');
    const pctLabel = $('#progressPct');
    const summary = $('#funnelSummary');
    const form = $('#quoteForm');
    const status = $('#quoteStatus');
    if (!steps.length) return;

    let index = 0;
    const answers = {};

    // Prefill from ?topic= / ?state= so blog CTAs can seed the funnel.
    const params = new URLSearchParams(window.location.search);
    const seedState = (params.get('state') || '').toUpperCase();

    function show(i) {
      index = Math.max(0, Math.min(i, steps.length - 1));
      steps.forEach((s, n) => s.classList.toggle('is-active', n === index));
      updateProgress();
      if (steps[index].dataset.step === 'review') renderSummary();
      // keep the question in view without yanking the whole page on step 1
      if (index > 0) {
        const top = root.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
      }
      const focusable = steps[index].querySelector('input, select, textarea, button');
      if (focusable && index > 0) setTimeout(() => focusable.focus({ preventScroll: true }), 260);
    }

    function updateProgress() {
      const pct = Math.round(((index + 1) / steps.length) * 100);
      if (fill) fill.style.width = pct + '%';
      if (stepLabel) stepLabel.textContent = `Step ${index + 1} of ${steps.length}`;
      if (pctLabel) pctLabel.textContent = pct + '% complete';
    }

    function collect(step) {
      const key = step.dataset.step;
      const checked = $$('input:checked', step);
      if (checked.length) {
        answers[key] = checked.length === 1 && checked[0].type === 'radio'
          ? checked[0].dataset.label || checked[0].value
          : checked.map((c) => c.dataset.label || c.value);
      }
      $$('input[type="text"], input[type="email"], input[type="tel"], select, textarea', step).forEach((f) => {
        if (f.value.trim()) answers[f.name] = f.value.trim();
      });
    }

    function validateStep(step) {
      // a step with radios requires exactly one selection
      const radios = $$('input[type="radio"]', step);
      if (radios.length && !radios.some((r) => r.checked)) {
        flash(step, 'Pick one option to continue.');
        return false;
      }
      // a step marked data-require-one needs at least one checkbox
      if (step.dataset.requireOne !== undefined) {
        const boxes = $$('input[type="checkbox"]', step);
        if (boxes.length && !boxes.some((b) => b.checked)) {
          flash(step, 'Choose at least one.');
          return false;
        }
      }
      const fields = $$('input[type="text"], input[type="email"], input[type="tel"], select', step);
      const results = fields.map(validateInput);
      if (results.includes(false)) { fields[results.indexOf(false)]?.focus(); return false; }
      return true;
    }

    function flash(step, msg) {
      let el = $('.fstep__err', step);
      if (!el) {
        el = document.createElement('p');
        el.className = 'fstep__err form__status is-err';
        el.setAttribute('role', 'status');
        const nav = $('.fnav', step);
        nav ? step.insertBefore(el, nav) : step.appendChild(el);
      }
      el.textContent = msg;
    }

    function renderSummary() {
      if (!summary) return;
      summary.innerHTML = '';
      const pretty = {
        industry: 'Industry', teamSize: 'Team size', state: 'State',
        current: 'Current coverage', priorities: 'What matters most',
        budget: 'Budget per employee', timing: 'Start date'
      };
      Object.keys(pretty).forEach((k) => {
        if (!answers[k]) return;
        const li = document.createElement('li');
        const val = Array.isArray(answers[k]) ? answers[k].join(', ') : answers[k];
        li.innerHTML = `<span class="k">${pretty[k]}</span><span class="v"></span>`;
        li.querySelector('.v').textContent = val;
        summary.appendChild(li);
      });
    }

    // selecting a radio advances automatically — keeps the funnel moving
    root.addEventListener('change', (e) => {
      const input = e.target;
      if (!input.matches('.opt input')) return;
      const step = input.closest('.fstep');
      const err = $('.fstep__err', step);
      if (err) err.textContent = '';
      if (input.type === 'radio' && step.dataset.autoAdvance !== undefined) {
        collect(step);
        setTimeout(() => show(index + 1), 260);
      }
    });

    root.addEventListener('click', (e) => {
      const next = e.target.closest('[data-next]');
      const back = e.target.closest('[data-back]');
      if (next) {
        e.preventDefault();
        const step = steps[index];
        if (!validateStep(step)) return;
        collect(step);
        show(index + 1);
      }
      if (back) { e.preventDefault(); show(index - 1); }
    });

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const step = steps[index];
        const fields = $$('input, select, textarea', step);
        const results = fields.map(validateInput);
        if (results.includes(false)) {
          if (status) { status.textContent = 'Please fix the highlighted fields.'; status.className = 'form__status is-err'; }
          fields[results.indexOf(false)]?.focus();
          return;
        }
        collect(step);
        const btn = $('button[type="submit"]', form);
        const label = btn ? btn.textContent : '';
        if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

        deliver({ ...answers, source: 'quote-funnel', page: window.location.pathname }).then(() => {
          if (btn) { btn.disabled = false; btn.textContent = label; }
          const done = $('#funnelDone');
          if (done) {
            steps.forEach((s) => s.classList.remove('is-active'));
            done.hidden = false;
            if (fill) fill.style.width = '100%';
            if (stepLabel) stepLabel.textContent = 'Done';
            if (pctLabel) pctLabel.textContent = '100% complete';
            const top = root.getBoundingClientRect().top + window.scrollY - 100;
            window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
          } else if (status) {
            status.textContent = 'Thanks — your request is in.';
            status.className = 'form__status is-ok';
          }
        });
      });
    }

    // seed the state question from ?state=FL|TX|NV
    if (seedState) {
      const match = $$('.fstep[data-step="state"] .opt input').find((i) => (i.value || '').toUpperCase() === seedState);
      if (match) match.checked = true;
    }

    show(0);
  }

  /* ---------- 10. back-to-top + year ---------- */
  function initToTop() {
    const btn = $('#toTop');
    if (!btn) return;
    const onScroll = () => btn.classList.toggle('is-visible', window.scrollY > 500);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));
  }

  function initYear() {
    $$('#year, .js-year').forEach((el) => { el.textContent = new Date().getFullYear(); });
  }

  /* ---------- 11. photo slots ----------
     Every <figure class="photo" data-photo="…"> shows a labelled placeholder until a real
     image is dropped in. Drop a file at the src path and the placeholder disappears — no
     markup change needed. Fails safe in both directions. */
  function initPhotoSlots() {
    $$('figure.photo').forEach((fig) => {
      const img = fig.querySelector('img');
      if (!img) { fig.classList.add('is-empty'); return; }

      const markEmpty = () => fig.classList.add('is-empty');
      const markFilled = () => fig.classList.remove('is-empty');

      // complete + naturalWidth 0 means it already failed before this ran
      if (img.complete) {
        img.naturalWidth > 0 ? markFilled() : markEmpty();
      } else {
        img.addEventListener('load', markFilled, { once: true });
        img.addEventListener('error', markEmpty, { once: true });
      }
    });
  }


  /* ---------- 11. live Google reviews ----------------------------------
     Pulls real reviews from the Google Business Profile and renders them in
     place of the proof cards. Leave PLACE_ID empty and the proof cards stay,
     so the section is never blank and never shows invented reviews.

     TO TURN ON:
       1. Google Cloud console -> enable "Places API (New)"
       2. Create an API key, then RESTRICT it:
            Application restriction -> Websites -> thestewartbrokerage.com/*
            API restriction        -> Places API (New) only
          The key sits in this file, which is only acceptable because of those
          restrictions. Without them anyone can run up the bill.
       3. Get the Place ID:
          developers.google.com/maps/documentation/places/web-service/place-id
       4. Fill both values below.

     Google returns at most 5 reviews and they cannot be reordered or cherry
     picked, which is precisely why visitors trust them.
     --------------------------------------------------------------------- */
  const GOOGLE_REVIEWS = {
    PLACE_ID: '',   // e.g. 'ChIJ...'
    API_KEY: '',    // referrer-restricted key
    MIN_RATING: 4   // never display anything below this
  };

  function grStars(n) {
    var star = '<svg viewBox="0 0 24 24"><path d="m12 2 3 6.5 7 .9-5 4.9 1.2 7L12 18l-6.2 3.3L7 14.3l-5-4.9 7-.9Z"/></svg>';
    return '<span class="stars" aria-hidden="true">' + star.repeat(Math.round(n)) + '</span>' +
           '<span class="sr-only">' + n + ' out of 5 stars</span>';
  }

  function grCard(r) {
    var attr = r.authorAttribution || {};
    var name = attr.displayName || 'Google user';
    var initials = name.split(/\s+/).slice(0, 2).map(function (w) { return w[0] || ''; }).join('').toUpperCase();
    var text = (r.originalText && r.originalText.text) || (r.text && r.text.text) || '';
    var when = r.relativePublishTimeDescription || '';
    var avatar = attr.photoUri
      ? '<img class="review__avatar" src="' + attr.photoUri + '" alt="" width="44" height="44" loading="lazy" />'
      : '<span class="review__avatar" aria-hidden="true">' + initials + '</span>';

    var el = document.createElement('article');
    el.className = 'review';
    el.innerHTML =
      '<div class="review__top">' + avatar +
      '<span class="review__who"><strong></strong><span></span></span>' +
      grStars(r.rating || 5) + '</div>' +
      '<blockquote></blockquote>' +
      '<p class="review__src">Google Review</p>';

    // Author name and body are set as text, never as markup. These strings come
    // from the open internet and must not be able to inject anything.
    el.querySelector('.review__who strong').textContent = name;
    el.querySelector('.review__who span').textContent = when;
    el.querySelector('blockquote').textContent = text;
    return el;
  }

  function initGoogleReviews() {
    var track = $('#reviewsTrack');
    if (!track || !GOOGLE_REVIEWS.PLACE_ID || !GOOGLE_REVIEWS.API_KEY) return;

    fetch('https://places.googleapis.com/v1/places/' + encodeURIComponent(GOOGLE_REVIEWS.PLACE_ID), {
      headers: {
        'X-Goog-Api-Key': GOOGLE_REVIEWS.API_KEY,
        'X-Goog-FieldMask': 'rating,userRatingCount,googleMapsUri,reviews'
      }
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Places API ' + res.status);
        return res.json();
      })
      .then(function (data) {
        var reviews = (data.reviews || []).filter(function (r) {
          return (r.rating || 0) >= GOOGLE_REVIEWS.MIN_RATING;
        });
        if (!reviews.length) return;                 // keep the proof cards

        track.replaceChildren.apply(track, reviews.map(grCard));

        var rating = $('#reviewsRating'), none = $('#reviewsNoRating');
        if (rating && data.rating) {
          var score = rating.querySelector('[data-gr="score"]');
          var count = rating.querySelector('[data-gr="count"]');
          if (score) score.textContent = Number(data.rating).toFixed(1);
          if (count && data.userRatingCount) count.textContent = '(' + data.userRatingCount + ' reviews)';
          rating.hidden = false;
          if (none) none.hidden = true;
        }
        if (data.googleMapsUri) {
          $$('a[data-gr-link]').forEach(function (a) { a.href = data.googleMapsUri; });
        }
      })
      .catch(function (err) {
        // network down, quota hit, bad key — the proof cards are already on screen
        console.warn('[Stewart] Google reviews unavailable, showing proof cards:', err.message);
      });
  }

  /* ---------- boot ---------- */
  function init() {
    initPhotoSlots();
    initNav();
    initStickyHeader();
    initCountdown();
    initReveal();
    initAccordion();
    initReviews();
    initForms();
    initFunnel();
    initToTop();
    initYear();
    initGoogleReviews();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
