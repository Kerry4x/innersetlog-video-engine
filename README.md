# innersetlog-video-engine

Programmatic 9:16 animation engine for the **Innersetlog** YouTube channel (stickman video essays on behavioral philosophy and practical psychology).

- **Flow** generates static plates → `assets/backgrounds/`, `assets/props/`
- **Code** handles the character rig, camera, parallax, spring-driven motion graphics and audio sync.

- [`docs/CHARACTER_RIG.md`](docs/CHARACTER_RIG.md): **source of truth** for the character (geometry, skeletal anchors, expressions, held props, 6-layer z-order).
- [`STYLE_GUIDE.md`](STYLE_GUIDE.md): palette summary, z-order, and the studio motion rules.

## Layout
| Path | Purpose |
| --- | --- |
| `src/components/Stickman.jsx` | Character rig per `docs/CHARACTER_RIG.md` (spec anchors, bowed IK arms, hand props, `content`/`focused`/`tired`, split back/head/front parts) |
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
<VideoComposition timeline={myTimeline} frame={useCurrentFrame()} fps={30} />
```
