# Innersetlog Visual & Character Specifications

## 1. Character Core Geometry & Palette
> **Superseded in detail by [`docs/CHARACTER_RIG.md`](docs/CHARACTER_RIG.md)**, the source of truth for character geometry, skeletal anchors, expressions and held props. Where the two differ, the rig spec wins.

- **Head:** Oversized circle, fill `#F7EFE2` (Warm Off-White), stroke `#111111` (18px–22px weight).
- **Cel Shading:** Crescent shadow on the back-right of the head (`#DFD6C5`) to give 3D depth without gradients.
- **Face:** Solid black dot eyes (`#111111`), floating curved eyebrows (`6px–10px`), and a firm line mouth or gentle smile.
- **Limbs & Torso:** Heavy solid black strokes (`#111111`, 20px–26px width) with `stroke-linecap: round` and `stroke-linejoin: round`. Must use clean joint bends (no noodle-stretching).

## 2. Z-Index Layer Stacking Order
Per `docs/CHARACTER_RIG.md` §4, every scene composites in this strict order:
1. **Background Plates:** Flow room background.
2. **Midground Furniture:** Desks, chairs, and anything lying under the hands (e.g. a notebook on the desk).
3. **Character Torso & Back Limbs:** `<Stickman part="back" />`.
4. **Character Head:** `<Stickman part="head" />`.
5. **Foreground Limbs & Hand Props:** `<Stickman part="front" />` (front arm/leg + held notebooks, pens, phones), followed by any scene `foreground` items that must sit in front of the character (desk edges, laptop lids).
6. **UI Overlays:** Thought bubbles, pop-up text, highlighters, research papers, checkmarks.

## 3. Studio Motion Rules
Implemented in `src/engine/` (`motion.js`, `audioSync.js`, `timeline.js`) and enforced by the compositor.

1. **Spring Physics over Linear Tweens**
   - UI elements, thought bubbles, papers and callouts enter on damped springs (mass / stiffness / damping), never linear or rigid ease-in-out.
   - Presets (`SPRINGS` in `motion.js`): `pop` (UI, ~13% overshoot), `bubble`, `paper` (heavy card, slower settle), `snappy` (accents), `gentle` (head turns, near-zero overshoot), `exit` (critically damped), `camera` (heavy dolly, no bounce).
   - Duration-based sweeps use bezier eases; the studio "pop" curve is `cubic-bezier(0.34, 1.56, 0.64, 1)` (`EASE.popOut`). `linear` is rejected for UI with a warning.
2. **Layered Parallax Depth**
   - Every layer moves with the camera at its own depth factor (`MOTION_CONFIG.parallax`): background `0.8`, midground `0.93`, character `1.0`, foreground `1.15`, UI `0.035` (nearly locked to the frame).
   - Props the character physically touches (the desk under the writing hand) should use `depth: 1.0` so the hands never slide.
   - Background plates are overscanned 10%, so Flow plates must be generated with safe margin around the edges.
3. **Staggered Entry Timelines**
   - UI elements that would land within the same 8 frames are automatically pushed apart by 6 frames (clamped to 4–8), in authored order, so authored order = visual hierarchy. Set `stagger: false` on an element to opt out.
   - Sub-parts stagger internally: words (4f), bubble puffs (4f), paper lines (2f), label after zoom box (5f), tick after fill (3f).
4. **Audio-Synced Triggers**
   - Any time field accepts a voiceover cue resolved from word timestamps: `'@habit'`, `'@habit#2'`, `'@habit:end'`, `'@"sixty six"'`, `'@habit+0.15'`, `'@habit-2f'`, `'@@12.8'` (absolute seconds).
   - Checkmarks fill at `fillAt`, paper highlights sweep at `highlightAt`, `highlight` text bars cross each word as it is spoken, `syncWords` text pops each word on its spoken time, character `track` keys (head turns, expressions) spring at their cue, and `lipSync: true` drives the mouth from speech timing.
   - Transcript input: Whisper/WhisperX JSON with word timestamps (preferred), a flat `[{word,start,end}]` list, or SRT (segment-level, approximated).
