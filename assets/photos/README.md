# Photos

Save your image files here using these **exact filenames**. Each is already wired into the markup —
drop the file in and it appears. No code change needed. Until a file exists a labelled placeholder
renders instead, so nothing ever looks broken.

| Filename | Where it appears | Shape | Min width |
|---|---|---|---|
| `hero-bg.jpg` | Home hero **background** | wide landscape | 2000px |
| `hero-team.jpg` | Home hero, right side | 4:3 landscape | 1600px |
| `advisor.jpg` | Home, "Why small businesses only" | 4:5 portrait | 900px |

## Which of the photos you sent goes where

- **`hero-bg.jpg`** — the wide, airy one. The black-and-white desk scene or the open co-working
  shot. It sits at 22% opacity behind the hero and fades out behind the headline, so an open,
  uncluttered composition matters more than detail.
- **`hero-team.jpg`** — the shot that looks like *your customer*, not a stock boardroom. The salon
  owner with the tablet, or the counter/POS shot, reads as "small business" far better than four
  men in suits around a table. Use one of those.
- **`advisor.jpg`** — a portrait. Best case is a real headshot of Petrina. The woman by the window
  or at the whiteboard works as a stand-in.

## Guidance

- **Real photos beat stock.** A phone photo of the actual office beats polished stock of strangers —
  visitors can tell, and it undercuts the "one broker, not a call centre" promise the copy makes.
- Export JPEG at ~80% quality, under 400KB each. `hero-bg.jpg` can run to ~600KB.
- Avoid images with text baked in — not indexable, not translatable, not screen-reader accessible.
- If you use stock, buy a licence. Free-to-use: Unsplash, Pexels, Burst.

## Adding another slot

```html
<figure class="photo photo--hero" data-photo="Short label for the placeholder">
  <img src="assets/photos/your-file.jpg" alt="Describe the actual scene" width="1200" height="900" loading="lazy" />
</figure>
```

`photo--hero` = 4:3, `photo--tall` = 4:5. Alt text is read by screen readers and indexed by Google
Images — describe what is happening, not "team photo".
