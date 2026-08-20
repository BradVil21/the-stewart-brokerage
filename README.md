# The Stewart Brokerage — Website

Marketing site for **The Stewart Brokerage**, an independent health insurance brokerage serving
**small businesses only** in **Florida, Texas, and Nevada**.

Plain static site — no build step, no framework, no dependencies. HTML, CSS, and JavaScript are in
separate files.

---

## Structure

```
the-stewart-brokerage/
├── index.html                  # Home
├── quote.html                  # ⭐ The quote funnel — every CTA points here
├── services.html               # Coverage options
├── blog.html                   # Resources hub
├── contact.html                # Contact
├── blog/
│   ├── small-business-health-insurance-florida.html
│   ├── small-business-health-insurance-texas.html
│   ├── small-business-health-insurance-nevada.html
│   ├── small-business-health-insurance-cost-2026.html
│   ├── how-many-employees-group-health-plan.html
│   └── level-funded-vs-fully-insured-small-business.html
├── css/styles.css              # All styles (tokens at top, sections 01–21)
├── js/main.js                  # All behaviour (modules 01–10)
├── assets/
│   ├── favicon.svg
│   └── carriers/               # ⚠️ placeholder logos — see below
├── robots.txt
├── sitemap.xml
└── .vscode/
```

---

## Running locally

**VS Code Live Server** — right-click `index.html` → *Open with Live Server*.

**Node** — `npm run dev` (serves at `localhost:3000`).

**Python** — `python3 -m http.server 3000`.

> Use a local server rather than opening the file directly. `file://` breaks the relative paths in
> `blog/`.

---

## ⚠️ Before launch — required replacements

### 1. Carrier logos (`assets/carriers/`)

Every file in there right now is a **grey placeholder wordmark**. Drop the real transparent
PNG or SVG logos in using these **exact filenames** and the carousel picks them up automatically:

```
aetna.svg           ambetter.svg        anthem-bcbs.svg
bluecross-blueshield.svg                cigna.svg
florida-blue.svg    humana.svg          kaiser-permanente.svg
molina.svg          oscar.svg           unitedhealthcare.svg
```

`.png` works too — just change the extension in the `<img src>` tags in `index.html` and
`services.html`. Use transparent backgrounds; the CSS desaturates them at rest and brings full
colour back on hover.

**Only display carriers you are actually appointed with.** Showing a carrier logo you cannot
place business with is a compliance problem in every state, not just a design choice.

### 2. Reviews (`index.html`, `quote.html`, `services.html` — the `.reviews` section)

Every review in there is **fake placeholder text** and is clearly marked as such in an HTML
comment. So is the "5.0 on Google" badge.

Replace them with real, permissioned reviews before this goes live. Publishing invented reviews as
genuine is illegal under the FTC Rule on Consumer Reviews and Testimonials (16 CFR Part 465) — the
penalties are per-violation — and it will get a Google Business Profile suspended.

To pull real reviews automatically, use the Google Places API `place_details` endpoint and render
the `reviews` array into the same markup.

### 3. Other placeholders

| What | Current value | Where |
|---|---|---|
| Domain | `https://thestewartbrokerage.com` | `sitemap.xml`, `robots.txt`, every canonical + JSON-LD |
| Social links | `href="#"` | footer, both icons |
| "Read more reviews" links | `href="#"` | reviews section |
| Stats | `data-count` attributes | `index.html` stats section |

The email `petrina@thestewartbrokerage.com` is live throughout — no change needed.

### 4. Wire up the forms

All forms validate client-side then **fake** a successful submission (they log to the console).
Open `js/main.js`, find the `deliver()` function in module 08, and replace the demo block with a
real POST. Zero-backend options:

- [Formspree](https://formspree.io) — swap `deliver()` for a `fetch` to your form endpoint
- [Netlify Forms](https://docs.netlify.com/forms/setup/) — add `netlify` to each `<form>` tag
- HubSpot Forms API, or your own endpoint

`deliver()` is shared by the contact form, the newsletter, and the quote funnel, so you only have
to change it in one place.

---

## The quote funnel (`quote.html`)

This is the conversion page. Every CTA on the site, every blog post, and both inline article CTAs
route here.

**Nine steps:** industry → team size → state → current coverage → priorities (multi-select) →
budget → timing → review → contact details.

Notes:

- Radio steps **auto-advance** on selection, and also have a Continue button so nothing dead-ends.
- Blog CTAs deep-link with `?state=FL` / `?state=TX` / `?state=NV`, which pre-selects the state step.
- The review step renders a summary of everything chosen so far, and Back preserves all answers.
- The whole payload is submitted as one object — see `initFunnel()` in `js/main.js`.

To add or reorder a question, copy a `<section class="fstep" data-step="...">` block. The wizard
counts steps automatically, so the progress bar needs no updating.

---

## SEO

Targeting **small business health insurance** in **Florida, Texas, and Nevada**.

- Unique title + meta description per page, all within display limits
- Canonical URLs and Open Graph / Twitter Card tags throughout
- JSON-LD: `InsuranceAgency` (with `areaServed` FL/TX/NV) on the home page, plus `FAQPage`,
  `BlogPosting`, `BreadcrumbList`, `Service`, `ContactPage`, and `Blog` where relevant
- One `<h1>` per page, semantic heading hierarchy, descriptive alt text
- `sitemap.xml` and `robots.txt` at the root
- Internal linking: state guides ↔ home state cards ↔ quote funnel

**After you deploy:** submit `sitemap.xml` in Google Search Console, and create a Google Business
Profile — for a local service business that drives more traffic than anything on this list.

---

## Design system

Everything is a CSS custom property at the top of `css/styles.css`. Changing the palette is a
handful of lines:

```css
--navy-800: #0b2545;   /* headings, footer, dark bands */
--blue-500: #2e7df6;   /* buttons, links, accents      */
--sky-50:   #f5f9ff;   /* alternating section bg       */
--amber-500:#ffb020;   /* star ratings                 */
```

Type is **DM Sans**, loaded from Google Fonts.

## Features

- Sticky header that shrinks on scroll, slide-in mobile drawer (Esc / click-outside / link closes)
- Nine-step quote wizard with progress bar, validation, and a review step
- Auto-scrolling carrier logo carousel and draggable reviews carousel
- Scroll reveal animations with word-by-word headings and staggered grids
- Accessible client-side validation with inline per-field errors
- Full `prefers-reduced-motion` support and a print stylesheet
- Skip link, visible focus rings, semantic landmarks, ARIA on all interactive components

**Reveal animations fail open.** Hidden state uses `opacity`, not `visibility`, and `main.js` runs a
6-second safety sweep plus a `hashchange` handler — so content can never get stuck invisible if an
IntersectionObserver misses.

## Browser support

Modern evergreen browsers. Uses IntersectionObserver, CSS custom properties, `backdrop-filter`,
CSS Grid, and `:has()` (progressive enhancement only — nothing breaks without it).

---

## Deploying

Any static host. No build step; point it at the repository root.

- **GitHub Pages** — *Settings → Pages → Deploy from a branch → `main` / root*
- **Netlify / Vercel / Cloudflare Pages** — connect the repo, no build command, output directory `/`

---

© The Stewart Brokerage. This site is for general information only and is not a contract of
insurance. Plan availability, eligibility, benefits and pricing vary by carrier, state, group size
and effective date.
