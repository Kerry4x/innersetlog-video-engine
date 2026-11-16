# reanimate / reanimate-video: assessment (2026-11-16)

- **reanimate** (github.com/NiazMorshed2007/reanimate, MIT): a Claude Code skill that films a reference animation, rebuilds it, films the copy the same way and compares frame by frame, 2–5 rounds, until timing (±80 ms), easing and order match. Strongest on live web pages (reads CSS/WAAPI/three.js directly). Needs Bun; downloads ~250 MB (Chromium + ffmpeg).
- **reanimate-video** (github.com/starrandy123/reanimate-video): third-party kit that fixes eight traps when the reference is a video file, plus pixel measuring tools (spin, fade, size, arcs, typeface).
- **Its own stated limit:** from a video, "a 3D-rendered scene, footage, random particles" do not copy. So it cannot copy clay character motion.

## Use for us
1. **Method, adopted now:** measure the reference → build → measure ours → compare with numbers. Applied to character motion in `library/styles/CLAY_MOTION_SPEC.md` (frame counts of blinks, mouth holds, gestures).
2. **Later, for the 2D layer:** captions, title cards, transitions, the paper-cutout pop-ins. Copy timing, keep our look. Install then (needs Bun).
3. Its easing fitter (`easing.ts`) once we have tracked motion curves.
