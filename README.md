# innersetlog-video-engine

Programmatic 9:16 animation engine for the **Innersetlog** YouTube channel (stickman video essays on behavioral philosophy and practical psychology).

- **Flow** is the artist: every plate, prop, body pose, head expression and hand item → `assets/backgrounds/`, `assets/library/`
- **Code** is the assembler and director: it loads the Flow assets via `assets/manifest.json` and composites them with camera moves, parallax, springs, staggers, audio sync and UI text overlays. It never draws the character.

## Docs
- [`docs/ASSET_PIPELINE.md`](docs/ASSET_PIPELINE.md): **how to deliver Flow assets** (folders, naming, export rules, anchors).
- [`docs/CHARACTER_RIG.md`](docs/CHARACTER_RIG.md): character art spec for Flow, plus the 6-layer z-order.
- [`STYLE_GUIDE.md`](STYLE_GUIDE.md): palette summary, z-order, and the studio motion rules.

## Layout
| Path | Purpose |
| --- | --- |
| `src/components/CharacterAssembly.jsx` | Assembles Flow body / head / item sprites at manifest anchors (breathing, head tilt, blink/talk variants, spring crossfades) |
| `src/components/Sprite.jsx` | Sprite, background and placeholder primitives |
| `src/engine/assets.js` | Manifest loading, asset lookup, timeline asset audit, preload |
| `scripts/build-manifest.mjs` | Regenerates `assets/manifest.json` from `assets/` (keeps hand-set anchors) |
| `assets/backgrounds/`, `assets/library/{bodies,heads,items,props}/` | Flow assets |
| `src/components/VideoComposition.jsx` | Master compositor: layers, parallax camera, UI overlays, preview clock |
| `src/engine/motion.js` | Springs, cubic-bezier, stagger helpers, parallax transforms, `MOTION_CONFIG` |
| `src/engine/audioSync.js` | Transcript parsing (Whisper JSON / word list / SRT) and `@cue` resolution |
| `src/engine/timeline.js` | Resolves cues, auto-staggers entries, aligns on-screen text to spoken words |
| `scripts/current-script.txt` | The script currently in production |

## Usage
```jsx
// Preview (rAF clock, or follows timeline.audio.src when provided)
<VideoComposition timeline={myTimeline} />

// Remotion / frame-by-frame export
<VideoComposition timeline={myTimeline} frame={useCurrentFrame()} fps={30} manifest={manifestJson} assetBase={staticFile('')} />
```

After dropping new Flow files into `assets/`:
```bash
node scripts/build-manifest.mjs
```
