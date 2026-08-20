# Carrier logos

Every file here is a **grey placeholder wordmark**. Replace each with the real transparent logo
using the **same filename** and the "A-rated carriers" carousel picks it up automatically.

```
aetna.svg      ambetter.svg       anthem-bcbs.svg   bluecross-blueshield.svg
cigna.svg      florida-blue.svg   humana.svg        kaiser-permanente.svg
molina.svg     oscar.svg          unitedhealthcare.svg
```

`.png` works too — transparent background, ~400px wide, then change the extension in the
`<img src>` tags inside `index.html` and `services.html`.

Logos display full colour in white cards, which is how carrier marks are meant to be shown.

## Before you publish

**Only display carriers you are actually appointed with.** Showing a logo you cannot place business
with is a compliance problem in every state, and several carriers actively police unauthorised use
of their marks. If Petrina is appointed with six of these, delete the other five
`<div class="logo-card">` blocks rather than leaving them up.

Some carriers require logos be taken from their official broker portal and used per their brand
guidelines. Check the appointment paperwork before going live.
