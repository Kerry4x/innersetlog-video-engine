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

## Automatic checks (look_tests/kit/qc.js), run on every rendered pose
Kerry, 2026-11-18: "I don't want it to be things that I myself point out only."
- **Intersections (`qc()`):** every character part is tested against every prop, the other character, the floors and the walls.
  - The test uses ray parity, so robes open at the hem still count as closed.
  - Light contact up to 6 mm is allowed.
  - Designed soft contact is listed as an allowance with a limit and a reason, for example David 6 cm into the seat cushion. Anything deeper, or any new pair, is an issue.
- **Contact (`gap()`):** hands that should rest on something are within a few millimetres of it; feet are on the floor or dais (0 = touching, below 0 = buried).
- **Gaze (`GAZE()`):** each eye's direction against its target. More than 12° off is flagged unless the beat says otherwise (`GAZE_SKIP`, for example the bowed head at "I have sinned").
- **Aim (`AIMSEARCH()`):** a pointing finger is aimed at its target by search, not by eye.
- **Pose search (`HANDSEARCH()`):** finds an arm pose where the hand rests on a prop with no penetration.
- **Where they run:**
  - `look_tests/stills.js` writes `<key>_qc.json` next to every still.
  - `look_tests/anim.js` checks every new pose of an animated shot and writes `qc.json`.
- **Motion check:** the mean change from frame to frame over the whole shot.
  - Moves should ramp up and down over several frames.
  - An isolated spike is a pop.
  - Holds should read 0.

## What the automatic checks have caught so far (fixed)
- **Legs:** David's shins sat 13 cm inside the throne base (the seat was deeper than his thighs). The base is now shallower, with front legs.
- **Hands:**
  - They sank 3–4 cm into the lion heads. The lions are now carved on the armrest ends and the hand pose is found by search.
  - Breathing scaled the whole upper body, so resting hands rode 1 cm into the lion. Breathing now moves the chest only.
  - Lowering a hand in a straight blend dragged it 2.3 cm through the lion's mane. The move now lifts over the lion, then sets the hand down.
- **Recoil:** in shock, David's head and cloak went 2.7 cm into the backrest, and so did the crown. Seated characters don't recoil; the head lifts and freezes.
- **Gaze:**
  - David looked 16–21° short of Nathan.
  - Nathan looked 77° away from David (he was cheated toward the camera). Restaged so they face each other across the frame.

## Things only a look at full size catches (my review, every shot)
- **Faces:** under mustaches, hairlines, crown edges, and the edges of beard strands.
- **Lighting on faces:** a character facing away from the key light needs a fill.
- **Framing:**
  - objects cut by the frame edge;
  - dark shapes directly behind a head (tangents);
  - characters cut off.
- **Camera after re-staging:** check that it still sees the faces.

## Light and set: make every shot look like the close-ups
Kerry, 2026-11-18: the close-ups of David "are beautiful"; the room around them, the lighting and the wider shots needed work. What the close-ups had, and what the reference wides do (40 frames studied from WS, EST, MS and INS shots):
1. **Light pools on the people; the room falls away.**
   - Ambient light stays low (hemisphere 0.2).
   - The key light uses a narrow cone on the acting area.
   - There's a rim light to lift the characters off the background, and a weak cool fill for colour contrast.
   - The walls should never be evenly lit.
2. **Every background has a light source and depth:**
   - a doorway to a sunlit outside (a bright wall reads as sun, so it can carry emissive), or
   - a lamp, or a window.
   - A backlit doorway behind a character gives a natural rim light.
3. **Rich, period-true surfaces instead of repeated bricks.**
   - The throne room uses cedar panelling below and lime plaster above ("I dwell in an house of cedar", 2 Sam 7:2), with pilasters and a carved arch.
   - Plaster is one painted map per wall (darker toward the ceiling, trowel marks) with a finely tiled bump.
4. **Wider shots get depth of field too** (the wide at aperture 0.004, the establishing shot at 0.0011), so the far wall is soft as in the close-ups.
   - A foreground element only if it reads as something. A blob at the edge is worse than nothing.
5. **Inserts are macro, and the object has to deserve it.**
   - A simple shape seen up close reads as a toy, so the lion was carved: mane locks, brow, muzzle, nose and eyes.
   - Shoot from where the contact is visible: a fist resting on the wood, seen from the side.
6. **Anything new in the set re-runs the contact checks.** The carved mane was bigger and put David's hand 1.1 cm into it. The hands were re-solved onto the wood itself, not the top of the mane.
7. **Things seen through openings:**
   - check every camera for slivers at the frame edge (palm fronds, a niche, a sill);
   - place background objects so each camera sees them whole, or not at all.

## Debug hooks in throne.html
- `PICK(x, y)` gives the meshes under a screen point.
- `DBG()` colour-codes David's cloth pieces.
- `OCC(x, y, z)` gives the shadow casters for a world point.
- `?noao` turns ambient occlusion off.
- `?ss=1` gives fast 1x previews.
