# T1 · Tutorial 1: Faceless animated channel with Claude Code + Remotion

| | |
|---|---|
| Source | Drive: `Tutorial1.mp4` (id `18tN6Z4E_X3SFljSZ9-ijt3GcNTNQirwQ`) |
| Creator | Unnamed in the video. The desktop app shows the account name "George". Sells a paid "school community" at the end |
| Niche / output | 2–3 min animated story films ("long form" in his words) for a faceless YouTube channel |
| Length | 8:50 (1280×720) |
| Analyzed | 2026-11-15 · faster-whisper small · 484 adaptive frames (`--screen`), 8 hard cuts |

---

## 0. Script breakdown (beat by beat)

Short exact quotes only; the rest is paraphrased. Run `library/_tools/regenerate.sh T1` for the full transcript.

| Time | Beat | What's said / shown |
|---|---|---|
| 0:00–1:10 | **Hook: results first** | "Four weeks ago, I set myself the challenge to start and grow [a faceless] channel using nothing but [Claude] Code." Shows analytics: monetized on the 2nd upload, the 2nd video passed 1M views, claims "$300 a day" and $2,700 total. *Claims shown on screen, not independently verifiable.* |
| 1:10–1:30 | Promise | Shows "exactly how you can make the same videos… without writing any of the scripts or doing any of the video editing yourself." |
| 1:30–2:05 | Reference channel | The inspiration channel: 2–3 min videos, "short, simple animations, a bit of text, some storytelling and a couple of sound effects." On screen: a hand-drawn character punching a red bag, "DAY 64" counter (motivation/discipline niche). |
| 2:05–2:20 | Requirements | Claude Pro (~$20/mo) + Remotion (free). |
| 2:20–2:50 | Step 1 | Claude desktop app → Code tab → new folder `Films` → permission mode **Manual → Auto**. |
| 2:50–3:20 | Step 2 | One pasted prompt installs Remotion and starts Remotion Studio at `localhost:3000`. |
| 3:20–3:56 | Step 3: "rules" | Screenshot the reference channel's **Popular** thumbnails, paste them in, then paste a rules prompt. Claude saves the style rules to `CLAUDE.md`. |
| 3:56–4:35 | Step 4: test | Asks for "a 10 second video with sound effects". ~10 min later: a character walking through a moonlit city, "DAY 12" counter. |
| 4:35–6:05 | Step 5: differentiate | "You can't just copy another channel's branding one for one." Asks Claude to remake the 10 s clip in **5 styles** (pixel art + four of Claude's choice: paper cutout, ink wash, 1930s rubber-hose, 3D clay). Picks **paper cutout**, and Claude rewrites the rules file for it. |
| 6:05–7:00 | Topic research | "Motivation and discipline is out of the picture" (taken). Find channels with **far more views than subscribers** (example: a 3k-subscriber channel with a 1M-view video, all about people stranded on islands, none animated). Screenshot their Popular tab and ask for 10 ideas. |
| 7:00–7:55 | Step 6: make the film | New session in the `my-film` folder (where `CLAUDE.md` lives). Idea prompt, then Claude writes the **whole story scene by scene** for approval, then animates (~50 min). Notes in plain English, then export to MP4. |
| 7:55–8:10 | Packaging | Final prompt: 3 thumbnails + 5 titles. |
| 8:10–8:50 | Pitch | Paid community + member income claims. |

## 1. What he set out to make

To replicate a faceless channel of short animated story films "without writing any of the scripts or doing any of the video editing yourself" (1:15).

## 2. Setup and tools

| Tool | First seen | Notes |
|---|---|---|
| Claude desktop app, **Code** tab | 2:21 | Session list on the left. The model picker shows **Opus 5.5** |
| Permission mode **Auto** | 2:44 | "So Claude doesn't have to stop and ask you for permission every time" |
| **Remotion** + Remotion Studio | 2:52 | Installed *by Claude* via a prompt: check Node.js, `npx create-video --yes --blank my-film`, then install the "Remotion agent skills". Studio runs at `localhost:3000` (frame 3:42) |
| Node.js 22 | 3:03 | Already installed (Claude's reply on screen) |
| `CLAUDE.md` rules file | 3:49 | Persistent style rules, written by Claude from thumbnail screenshots |
| OS screenshot tool | 3:32 | Cmd+Shift+4 / Win+Shift+S. Screenshots are the main way he shows Claude references |

## 3. Pipeline, step by step

| # | Time | Step | How | Output |
|---|---|---|---|---|
| 1 | 2:21 | Workspace | New folder `Films`, opened in a Code session, Auto mode | Project folder |
| 2 | 2:52 | Install renderer | Pasted prompt (partly visible): *"I want to make animated videos with code using Remotion. Set everything up for me in this folder. 1. Check if Node.js is installed… 2. Create a new Remotion project by running: npx create-video --yes --blank my-film… 3. Go into the my-film folder and install the Remotion agent skills…"* (cut off) | Studio at localhost:3000 |
| 3 | 3:23 | Style rules | Thumbnail screenshot + "rules" prompt (not readable) | `CLAUDE.md` |
| 4 | 3:56 | Smoke test | "a 10 second video with sound effects included" | 10 s clip (~10 min) |
| 5 | 5:21 | Style exploration | Same 10 s clip × 5 styles, "make one of them pixel art, you choose the other four" | 5 variants (~15 min) |
| 6 | 5:55 | Lock style | Prompt with the chosen style name, and Claude rewrites the rules | Updated `CLAUDE.md` |
| 7 | 6:46 | Ideation | Screenshot of a high-views/low-subs channel's Popular tab + idea prompt | 10 ideas (~10 min) |
| 8 | 7:10 | Story first | *"Make a new film from this idea: RAFT. 1942: torpedoed steward Poon Lim drifts alone… First, write out the whole story as a list of scenes and show it to me. Don't animate anything until I say go."* (frame 7:16, partly cut off) | 25 scenes, 2:49 total, title card in the last 12 s |
| 9 | 7:22 | Animate | "go" | Film in Studio (~50 min) |
| 10 | 7:38 | Revise | Plain-English notes with timestamps ("at two minutes, 40, the text on the title card is too small") | Revised film |
| 11 | 7:50 | Export | "ask Claude to export it" | MP4 |
| 12 | 7:59 | Package | Final prompt | 3 thumbnails + 5 titles (frame 8:05: "133 DAYS ALONE", "They Saw Him and Sailed On. He Survived Anyway.") |

## 4. Problems and how he got around them

- **Copycat risk.** *What breaks:* cloning one channel's look leaves you in "a graveyard of copycat channels" (4:49). *Fix:* the 5-style remake of the same 10 s test, pick a style "none of the competition has done yet" (5:46), plus a different topic. *Worked?* Only claimed, via a second channel that launched with similar animation but different topics and characters. *Lesson:* lock the pipeline first, then vary the surface (style and topic) on a short test clip before spending render time on a full film.
- **Long render time.** ~50 min per film on his machine (7:26). *Fix:* none, just wait. *Lesson:* use short tests to choose things; full renders only for finals.
- **Pro plan usage limit mid-render.** (7:29) *Fix:* wait for the reset and type "continue". *Lesson:* long agent jobs need to be resumable.
- **First pass isn't right.** (7:38) *Fix:* timestamped plain-English notes, repeat until happy. *Shown:* only described.
- **Topic picking.** *Fix:* the "views ≫ subscribers" signal on a channel's Popular tab means proven demand; the gap is that it isn't animated yet (6:16–6:42). *Lesson:* borrow demand from an existing format, then change the medium.

No technical errors appear on screen. The tutorial is edited to the clean path.

## 5. Rendering / export

Remotion Studio preview, export to MP4 by asking Claude. The Studio composition panel shows **1920×1080**, 30 fps, about 2:49 duration (frame 7:40, small text). Thumbnails are also Remotion compositions ("Raft-Thumbnails").

## 6. Habits worth noting

- **Screenshots as specs:** thumbnails and Popular tabs instead of written descriptions.
- **Rules file once, short prompts after:** every film is "just the last step again" (8:12).
- **Approval gate:** story first, "Don't animate anything until I say go".
- **Topic format:** each film is one real, specific story with a **day counter** as the spine ("DAY 12", "DAY 64", "DAY 1 … 133"). *(Inference: the counter is the shared retention device across the reference channel and his.)*
- Prompts live in his video description, not on screen.

## 7. Ideas worth borrowing (techniques, not content)

- **Remake the 10 s test in 5 styles before committing** (5:21).
- **Two-stage generation:** a scene list with timings first, then animation (7:16).
- **Rules in `CLAUDE.md`, new session per film** in the folder that holds them (7:02).
- **Views ÷ subscribers** as a demand signal; port a proven non-animated topic into animation (6:16).
- **Packaging in the same tool:** thumbnails as Remotion compositions (8:00).

## 8. Data notes

Transcript via faster-whisper small: "Claude" is sometimes transcribed as "cloud", and "faceless" as "Face's". Frames are 720p screen captures; long prompts are cut off in the UI, so only the visible parts are quoted. The income figures are the creator's own claims.
