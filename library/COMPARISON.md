# Style comparison · 7 reference videos (+ 2 tutorials)

Per-video detail: [`styles/`](styles/) · tutorial workflows: [`tutorials/`](tutorials/) · index: [`README.md`](README.md).
All numbers come from the video-analyzer scripts (frames, Whisper, technique pass, demucs audio split). Audio levels are about ±3 dB.

## 1. One table, same rows for every video

| | S01 Sperm whale | S02 Gladiator | S03 Superpowers | S04 Vikings v Cannibals | S05 Clay: butter | S06 Clay: monks | S07 Clay: Buddha |
|---|---|---|---|---|---|---|---|
| Format | 9:59 · 16:9 | 8:20 · 16:9 | 14:48 · 16:9 | 13:50 · 2.39:1 | 1:08 · 9:16 | 1:22 · 9:16 | 1:18 · 9:16 |
| Genre | Creature "would you survive" explainer | History explainer + dark jokes | 2nd-person fiction | Wordless animated short film | Parable (twist) | Parable + modern lesson | Story + metaphor lesson |
| Narration | 2nd person, conversational | 3rd person, quips, some "you" | **2nd person** throughout | **none** | 3rd person | 3rd → 2nd at pivot | 3rd → 2nd at pivot |
| Speech rate | 168 wpm | 159 wpm | 146 wpm (55 pauses) | — | 196 wpm | 165 wpm | 200 wpm |
| Cuts / min | 3.2 | 13.6 | 16.1 | 20.5 | 28.9 | 66.0 | 53.1 |
| Avg shot | 18.2 s | 4.4 s | 3.8 s | 3.2 s | 2.0 s | 0.9 s | 1.1 s |
| Visual changes / min | 6.6 | 16.8 | 34.3 | 32.4 | 39.4 | 87.9 | 65.4 |
| Hold share | 29% | **2%** | 27% | 30% | 46% | 40% | 43% |
| Zoom share (segments) | 23% (40) | **40% (77)** | 29% (62 + 16 pans) | 25% (39) | 3% (0) | 2% (0) | 5% (0) |
| Animated on 2s/3s | some | no (full 3D) | **yes (heavy)** | yes | no (smooth gen-video look) | no | no |
| Music vs voice | −13.9 dB, 1 bed | −26.1 dB, **ducked (+4.7 dB in gaps)** | −18.1 dB, **10 cues** | music-only, 3 movements | −27.6 dB | −14.1 dB, 1 bed | −15.9 dB, 1 bed |
| SFX / min (loud) | **0** | 2.3 | ~0.1 | 2.4 | 5.4 | 4.5 | 2.4 |
| Saturated / near-black | 6% / **59%** | 13% / 10% | 7% / 10% | 24% / 16% | 36% / 8% | 52% / 9% | 45% / 6% |
| Grain (median) | 1.5 clean | 2.9 subtle | 3.1 subtle | 2.6 subtle | 3.8 subtle | 3.1 subtle | 3.4 subtle |
| On-screen text | Short uppercase labels as jokes | Title card only | None seen | Credits only | **Word-by-word yellow serif captions** | same | same |
| Production cost *(inference)* | Low–medium (flat 2D) | **Very high** (cinematic 3D) | Low (rough hand-drawn) | **Very high** (studio 2D) | Medium (likely AI image-to-video) | same | same |

## 2. Rules that hold across most of them

1. **A repeatable title/premise template** (6 of 7): "Why you'd never want to meet ___" · "Life of a ___" · "What ___ would ACTUALLY feel like" · "[famous parable] + what it means for you". **Only S04 is a one-off.** Each template turns topic choice into filling in a blank.
2. **Second person ("you") is the default engine** (S01, S03 throughout; S06/S07 after the pivot; S02 in places). The viewer is placed *inside* the situation.
3. **Cold opens drop you in a sensation or a scene, not a topic** (S01 "you feel it", S03 "your back smashes", S02 12 s cinematic, S05 a knife in butter).
4. **Music sits well under the voice** (−14 to −28 dB) and changes only at act breaks: one continuous bed for S01, S06, S07 (S05 even quieter). Two exceptions: **S02 ducks** (music swells +4.7 dB in each pause) and **S03 changes cue 10 times** to follow the story. Music is never used to punctuate individual beats.
5. **Sound effects are sparse everywhere:** 0–5.4 per minute (S01: 0, S03: ~0). These channels are **voice-led**.
6. **Callbacks / loop closure:** S01 returns to its opening "rule", S03's fight returns to the cold open, S06/S07 end on an imperative that answers the parable.
7. **A twist or reversal near the end** (S01: humans are the danger; S02: gladiator unions; S03: loneliness after winning; S05: the accuser was the cheat).

