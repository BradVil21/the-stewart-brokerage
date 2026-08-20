/* ==========================================================================
   The Stewart Brokerage — main.js
   --------------------------------------------------------------------------
   Vanilla JS, no dependencies. Each feature is an isolated init() that
   safely no-ops when its markup isn't on the page, so this one file can be
   shared across index.html, services.html and contact.html.

   Modules
   01. helpers
   02. mobile navigation
   03. sticky header shadow
   04. hero carousel
   05. enrollment countdown
   06. scroll reveal + animated stat counters
   07. FAQ accordion
   08. form validation & submission
   09. back-to-top + footer year
   ========================================================================== */

(function () {
  'use strict';

  /* ---------- 01. helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 02. mobile navigation ---------- */
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

    toggle.addEventListener('click', () => {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    // close on link click (mobile) and on Escape
    nav.addEventListener('click', (e) => {
      if (e.target.closest('a') && window.innerWidth <= 1024) setOpen(false);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });

    // click outside to close
    document.addEventListener('click', (e) => {
      if (!nav.classList.contains('is-open')) return;
      if (nav.contains(e.target) || toggle.contains(e.target)) return;
      setOpen(false);
    });

    // reset state when resizing up to desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth > 1024) setOpen(false);
    });
  }

  /* ---------- 03. sticky header shadow ---------- */
  function initStickyHeader() {
    const header = $('#header');
    if (!header) return;
    const onScroll = () => header.classList.toggle('is-stuck', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- 04. hero carousel ---------- */
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

    // build dots
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
        s.classList.toggle('is-active', active);
        s.hidden = !active;
      });
      dots.forEach((d, n) => {
        d.classList.toggle('is-active', n === index);
        d.setAttribute('aria-selected', String(n === index));
      });
    }

    function start() {
      if (prefersReducedMotion) return;
      timer = window.setInterval(() => go(index + 1), DELAY);
    }
    function stop() { window.clearInterval(timer); }
    function restart() { stop(); start(); }

    prev && prev.addEventListener('click', () => { go(index - 1); restart(); });
    next && next.addEventListener('click', () => { go(index + 1); restart(); });

    // pause on hover / when tab hidden
    wrap.addEventListener('mouseenter', stop);
    wrap.addEventListener('mouseleave', start);
    wrap.addEventListener('focusin', stop);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

    // keyboard arrows
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { go(index - 1); restart(); }
      if (e.key === 'ArrowRight') { go(index + 1); restart(); }
    });

    // touch swipe
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

  /* ---------- 05. enrollment countdown ---------- */
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

  /* ---------- 06. scroll reveal + stat counters ---------- */
  function initReveal() {
    const items = $$('.reveal, .step, .stat__num');
    if (!items.length) return;

    if (!('IntersectionObserver' in window) || prefersReducedMotion) {
      items.forEach((el) => {
        el.classList.add('is-visible');
        if (el.dataset.count) el.textContent = el.dataset.count + (el.dataset.suffix || '');
      });
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add('is-visible');
        if (el.dataset.count) countUp(el);
        io.unobserve(el);
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -60px 0px' });

    items.forEach((el) => io.observe(el));
  }

  function countUp(el) {
    const target = parseFloat(el.dataset.count) || 0;
    const suffix = el.dataset.suffix || '';
    const duration = 1600;
    const startTime = performance.now();

    function frame(now) {
      const p = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.textContent = Math.round(target * eased).toLocaleString() + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------- 07. FAQ accordion ---------- */
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

        // close siblings (single-open accordion)
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

      // keep an open panel correctly sized on resize
      window.addEventListener('resize', () => {
        if (btn.getAttribute('aria-expanded') === 'true') {
          panel.style.height = panel.scrollHeight + 'px';
        }
      });
    });
  }

  /* ---------- 08. form validation & submission ---------- */
  const RULES = {
    required: (v) => v.trim().length > 0,
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
    phone: (v) => v.trim() === '' || /^[\d\s().+-]{7,}$/.test(v.trim())
  };

  function fieldError(input, message) {
    const wrap = input.closest('.field') || input.closest('.checkbox')?.parentElement;
    const slot = document.querySelector(`[data-error-for="${input.id}"]`);
    if (wrap && wrap.classList) wrap.classList.toggle('is-invalid', Boolean(message));
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
    if (input.required && !RULES.required(input.value)) {
      fieldError(input, `${label} is required.`); return false;
    }
    if (input.type === 'email' && input.value && !RULES.email(input.value)) {
      fieldError(input, 'Enter a valid email address.'); return false;
    }
    if (input.type === 'tel' && !RULES.phone(input.value)) {
      fieldError(input, 'Enter a valid phone number.'); return false;
    }
    fieldError(input, '');
    return true;
  }

  function initForms() {
    const forms = $$('form.form, form.newsletter');
    if (!forms.length) return;

    forms.forEach((form) => {
      const inputs = $$('input, select, textarea', form);
      const statusEl = document.getElementById(form.id + 'Status')
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
        const firstBad = inputs[results.indexOf(false)];

        if (results.includes(false)) {
          if (statusEl) {
            statusEl.textContent = 'Please fix the highlighted fields.';
            statusEl.className = 'form__status is-err';
          }
          firstBad && firstBad.focus();
          return;
        }

        // ------------------------------------------------------------------
        // DEMO SUBMISSION
        // There is no backend wired up yet. Replace the block below with a
        // real POST to your form handler (Formspree, Netlify Forms, HubSpot,
        // your own API, etc.). Example:
        //
        //   const data = Object.fromEntries(new FormData(form).entries());
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

  /* ---------- 09. back-to-top + year ---------- */
  function initToTop() {
    const btn = $('#toTop');
    if (!btn) return;
    const onScroll = () => btn.classList.toggle('is-visible', window.scrollY > 500);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
