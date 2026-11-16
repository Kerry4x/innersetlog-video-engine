# How the clay characters move (measured)

Method: eight acting shots read at full frame rate (24 fps, one tile per frame) from S06, S07, S09, S13, S14 (`video_analysis/motion_survey/*.jpg`), plus the batch measurements (all ten videos animate on 2s; 34–50% of frames are holds; no camera moves inside a shot). Counts are by eye from the frame grids.

## The numbers
| Action | What happens | Frames at 24 fps | Source |
|---|---|---|---|
| **Blink** | open → fully shut in **1 frame**, shut **3–4 frames**, open in 1 frame; no half-lid in-betweens | close 1 · hold 4 · open 1 (≈ 250 ms total) | S14 58.9–61.0 s, frames 16–21 |
| **Eyes shut as an acting beat** | snaps shut in 1 frame, then **held** for the whole beat | 1 + hold 20+ | S13 15.3–16.8 s, frames 13–36 |
| **Mouth open (speech or shock)** | closed → open shape in **1 frame**, the shape **holds**, closes in 1 frame | open 1 · hold 8 · close 1 | S06 42.0–43.7 s, frames 9–18 |
| **Laughing** | mouth alternates open/closed shapes every ~2 frames, eyes shut, small head bob | 2-frame shape changes | S09 21.9–23.3 s |
| **Eyes reopening / lids rising** | the only soft lid change seen: over ~3–4 frames | 3–4 | S09 frames 32–35 |
| **Pupil dart** | jumps in **1 frame**, then holds | 1 | S06 frames 8→10 |
| **Lid droop (mood)** | slow drift across a whole shot (secondary motion) | 10+ | S14 58.9 s, frames 5–15 |
| **Arm reach / hand offer** | slow and short: about a hand's length | ~8 frames (≈ 330 ms) | S14 frames 39–46 |
| **Finger raised** | appears fast | ~2 frames | S14 17.0–18.5 s |
| **Head turn / tilt** | small (well under 20°), eased | 6–10 frames | S13 frames 14–22 |
| **Whole shot** | mostly a hold with one or two events, a tiny boil between poses | 1–2 events per 1.5–2 s shot | all |
| **Lip sync** | rare: lines are narrated in the third person; characters seldom speak on camera | — | all ten |

## Rules for our animation
1. **Faces swap, bodies drift.** Lids, mouths and pupils change in 1 frame (like replacement faces in stop motion) and then hold. Bodies, heads and arms move slowly and only a little.
2. **One or two events per shot.** A shot is a held pose plus one beat (a blink, a look, a hand). Don't animate everything at once.
3. **Blinks = 1 · 4 · 1 frames**, every 2–4 s, never during a dramatic hold.
4. **No constant talking flap.** When a character speaks: a few held mouth shapes, not a jaw bouncing every frame.
5. **Gestures are short and slow** (≈ 330 ms, about a hand's length), then held. Save big arcs for the one key moment (Nathan's point).
6. **Big action happens in wide shots** (walks, crowds); close-ups are for faces and hands.