## 3. What's unique to one creator

- **S01:** jokes rendered as **explainer graphics** (complaint letter, volume meter, crossed-out escape list, "HUMANS 0%" pie chart). The **"what would you do?" option test**. A near-black palette where light and red text do all the work.
- **S02:** **cute characters + brutal facts**; a camera that never stops moving (2% holds).
- **S03:** **hyper-mundane detail** for realism (alarm time, a manager's verbal tic) and **failed power tests**; deliberate pauses (55 silence gaps); cheap art, rich writing.
- **S04:** **no words at all**; cinemascope; an adult warning card as a hook.
- **S05–S07:** **free infinite idea supply** (the world's parables); **one cut per clause**; **the setting shifts to modern** (S06) or **the metaphor becomes a character** (S07) for the lesson; **color carries meaning** (gold vs grey).

## 4. Gaps: what none of them does

- **No one combines the second-person "you are inside it" engine with a *free, infinite, famous* source library.** S03 has the engine but invents its premises (heavy writing); S05–S07 have the free library but tell it in third person.
- **No interactive "what would you do?" decision structure across a whole story.** S01 does it once, for 60 s.
- **Audio is generic everywhere:** one music bed, few or no sound effects. No channel uses sound design as a signature.
- **Short and long form never share a franchise:** the Clayrified format lives only in 70 s shorts; the long-form channels have no short-form counterpart in this set.
- **No one systematizes the "lesson"** in long form: S06/S07 apply the moral in 20 s; long-form channels mostly don't moralize at all.

## 5. Candidate niches (ideas, for Kerry to choose from)

Requirements from Kerry: **original**, **ideas are effortless and endless**, **people already want it**, **light on Kerry's own thinking** (the personal-reflection workflow is separate).

### A. "You're Inside The Story": famous stories, myths and fables, lived in second person *(strongest fit)*
- **Premise template:** "You wake up as [character] in [famous story/myth/fable]. Here's what would actually happen."
- **Idea supply:** effectively infinite and free: Greek/Norse/Egyptian myths, Aesop, Grimm, the Bible's narrative stories, 1001 Nights, historical legends. *(Proven appeal: the Clayrified parables, S05–S07.)*
- **Engine:** S03's second-person cinematic storytelling (cold open → ordinary moment → escalation → twist), plus S01's **"what would you do?" option test** at the climax ("Option 1: open the box…"), plus the S05–S07 **ending line** (what the story was secretly about).
- **Why it's new:** none of the references combines a free famous source with a "you are in it" telling.
- **Formats:** 60–90 s shorts (one decision, one twist) feeding 8–12 min long-form (the full story).

### B. "Would You Survive ___?": second-person survival through famous real events/places
- **Template:** "You're [on the Titanic / in Pompeii / in the Donner Party / on Poon Lim's raft]. Would you survive?" Choose-your-path beats with odds.
- **Idea supply:** history's disasters, expeditions and survival stories (also the T1 tutorial's "views ≫ subscribers" topic).
- **Engine:** S01's option test made the spine, plus S02's "your survival chances depended on…" framing, plus S03's sensory realism.
- **Risk:** closer to existing "what if you lived in…" channels; must differentiate on look and sound.

### C. "The Rule": one impossible rule per world, lived in second person
- **Template:** "In this world, [one impossible rule]. You see, …" (T2's measured hook formula), told like S03, with the moral turn of S06/S07.
- **Idea supply:** a model can generate impossible rules endlessly.
- **Risk:** T2 shows this hook is already saturated in one niche (blocky 3D shorts), so the look must be very different.

### Differentiators any of these could own (from the gaps)
- **Signature sound design** (everyone else is voice + one bed): sensory sound for the "you" moments (heartbeat, breath, footsteps) as a channel trademark. *(Kerry's analyzer can measure and spec this; T2 showed models can't hear references.)*
- **One franchise across shorts and long-form.**
- **A consistent "lesson card" ending**, short like "Go find the crack." (S07).

*Look and production method come next: pick the niche first, then test 10-second clips in 3–5 looks (T1's method) before committing.*
