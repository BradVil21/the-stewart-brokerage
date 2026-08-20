# Photos

Drop real image files in this folder using these **exact filenames**. Each one is already wired
into the markup — no code change needed. Until a file exists, a labelled placeholder renders in
its place.

| Filename | Where it appears | Shape | Min width |
|---|---|---|---|
| `hero-team.jpg` | Home page hero, right side | 4:3 landscape | 1600px |
| `advisor.jpg` | Home page, "Why small businesses only" | 4:5 portrait | 900px |

## Guidance

- **Real photos beat stock.** A phone photo of the actual office or a proper headshot of Petrina
  will outperform a polished stock image of strangers in a boardroom — visitors can tell.
- Export as JPEG at ~80% quality. Keep each file under 400KB so the page stays fast.
- Avoid images with text baked in; it can't be translated, indexed, or read by screen readers.
- If you use stock, buy a licence. Free-to-use sources: Unsplash, Pexels.

## Adding another slot

```html
<figure class="photo photo--hero" data-photo="Short description for the placeholder">
  <img src="assets/photos/your-file.jpg" alt="Descriptive alt text" width="1200" height="900" loading="lazy" />
</figure>
```

Use `photo--hero` for 4:3, `photo--tall` for 4:5. The alt text matters for SEO — describe what is
actually happening in the photo, not "team photo".
