# Photos

Save your image files in this folder using these **exact filenames**. Each one is already wired
into the markup — drop the file in and it appears. No code change needed. Until a file exists, a
labelled placeholder renders in its place, so nothing ever looks broken.

| Filename | Where it appears | Shape | Min width |
|---|---|---|---|
| `hero-bg.jpg` | Home page hero **background** | wide landscape | 2000px |
| `hero-team.jpg` | Home page hero, right side | 4:3 landscape | 1600px |
| `advisor.jpg` | Home page, "Why small businesses only" | 4:5 portrait | 900px |

## Which of your photos goes where

- **`hero-bg.jpg`** — the wide, airy one. The office / co-working shot or the black-and-white
  desk scene both work. It sits at 22% opacity behind the hero and fades out behind the headline,
  so detail matters less than an open, uncluttered composition.
- **`hero-team.jpg`** — the shot that most looks like *your customer*, not like a stock boardroom.
  The salon owner with the tablet or the counter/POS shot reads as "small business" far better than
  four men in suits around a table.
- **`advisor.jpg`** — a portrait. Best case is a real headshot of Petrina. The woman by the window
  or at the whiteboard works as a stand-in.

## Guidance

- **Real photos beat stock.** A phone photo of the actual office beats a polished stock image of
  strangers — visitors can tell, and it undercuts the "one broker, not a call centre" promise.
- Export as JPEG at ~80% quality. Keep each under 400KB so the page stays fast.
- `hero-bg.jpg` can go to ~600KB since it is the largest.
- Avoid images with text baked in — it can't be indexed, translated, or read by screen readers.
- If you use stock, buy a licence. Free-to-use: Unsplash, Pexels, Burst.

## Adding another slot

```html
<figure class="photo photo--hero" data-photo="Short label for the placeholder">
  <img src="assets/photos/your-file.jpg" alt="Describe what is happening" width="1200" height="900" loading="lazy" />
</figure>
```

`photo--hero` = 4:3, `photo--tall` = 4:5. Write alt text that describes the actual scene — it is
read by screen readers and indexed by Google Images.
