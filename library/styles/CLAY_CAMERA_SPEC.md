# Camera and cutting in the clay videos (measured)

Kerry, 2026-11-18: "if we just have the camera stay in one spot and not like moving, it kinda like make the video a little underwhelming."

## Method
- **Footage:** all ten Clayrified videos (S05–S14), 527 shots, every frame at 24 fps.
- **Cuts:** found at the frame level (`video_analysis/camera_survey/cuts.py`). The earlier census merged some shots: 542 found here against 488 there.
- **Camera motion:**
  - for every frame pair, a few hundred points on the set are tracked and a similarity transform (zoom, pan, tilt, roll) is fitted with RANSAC, so moving characters drop out;
  - the moves are summed per shot (`camera.py`, `summary.py`) and matched to the narration.
- **Check:** detected cuts were confirmed on frames read in order. Seeking by time in these files lands on the wrong frames, so never check that way.

## What the numbers say
| | |
|---|---|
| Shot length | median **1.28 s**, 90% under 2.0 s. The **longest shot in all ten videos is 3.2 s** |
| Cut rate | **5.7–12.6 cuts per 10 s** (median about 7) |
| Shots per narrated line | median **2**, up to 4; only 16% of lines play over a single shot |
| Locked camera | **76%** of shots |
| Subtle drift | 13%: a 0.4–1% creep in or out, barely visible, keeps the frame alive |
| Clear camera move | **11%** of shots, each with a reason (below) |

**The energy comes from the cutting, not from the camera wandering.**
- A new angle arrives about every 1.3 seconds, usually about two per sentence, and the shot size changes at most cuts (insert, medium, close-up, insert...).
- The camera moves in about one shot in nine, and only when the story gives it a reason.
- Our first animated test held one locked wide shot for 5 s, longer than any shot in the references. That is why it felt flat.

## The clear moves: size, speed, and what they are for
| Move | Typical amount | Speed | Used for (examples from the narration) |
|---|---|---|---|
| **Push in** | 2% (p90 7%) over about 1.3 s | about 1.7% per second | Landing a key line or a reveal: "a large crack split down its side", "We are not allowed to touch women", "the snake curled in the wine", "until the day someone hands you the key" |
| **Pull out** | 2.3% (p90 7%) over about 1.6 s | about 1.5% per second | Showing scope: "every child in the kingdom is doing the exact same thing", "you covered your gold in clay" |
| **Pan / tilt** | 3–4% of the frame; follows (22–86%) | about 3% per second | Following action: the monk carrying the woman through the mud (an 86% pan), walking away, throwing the bottle; small tilts on close-ups when a character looks up or down |
| **Big reveal** | 8–47% | fast | Rare, one per video at most: the 17-foot statue (pull out 47% plus tilt), "the boss walks through the house" (push 12%) |

**How a move is shaped:**
- It is usually already moving when the shot cuts in (start speed is about the mid speed).
- It **eases out to a stop** and holds for the end of the shot (end speed is about 0.16 of the mid speed).
- The camera moves on 1s (smooth, almost no held frames inside a move), even though the characters move on 2s.
- No handheld shake: jitter is about 0.15% of the frame.

**Which shots move:**
- close-ups and medium shots most often: 16% and 10% clear moves, with 18–19% drift;
- establishing shots least: 4%;
- wide shots: 11%;
- inserts: 11%.

## Rules for our videos
1. **Cut the scene, don't hold it.** Break every narrated line into about 2 shots (1–4) of about 0.8–2.0 s. Never hold one angle longer than about 3 s.
2. **Change the shot size at most cuts:** insert, medium, close-up, wide. The insert is the workhorse (about 30% of shots): hands, props, feet, objects.
3. **Lock most shots.** Give about 1 in 8 a subtle drift (0.5–1% creep).
4. **Move the camera about once per 9 shots, and only with a reason:**
   - push in about 2% on the line that lands;
   - pull out about 2% when the scope widens;
   - pan or tilt to follow an action.
   - One big reveal per video at most.
5. **Shape the moves:** cut in on the move, ease out to a stop, hold. Camera on 1s, characters on 2s.
6. **Put the reaction on its own shot:** the face change happens inside the close-up, on the word it answers.
7. **Hide difficult contact with a cut** (CLAY_WORLD_SYSTEM): cut away before a hand lands, cut back after.
