# Flow-to-Code Asset Pipeline

**Flow is the artist. The code is the assembler and director.**
Every visual (background plates, room props, character body poses, head expressions, hand items) is generated in Flow and committed to `assets/`. The engine never draws characters, faces or scenery. It loads these files through `assets/manifest.json` and composites them with parallax, springs, staggers and audio-synced timing. The only vector graphics generated in code are the motion-graphics UI overlays (text plates, highlighter, thought bubbles, checkmarks, zoom boxes, the research-paper card).


## 0. Cast characters from master turnaround sheets (current workflow)

Each recurring character arrives as **one Flow turnaround sheet** in `assets/_flow_raw/<char_id>_sheet.(png|jpg)`:
full-body poses on the left, the signature prop(s) top-right, and isolated expression heads bottom-right.

```bash
python3 scripts/process_flow_assets.py   # slices every *_sheet.* and writes manifest.characters
node scripts/build-manifest.mjs          # (keeps the characters section; refreshes backgrounds/library)
```

Output in `assets/library/characters/<char_id>/`:

| Folder | Files |
| --- | --- |
| `poses/` | `pose_N.png` (full body **with its native head**: proportions and stroke weight stay locked), `pose_N__masked.png` (same pose with the native head and its protrusions, like hair tufts and glasses arms, cleared; drawn under expression overlays) |
| `heads/` | `expr_N.png` in reading order. The neutral one also gets generated `__blink`, `__talk` and `__talk_wide` variants |
| `props/` | `prop_N.png`, left → right |

**How it works**
- **Background removal:** the `#111` outlines act as walls, and only white connected to the sheet edge is removed. Interior fills (`#F7EFE2` heads, the coat white, clipboard brown, notebook orange) survive, and soft ground shadows go with the background.
- **Enclosed gaps:** background pockets (between legs, inside crossed arms) are cleared. On white-fill characters, coat white is told apart from sheet white by color: Flow's coat is a warm `~(248,249,243)`, the sheet is `~(255,255,255)`.
- **Head circles:** fitted with RANSAC on the outline's outer edge, which is robust to hair, glasses arms and the neck. Each is stored as `head: {cx, cy, r}` (outer radius, px) for every pose and expression head.
- **In-place face masking:** at render time, `CastCharacter` draws the (masked) pose, then scales the chosen expression head so its `r` matches the pose's `r` and centers it on `(cx, cy)`. There's no neck slicing.
- **Views:** each pose is tagged `front | three_quarter | profile | back`, set per character in `CAST` at the top of the script. Overlays (and therefore blink and lip-sync) only apply to `front` and `three_quarter`. Profile and back poses keep their native face.

Use in a timeline:

```js
character: { cast: 'char_03_psych', pose: 'pose_2', expression: 'expr_3', lipSync: true, x: 800, y: 1760, scale: 1.6,
             track: [{ t: '@automatic', expression: 'expr_1' }] }
ui: [{ type: 'sprite', asset: 'char_03_psych:prop_1', start: '@clipboard' }]   // cast props as pop-ups
```

**Sheet requirements for Flow:** keep the same layout, give every object clear white space around it (slicing relies on it), and keep the expression heads as complete circles. Higher resolution helps a lot: the current sheets are 1376×768, so a head is only about 72px in radius.

---

## 1. Folder layout & naming (body/head assembly mode)

```
assets/
  _flow_raw/              raw Flow exports exactly as downloaded (JPG/PNG, white backgrounds OK)
    heads/  bodies/       → cleaned by scripts/process_flow_assets.py into library/ (below)
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

## 2b. (Legacy) cleaning separate body/head exports

The earlier single-file body/head workflow (`CharacterAssembly`) is still supported by the engine, but `process_flow_assets.py` now handles turnaround sheets only (section 0). The notes below describe how those earlier assets were prepared:

```bash
python3 scripts/process_flow_assets.py     # numpy + Pillow only
node scripts/build-manifest.mjs
```

- **Heads:** the black outline ring acts as a wall. Only the white connected to the canvas border is removed, so the `#F7EFE2` fill, the `#DFD6C5` crescent and the facial lines inside are never touched. Each head is then rescaled so its outer diameter is exactly 920px, centered on a 1024×1024 canvas, which gives every expression identical geometry.
- **Bodies:** pure line art, so alpha comes from darkness. This also clears enclosed white pockets (between crossed arms, under sitting arms) that a corner flood fill can't reach. Stray specks are dropped, and each pose is rescaled so its measured limb stroke matches `body_stand_idle`'s (46px), giving one physical scale for all poses.
- **Output names:** ids come from the file name up to the first dot (`head_focused_deep.png_c73687fa_2K.jpg` → `head_focused_deep`). Measurements go to `assets/_flow_raw/measurements.json`.

## 3. The manifest & anchors

`node scripts/build-manifest.mjs` scans the folders above and writes `assets/manifest.json` with each file's `src`, `w` and `h`. Re-running it is safe: anchors set by hand are kept, and deleted files are removed and reported.

Anchors are pixel coordinates inside each image:

| Category | Field | Meaning |
| --- | --- | --- |
| bodies | `anchor` | Ground point between the feet; this lands on the timeline's `(x, y)` |
| bodies | `neck` | Where the head's `neck` point attaches |
| bodies | `hands.L` / `hands.R` | `{x, y, angle}`: hand grip point and wrist direction in degrees (0 = right, 90 = down) |
| bodies | `neckAxis` | Direction the neck stub points (deg). The head's center is placed along it, so forward or drooping necks carry the head |
| bodies | `headTilt` | Resting head rotation for this pose (deg). Defaults to 60% of the stub lean, capped at ±20° |
| bodies | `scale` | Per-pose normalization (1.0 once processed) |
| bodies | `headScale` | Optional head size multiplier for this pose |
| heads | `neck` | Bottom of the outline's centerline. The body's stub tip tucks under the outline (no gap, no float) |
| heads | `diameter` | Outer diameter of the head art (920 after processing) |
| heads | `variants` | `{ blink, talk_small, talk_wide }`: other head files swapped in for blinking and lip-sync |
| *top level* | `character.headDiameter` | Rendered head diameter in body px for **every** expression. 844 = ½ of `body_stand_idle`'s feet-to-neck height, i.e. the head is ⅓ of standing height |
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
- **Head:** seated along the neck axis, plus a springable `headTilt`. Blinks every 3.5–4.5s (3 frames) when the expression has a `blink` variant. With `lipSync: true`, swaps per syllable to `talk_small` (most syllables) or `talk_wide` (peaks only). Expression changes crossfade with a quiet, no-overshoot settle.
- **Pose changes:** a quick crossfade plus a grounded `scaleY 0.98 → 1.0` settle about the feet (critically damped spring, no bounce).
- **Items:** pinned at the hand grip point, rotated with the hand's wrist angle.
- **Every layer:** parallax depth during camera moves, and cue-triggered timing (see `STYLE_GUIDE.md` §3).
