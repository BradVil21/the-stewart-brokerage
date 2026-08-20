# The Stewart Brokerage — Website

Marketing site for **The Stewart Brokerage**, a group health insurance brokerage serving business
owners, professional groups, and medical teams.

Built as a plain static site — no build step, no framework, no dependencies. HTML, CSS, and
JavaScript live in separate files so each one is easy to find and edit.

---

## Project structure

```
the-stewart-brokerage/
├── index.html          # Home — hero carousel, industries, comparison, services, FAQ
├── services.html       # Services detail page
├── contact.html        # Contact page with the full quote-request form
├── css/
│   └── styles.css      # All styles (design tokens at the top, sections numbered 01–20)
├── js/
│   └── main.js         # All behaviour (numbered modules 01–09)
├── assets/
│   └── favicon.svg     # Site icon / logo mark
├── .vscode/
│   ├── settings.json   # Editor defaults for this project
│   └── extensions.json # Recommended extensions
├── .gitignore
├── package.json
└── README.md
```

---

## Running it locally

### Option A — VS Code Live Server (easiest)

1. Open this folder in VS Code (`File → Open Folder…`).
2. When prompted, install the recommended extensions (or search for **Live Server** by Ritwick Dey).
3. Right-click `index.html` → **Open with Live Server**.

The site opens at `http://127.0.0.1:5500` and reloads on every save.

### Option B — Node

```bash
npm run dev
```

Serves the folder at `http://localhost:3000`.

### Option C — Python

```bash
python3 -m http.server 3000
```

> Opening `index.html` directly with `file://` mostly works, but a local server is closer to how the
> site will actually behave once deployed.

---

## Before you launch — placeholders to replace

Everything below is intentionally fake. Search the project for these strings and swap them out.

| What | Placeholder | Where |
|---|---|---|
| Phone | `+15550000000` / `+1 (555) 000-0000` | all three HTML files (top bar, nav, footer, CTAs) |
| Email | `quotes@thestewartbrokerage.com` | footer + contact page |
| City / state | `Sunrise, Florida` | top bar, footer, contact page |
| Social links | `href="#"` on LinkedIn / Facebook | top bar + footer |
| Stats | `data-count` values in the stats section | `index.html` |
| Enrollment deadline | `data-deadline="2027-01-15T23:59:59"` | `index.html`, countdown block |
| Map | "Map placeholder" block | `contact.html` |
| Domain | `https://thestewartbrokerage.com/` in the `og:url` tag | `index.html` |

Testimonials use initials rather than full names — replace them with real, permissioned quotes
before going live.

### Wiring up the forms

Forms currently validate client-side and then fake a successful submission (they log to the console).
To make them real, open `js/main.js`, find **module 08** and replace the `DEMO SUBMISSION` block with a
POST to your handler. Any of these work with zero backend:

- [Formspree](https://formspree.io) — change the `<form>` to `action="https://formspree.io/f/XXXX" method="POST"`
- [Netlify Forms](https://docs.netlify.com/forms/setup/) — add `netlify` to the `<form>` tag
- HubSpot Forms API, or your own endpoint

---

## Design system

Colors, spacing, radii, and shadows are all CSS custom properties defined at the top of
`css/styles.css` under `:root`. Changing the brand palette is a four-line edit:

```css
--navy-900: #061428;   /* darkest brand tone — footer, dark sections */
--navy-800: #0a1f3d;   /* primary brand tone — buttons, headings */
--gold-500: #c9a961;   /* accent — CTAs, highlights, underlines */
--tint:     #f4f1ea;   /* alternating section background */
```

Type is **Fraunces** (display) + **Inter** (body), loaded from Google Fonts.

## Features

- Sticky header with a slide-in mobile drawer (Escape / click-outside / link-click all close it)
- Auto-playing hero carousel — pauses on hover, focus, and when the tab is hidden; arrow-key and
  swipe support
- Live open-enrollment countdown driven by one `data-deadline` attribute
- Scroll-triggered reveal animations and animated stat counters via `IntersectionObserver`
- Single-open FAQ accordion with proper `aria-expanded` / `aria-controls`
- Accessible client-side form validation with inline, per-field error messages
- Full `prefers-reduced-motion` support — every animation is disabled when the OS asks for it
- Skip link, visible focus rings, semantic landmarks, and a print stylesheet

## Browser support

Modern evergreen browsers (Chrome, Edge, Firefox, Safari). Uses `IntersectionObserver`,
CSS custom properties, `backdrop-filter`, and CSS Grid.

---

## Deploying

Any static host works. No build step required — point it at the repository root.

- **GitHub Pages** — repo *Settings → Pages → Source: Deploy from a branch → `main` / root*
- **Netlify** — drag the folder in, or connect the repo; leave the build command empty and set the
  publish directory to `/`
- **Vercel** — import the repo and select "Other" as the framework preset
- **Cloudflare Pages** — connect the repo, no build command, output directory `/`

---

© The Stewart Brokerage. This site is for informational purposes and is not a contract of insurance.
