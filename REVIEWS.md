# Testimonials — how this section works

The reviews section on `index.html` and `quote.html` has two states and switches
between them on its own.

**State 1 — proof cards (what's live now).** Six cards in the review layout,
each stating something a visitor can independently verify: independence, state
licensing, scope, compensation, service model, carrier panel. Nothing here is
invented, so it can ship today.

**State 2 — real Google reviews.** As soon as the Google config is filled in,
`initGoogleReviews()` in `js/main.js` fetches the real reviews, swaps them into
the same cards, and reveals the star rating badge. The proof cards disappear
automatically. If the API is unreachable, over quota, or returns nothing, the
proof cards stay on screen — the section can never end up blank.

---

## Turning on live reviews

1. **Create the Google Business Profile** if it doesn't exist yet, at
   `business.google.com`. Verification takes a few days by postcard or phone.

2. **Enable the API.** Google Cloud console → APIs & Services → enable
   **Places API (New)**.

3. **Create an API key and restrict it.** This part is not optional:

   | Setting | Value |
   |---|---|
   | Application restriction | Websites → `thestewartbrokerage.com/*` |
   | API restriction | Places API (New) only |

   The key is visible in `main.js`. That is acceptable *only* with both
   restrictions set — an unrestricted key can be lifted off the page and used to
   run up a bill on your account.

4. **Find the Place ID** at
   `developers.google.com/maps/documentation/places/web-service/place-id`.

5. **Fill in the config** at the top of module 11 in `js/main.js`:

   ```js
   const GOOGLE_REVIEWS = {
     PLACE_ID: 'ChIJ...',
     API_KEY: 'AIza...',
     MIN_RATING: 4
   };
   ```

Google returns at most five reviews, and they cannot be reordered or cherry
picked. That constraint is the whole reason visitors trust them.

---

## Getting the first reviews

Most brokers get 5–10 within two weeks of asking once. The ask has to be
specific, easy, and sent at the right moment — right after enrollment closes, or
right after you have sorted out a claim problem for someone.

Get the review link from your Google Business Profile: **Ask for reviews** →
copy link. It looks like `g.page/r/XXXX/review`.

### Email

> Subject: Quick favour, {FirstName}?
>
> Hi {FirstName},
>
> Now that {Company}'s plan is up and running, would you mind leaving a short
> Google review? Most of the small businesses I work with found me because
> someone else took two minutes to do this.
>
> Here's the link: {REVIEW_LINK}
>
> Anything at all is useful — even a sentence or two on what the process was
> like or what you were dealing with before.
>
> Thanks either way,
> Petrina

### Text

> Hi {FirstName}, Petrina here. Glad the plan is sorted. If you have 2 minutes,
> a quick Google review would genuinely help other owners find me: {REVIEW_LINK}
> — no worries if not.

### What makes reviews land

The useful ones name a specific problem and a specific outcome — "premiums went
up 22% at renewal and we had four people on the plan" beats "great service."
When someone offers a compliment on a call, that's the moment to say: *would you
be willing to put that in a Google review?*

### What you can't do

- Offer anything of value in exchange for a review — gift cards, discounts,
  entries into a draw. It's an FTC violation and against Google's policy.
- Ask only the clients you expect to be happy. Review gating is illegal.
- Write reviews yourself, have staff or family write them, or buy them.

Under the FTC Rule on Consumer Reviews and Testimonials (16 CFR Part 465),
penalties are assessed **per violation**, and Google suspends profiles over it.
The downside is not worth the shortcut, especially against a producer licence.

---

## Using written testimonials instead

If a client would rather send you a note than post publicly, that's still
usable — you just need permission on the record.

1. Get it in writing: *"Happy for you to use this on your website with my first
   name, last initial, and business type."*
2. Publish it as sent. No editing for punch.
3. Attribute it honestly — "Client testimonial", not "Google Review", and don't
   put it under a star rating unless they actually gave one.
4. Keep the permission email. If anyone ever asks, that file is the answer.

The proof cards in `index.html` show the markup pattern — copy one `<article
class="review">` block and swap the content.
