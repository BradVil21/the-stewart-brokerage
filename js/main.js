/* ==========================================================================
   The Stewart Brokerage — main.js
   --------------------------------------------------------------------------
   Vanilla JS, no dependencies. Each feature is an isolated init() that safely
   no-ops when its markup isn't on the page, so this one file is shared across
   index.html, services.html and contact.html.

   Modules
   01. helpers
   02. reveal engine  (block / seq / word — matches the reference site's motion)
   03. mobile navigation
   04. sticky header
   05. hero carousel
   06. enrollment countdown
   07. stat counters
   08. FAQ accordion
   09. form validation & submission
   10. back-to-top + footer year
   ========================================================================== */

(function () {
  'use strict';

  /* ---------- 01. helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Marks the document as JS-capable. The CSS only hides pre-animation content
  // under `.js`, so with JavaScript off everything stays visible.
  document.documentElement.classList.add('js');

  /* ---------- 02. reveal engine ----------
     Motion spec lifted from the reference design:
       travel   60px
       duration 0.75s
       easing   ease
     Three orchestration modes, set via data-anim:
       block  — the element fades up as one unit
       fade   — opacity only
       left / right — horizontal entrance
       seq    — direct children stagger in
       word   — heading animates word by word
  --------------------------------------------------------------------------- */
  const STAGGER_SEQ = 120;   // ms between sequential children
  const STAGGER_WORD = 45;   // ms between words

  function prepareWordAnimation(el) {
    if (el.dataset.animPrepared) return;
    // Walk text nodes only, so inline markup (<em>, <span class="accent">) survives.
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) {
      if (walker.currentNode.nodeValue.trim()) textNodes.push(walker.currentNode);
    }
    textNodes.forEach((node) => {
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
    $$('.anim-word', el).forEach((w, i) => {
      w.style.setProperty('--d', (i * STAGGER_WORD) + 'ms');
    });
    el.dataset.animPrepared = '1';
  }

  function prepareSequence(el) {
    if (el.dataset.animPrepared) return;
    Array.from(el.children).forEach((child, i) => {
      child.style.setProperty('--d', (i * STAGGER_SEQ) + 'ms');
    });
    el.dataset.animPrepared = '1';
  }

  function initReveal() {
    const items = $$('[data-anim], .step, .stat__num');
    if (!items.length) return;

    // Pre-split words / assign stagger delays before anything becomes visible.
    $$('[data-anim="word"]').forEach(prepareWordAnimation);
    $$('[data-anim="seq"]').forEach(prepareSequence);

    const showAll = () => items.forEach((el) => {
      el.classList.add('is-visible');
      if (el.dataset.count) el.textContent = el.dataset.count + (el.dataset.suffix || '');
    });

    if (reduceMotion || !('IntersectionObserver' in window)) { showAll(); return; }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add('is-visible');
        if (el.dataset.count) countUp(el);
        io.unobserve(el);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -80px 0px' });

    items.forEach((el) => io.observe(el));

    const reveal = (el) => {
      if (el.classList.contains('is-visible')) return;
      el.classList.add('is-visible');
      if (el.dataset.count) countUp(el);
      io.unobserve(el);
    };

    // Anything already in view on load reveals immediately rather than waiting
    // for a scroll event — matters for the hero on short viewports.
    requestAnimationFrame(() => {
      items.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) reveal(el);
      });
    });

    // Landing on an in-page anchor (e.g. /index.html#faq) skips past sections
    // without ever scrolling through them, so reveal whatever is on screen.
    const revealInView = () => items.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) reveal(el);
    });
    window.addEventListener('hashchange', () => setTimeout(revealInView, 100));
    window.addEventListener('load', revealInView);

    // Safety net. If an observer never fires — a stale browser, an oddly sized
    // viewport, a print stylesheet — content must not stay invisible forever.
    window.setTimeout(() => items.forEach(reveal), 6000);
  }

  function countUp(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = '1';
    const target = parseFloat(el.dataset.count) || 0;
    const suffix = el.dataset.suffix || '';
    const duration = 1600;
    const start = performance.now();
    (function frame(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString() + suffix;
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

    nav.addEventListener('click', (e) => {
      if (e.target.closest('a') && window.innerWidth <= 1024) setOpen(false);
    });

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

  /* ---------- 05. hero carousel ---------- */
  function initHero() {
    const wrap = $('#heroSlides');
    if (!wrap) return;

    const slides = $$('.hero__slide', wrap);
    const dotsBox = $('#heroDots');
    const prev = $('#heroPrev');
    const next = $('#heroNext');
    if (slides.length < 2) return;

    let index = 0;
    let timer = null;
    const DELAY = 7000;

    const dots = slides.map((_, i) => {
      const b = document.createElement('button');
      b.className = 'hero__dot';
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', `Show slide ${i + 1}`);
      b.addEventListener('click', () => { go(i); restart(); });
      dotsBox && dotsBox.appendChild(b);
      return b;
    });

    function go(i) {
      index = (i + slides.length) % slides.length;
      slides.forEach((s, n) => {
        const active = n === index;
        s.hidden = !active;
        if (active) replay(s);
      });
      dots.forEach((d, n) => {
        d.classList.toggle('is-active', n === index);
        d.setAttribute('aria-selected', String(n === index));
      });
    }

    // Re-trigger the reveal animation each time a slide comes back into view,
    // so slide 2 and 3 animate in the same way slide 1 did on load.
    function replay(slide) {
      if (reduceMotion) return;
      $$('[data-anim]', slide).forEach((el) => {
        el.classList.remove('is-visible');
        void el.offsetWidth; // force reflow so the animation restarts
        el.classList.add('is-visible');
      });
    }

    function start() { if (!reduceMotion) timer = window.setInterval(() => go(index + 1), DELAY); }
    function stop() { window.clearInterval(timer); }
    function restart() { stop(); start(); }

    prev && prev.addEventListener('click', () => { go(index - 1); restart(); });
    next && next.addEventListener('click', () => { go(index + 1); restart(); });

    wrap.addEventListener('mouseenter', stop);
    wrap.addEventListener('mouseleave', start);
    wrap.addEventListener('focusin', stop);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { go(index - 1); restart(); }
      if (e.key === 'ArrowRight') { go(index + 1); restart(); }
    });

    let startX = null;
    wrap.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    wrap.addEventListener('touchend', (e) => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 45) { go(dx < 0 ? index + 1 : index - 1); restart(); }
      startX = null;
    });

    go(0);
    start();
  }

  /* ---------- 06. enrollment countdown ---------- */
  function initCountdown() {
    const box = $('#countdown');
    if (!box) return;

    const deadline = new Date(box.dataset.deadline).getTime();
    if (Number.isNaN(deadline)) return;

    const out = {
      days: $('[data-cd="days"]', box),
      hours: $('[data-cd="hours"]', box),
      minutes: $('[data-cd="minutes"]', box),
      seconds: $('[data-cd="seconds"]', box)
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

  /* ---------- 08. FAQ accordion ---------- */
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
          const ob = $('.acc__btn', other);
          const op = $('.acc__panel', other);
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

  /* ---------- 09. form validation & submission ---------- */
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
          const firstBad = inputs[results.indexOf(false)];
          firstBad && firstBad.focus();
          return;
        }

        // ------------------------------------------------------------------
        // DEMO SUBMISSION — no backend is wired up yet.
        // Replace this block with a real POST to your form handler
        // (Formspree, Netlify Forms, HubSpot, your own API). Example:
        //
        //   const res = await fetch('https://your-endpoint', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(data)
        //   });
        // ------------------------------------------------------------------
        const data = Object.fromEntries(new FormData(form).entries());
        console.log('[Stewart Brokerage] form submission (demo):', data);

        const btn = $('button[type="submit"]', form);
        const originalText = btn ? btn.textContent : '';
        if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

        window.setTimeout(() => {
          if (btn) { btn.disabled = false; btn.textContent = originalText; }
          if (statusEl) {
            statusEl.textContent = 'Thanks — your request is in. We’ll be in touch shortly.';
            statusEl.className = 'form__status is-ok';
          }
          form.reset();
          inputs.forEach((i) => fieldError(i, ''));
        }, 700);
      });
    });
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
    const el = $('#year');
    if (el) el.textContent = new Date().getFullYear();
  }

  /* ---------- boot ---------- */
  function init() {
    initNav();
    initStickyHeader();
    initHero();
    initCountdown();
    initReveal();
    initAccordion();
    initForms();
    initToTop();
    initYear();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
