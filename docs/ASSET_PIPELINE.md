# Flow-to-Code Asset Pipeline

**Flow is the artist. The code is the assembler and director.**
Every visual (background plates, room props, character body poses, head expressions, hand items) is generated in Flow and committed to `assets/`. The engine never draws characters, faces or scenery. It loads these files through `assets/manifest.json` and composites them with parallax, springs, staggers and audio-synced timing. The only vector graphics generated in code are the motion-graphics UI overlays (text plates, highlighter, thought bubbles, checkmarks, zoom boxes, the research-paper card).

## 1. Folder layout & naming

```
assets/
  backgrounds/            <id>.png            9:16 room plates (1188×2112 recommended)
  library/
    bodies/               <pose>.png          full character body poses, NO head
                          <pose>__front.png   optional: front arm/leg only (drawn over the head, z-layer 5)
    heads/                <expression>.png    head + face only
                          <expression>__blink.png   optional: same head, eyes closed
                          <expression>__talk.png    optional: same head, mouth open
    items/                <item>.png          hand items (pen, phone, notebook, paper…)
    props/                <prop>.png          room props (desk, chair, lamp, laptop…)
  manifest.json           generated + hand-tuned anchors (see §3)
```

- **ids:** lowercase `snake_case`. The file name (minus extension) is the id used in timelines: `sit_writing`, `focused`, `pen`, `desk_oak`.
- **Variants** use a double underscore: `focused__blink.png`.
- **Formats:** transparent PNG (preferred), WebP or SVG. Backgrounds may be opaque PNG or JPG.

## 2. Flow export rules

| Asset | Requirements |
| --- | --- |
| Backgrounds | Exactly 9:16. Keep important content inside the central ~90%: plates are overscanned 10% for parallax camera moves. No characters in the plate. |
| Bodies | Transparent background, **no head** (the neck stub ends where the head attaches). Same character scale across every pose: the feet-to-neck height must match from pose to pose. Feet on the bottom edge of the canvas. |
| Heads | Transparent, square canvas, head only, same size across every expression and variant. `__blink` / `__talk` variants must be pixel-aligned with their base (same canvas, same head position). |
| Items | Transparent, tightly cropped, drawn at the scale they'll appear in the character's hand. |
| Props | Transparent, tightly cropped, at the scale they'll appear on screen. |

Character art should follow `docs/CHARACTER_RIG.md` §1 and §3 (palette, stroke weights, cel-shade crescent, expression descriptions).

## 3. The manifest & anchors

`node scripts/build-manifest.mjs` scans the folders above and writes `assets/manifest.json` with each file's `src`, `w` and `h`. Re-running it is safe: anchors set by hand are kept, and deleted files are removed and reported.

Anchors are pixel coordinates inside each image:

| Category | Field | Meaning |
| --- | --- | --- |
| bodies | `anchor` | Ground point between the feet; this lands on the timeline's `(x, y)` |
| bodies | `neck` | Where the head's `neck` point attaches |
| bodies | `hands.L` / `hands.R` | `{x, y, angle}`: hand grip point and wrist direction in degrees (0 = right, 90 = down) |
| bodies | `headScale` | Optional head size multiplier for this pose |
| heads | `neck` | Bottom of the head that sits on the body's neck point |
| items | `grip` | Point of the item held in the hand |
| items | `angle` | Direction of the item's own "forward" axis in its image. The item is rotated so this axis follows the wrist angle |
| props | `anchor` | Point placed at the timeline's `(x, y)` (default: bottom-center) |

New entries get default anchors and `"_anchorsVerified": false`. When a batch lands, Claude inspects each image, sets the real neck, hand and grip points, and removes the flag.

## 4. Using assets in a timeline

```js
{
  id: 'hook',
  start: 0,
  background: 'study_night',
  midground: [{ asset: 'desk_oak', x: 400, y: 1560, depth: 1.0 }],
  character: {
    body: 'sit_writing', expression: 'focused', hold: { R: 'pen' },
    x: 640, y: 1560, scale: 1, lipSync: true,
    track: [
      { t: '@fade', body: 'stand_slumped', expression: 'tired' },  // sprite swap, spring crossfade on the spoken word
      { t: '@habits', headTilt: -6 },                                // spring head tilt
    ],
  },
  foreground: [{ asset: 'laptop_lid', x: 300, y: 1500 }],
  ui: [{ type: 'sprite', asset: 'trophy', start: '@win', x: 540, y: 900 }],  // Flow prop as a spring pop-up
}
```

Any asset not yet in the manifest renders as a labeled dashed placeholder of the right size and layer, so scenes can be blocked out and timed before the art exists. The browser console lists every placeholder in use.

## 5. What the engine animates (without redrawing)

- **Body:** a subtle breathing scale anchored at the feet. Pose changes crossfade on a spring.
- **Head:** rides the neck point, takes a springable `headTilt`, and swaps to `__blink` on the blink schedule and to `__talk` while the voiceover is speaking (`lipSync: true`). Expression changes crossfade with a soft settle.
- **Items:** pinned at the hand grip point, rotated with the hand's wrist angle.
- **Every layer:** parallax depth during camera moves, and cue-triggered timing (see `STYLE_GUIDE.md` §3).
