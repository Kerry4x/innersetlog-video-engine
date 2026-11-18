# Render quality and glitch checklist

Kerry, 2026-11-18: "Watch out for little glitches, where things glitch together. Also make sure that the quality stays high."

## Quality settings (every 3D page)
- **2x supersampling:** render at 2160x3840 (`?ss=2`, the default in throne.html), then downscale to 1080x1920 with Lanczos. Never ship a 1x render.
- **Anti-aliasing:** an MSAA render target (`samples: 4`, HalfFloat) under the post-processing; GTAO at 32 samples.
- **Output:** PNG out of the browser, never JPEG. The video is encoded once at the end (x264 `-crf 16 -preset slow -tune animation`).
- **Shadows:**
  - maps: 4096 for the sun and the key, 1024 for the lamps;
  - bias -0.0004 and normalBias 0.012, which removes the dark blotchy "shadow acne" on cloth;
  - PCF with a radius (key 9, others 5), so shadows are soft like a real miniature set under big lights. Razor-sharp shadows read as smudges.

## Glitch checklist (look at every still at full size before it goes in a cut)
1. **Open shells.** Any lathe or cylinder that doesn't wrap a full turn shows a dark inside from some angle.
   - Seen so far: the sleeve cuff and the seated skirt.
   - Fix: close it (roll the cuff back to the wrist, make the skirt a full turn).
2. **Pieces poking through cloth.** A hidden piece sticking out of the surface in front of it makes a dark notch.
   - Seen so far: the lap drape through the skirt.
   - Fix: find it with a colour-coded debug render (`window.DBG()` in throne.html), then pull it back behind.
3. **Texture seams.** A full lathe's texture seam is a visible vertical line.
   - Seen so far: the line down David's chest.
   - Fix: full turns start at the back (`lathe()` in the kit), so the seam never faces the camera.
4. **Buried contact.**
   - Feet and hems must rest on a surface, not sit inside furniture. Seen so far: the feet inside the footstool; the footstool now stands in front of the feet.
   - Hands rest on top of props, with light contact.
5. **Floating accessories.** Crowns, belts and collars must sit on the surface under them.
   - Seen so far: the crown floating above the hair.
   - Fix: the crown is now tapered to the skull and squashed front-to-back like the head.
6. **Hair or beard through accessories.** Check the edges of the crown band and collar for grooves poking through.
7. **Shadows.** A dark patch is usually a shadow.
   - Trace it with `window.OCC(x, y, z)`, which lists each light and the first object blocking it.
   - Correct but ugly: soften it.
   - Wrong: fix the object.

## Debug hooks in throne.html
- `PICK(x, y)` gives the meshes under a screen point.
- `DBG()` colour-codes David's cloth pieces.
- `OCC(x, y, z)` gives the shadow casters for a world point.
- `?noao` turns ambient occlusion off.
- `?ss=1` gives fast 1x previews.
