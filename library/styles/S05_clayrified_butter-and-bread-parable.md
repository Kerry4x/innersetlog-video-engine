# S05 · Clayrified: "The farmer's butter" (clay-look parable short)

| | |
|---|---|
| Source | Drive: `a5bd5ca9d17848e5b2fa6a80fcc8c086.mp4` (id `1PavOKNjhgTJrDZhNvKgl3r6n4Zu5vDB7`) |
| Creator | **@clayrified** (watermark on every frame; profile card at 1:01: "Clayrified", ~186K followers, bio "Stories that change how you see things") |
| Format | Vertical short, 1:08, 720×1280 @ 24 fps |
| Same creator as | [S06](S06_clayrified_two-monks-parable.md), [S07](S07_clayrified_golden-buddha-parable.md) |
| Analyzed | 2026-11-15 · faster-whisper small · 49 adaptive frames · technique on all 1,645 frame pairs |

## 0. Script breakdown

A traditional folk tale (the baker and the farmer's butter), retold. Beats paraphrased; short exact quotes only.

| Time | Beat | Content |
|---|---|---|
| 0:00–0:07 | **Hook: routine** | "Every single morning, a farmer walked into the village bakery…": the butter-for-bread trade. Opens on an extreme close-up of a knife pressing into butter. |
| 0:07–0:11 | Time passes | "It went like that for years, but one day the baker got suspicious." Seasons change through one window: summer, autumn, snow. |
| 0:11–0:22 | Rising suspicion | The butter weighs light; then "too light again", then the baker is "furious". |
| 0:22–0:29 | Escalation | The baker drags the farmer to the judge. |
| 0:29–0:49 | Trial dialogue | Judge: is your butter light? Farmer: "I'm a simple man. I don't even own a set of weights." He balances his butter against the baker's own loaf. |
| 0:49–1:01 | **Twist** | The courtroom turns to the baker, whose loaf "had never weighed a pound." |
| 1:01–1:04 | CTA | "Follow, or you might miss the next lesson." over a phone mockup of the profile. |

Structure: **routine, then a crack in it, an accusation, a trial, a reversal.** No direct "lesson for you" section (unlike S06/S07); the twist *is* the lesson.

## 1. Pacing

| Metric | Value |
|---|---|
| Speech | 224 words · **196 wpm** · 2 silence gaps |
| Hard cuts | 33 (**28.9/min**), avg shot **2.0 s** (min 1.25, max 4.0) |
| Visual changes | 39.4/min |
| Hook | 3 shots in the first 5 s (0:00 close-up, 0:02 cut to a full figure in a doorway, 0:03.8 cut to the bread) |

**One cut per spoken clause**: every new noun in the narration gets its own shot (butter, then farmer, then bread, then baker).

## 2. Technique (how it moves)

- Frames: **46% hold · 47% local motion** · 3% zoom · 2% pan · 2% cut. No camera zoom or pan segments ≥ 0.4 s.
- Motion is soft, continuous character movement inside each shot (heads turn, hands move, a hat tips), not pose swaps. *(Inference: the look and soft motion are consistent with AI image-to-video generation of a "claymation" look, not stop-motion: no frame-to-frame "boil", smooth interpolation, cinematic depth of field.)*
- **Time-lapse within one shot:** the bakery window shows summer, autumn, then snow (0:07–0:10) to say "for years".

## 3. Look

- **Style:** cinematic clay/plasticine characters (big round eyes with heavy lids, visible clay texture), miniature real-world sets, shallow depth of field, warm golden-hour light.
- **Palette:** warm browns and terracotta; 35.7% strongly saturated, 3.3% near-white, 7.5% near-black. Top colors `#542B1A`, `#6E4128`, `#2E1C17`, `#D8B992`.
- **Texture:** subtle grain (median 3.82), which reads as photographed material.
- **Captions:** bold yellow serif with a dark outline, **2–4 words per caption**, lower third, synced to speech.
- **Framing:** lots of extreme close-ups of objects (butter, scale, bread) between character shots.

## 4. Audio

| Metric | Value |
|---|---|
| Voice share | 80% |
| Music coverage | 92% (5 segments, 0.9 cue changes/min) |
| Music vs voice | −27.6 dB (very quiet bed) |
| Music rise in pauses | +0.8 dB |
| Sound effects | 5.4/min loud · 9.0/min soft |
| Effects under speech / on a visual change | 83% / 0% |
| Effect level vs voice | −2.7 dB |

The quietest music of the three: a barely-there bed. Sound effects sit **under speech** (83%), not on cuts: foley for the story (butter, footsteps, gavel) rather than "whoosh" transitions.

*Stems leak a few dB; treat levels as about ±3 dB. Measured with the skill's audio-layers mode (demucs voice/music split).*

## 5. What makes it work (evidence-tied)

1. **Famous-story supply:** a known folk parable means zero idea cost and a built-in twist.
2. **Shot per clause** at ~2 s keeps a slow-ish 196 wpm read feeling fast.
3. **Object close-ups** carry the plot: the scale is the punchline object (0:39–1:01).
4. The **CTA frames the channel as a series**: "the next lesson".
