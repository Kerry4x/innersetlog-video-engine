# Narration voice (ElevenLabs Voice Design)

Kerry generates and saves the voice in ElevenLabs; I compare the candidates and time scenes to the final voiceovers.

## How Voice Design works (official docs, checked 2026-11-17)
- Two inputs: a **voice description** and a **preview text** of 100-1000 characters (or let it write one).
- Each generation gives **three voices**; you save the one you like. You pay only for generating the preview text, once.
- The preview text acts as a **performance script**: it sets tone, pacing and emotion, so it should match the description and our real use.

## Preview text (479 characters; use the same one for every candidate)
> Around 1000 BC, a prophet went to the most powerful king in Israel with a story about a stolen lamb. A rich man had flocks and herds. A poor man had one little ewe lamb, and it was unto him as a daughter. The king was furious. "As the Lord liveth, the man that hath done this thing shall surely die." The prophet looked at him and said, "Thou art the man." Three thousand years later, we still do the same thing. We can see it in everyone else. We just can't see it in ourselves.

It tests the three things every video needs: telling a story, reading a KJV line naturally, and turning to "you" today.
(KJV wording: 2 Sam 12:2-3, 5, 7; "flocks and herds" and "unto him as a daughter" abridged from vv2-3.)

## Voice descriptions, round 1 (Kerry tried #2 and saved one; no older men, no female voice)
1. **Warm elder storyteller:** "An older man in his sixties telling a story quietly by a fire. Warm, low, slightly gravelly voice, close to the microphone. Calm and unhurried, sincere, a little weary, never theatrical or preachy. Neutral American accent. Clean studio recording."
2. **Grounded thirties:** "A man in his thirties narrating a true story to one listener. Clear, grounded, warm mid-low voice, conversational but serious, steady pace, slightly intimate. No announcer or movie-trailer tone. Neutral American accent. Clean studio recording."
3. **Quiet authority (female):** "A woman in her forties narrating a story to one listener. Calm, warm, low-pitched, quietly confident, measured pacing, sincere and unhurried, not dramatic. Neutral American accent. Clean studio recording."
4. **Weathered witness (wild card):** "A man in his fifties with a deep, textured voice, like someone who has seen a lot and is telling you what happened. Slow, deliberate, plain-spoken, with small pauses before important lines. Never theatrical. Neutral accent. Clean studio recording."

## Judging (score each saved candidate)
- Does "Thou art the man" sound natural and heavy, not like a costume or a sermon?
- Does the first sentence pull you in?
- Does the turn to "we" sound like talking to one person?
- Would you listen to this voice for 10 minutes (long-form) and 60 seconds (shorts)?
- Clarity at phone volume; no hiss, no odd breaths.

## What to send me
The favourite 2-3 previews as audio files in the Drive folder (named by number, e.g. `voice_1b.mp3`). I'll measure pace (words/min), pauses and loudness, and check how each fits our shot timing (shorts: ~1.5-2 s per shot).

## Round 2 (Kerry, 2026-11-17): men 25-30 only
Observation from round 1: the "angry" king line came from the preview text itself ("The king was furious."), which the model performs. Preview B below reports the anger instead of acting it.

**Preview A** (same as before, performs the emotion) and **Preview B** (narrator stays steady; 490 chars):
> Around 1000 BC, a prophet went to the most powerful king in Israel with a story about a stolen lamb. A rich man had flocks and herds. A poor man had one little ewe lamb, and it was unto him as a daughter. When the king heard it, he said, "As the Lord liveth, the man that hath done this thing shall surely die." The prophet looked at him and said, "Thou art the man." Three thousand years later, we still do the same thing. We can see it in everyone else. We just can't see it in ourselves.

Descriptions (each run = 3 voices):
5. **Warm baritone, 30:** "A 30-year-old man with a warm, rich baritone, telling a true story to one listener. Calm, steady and sincere, close to the microphone. No announcer tone, not dramatic. Neutral American accent. Clean studio recording."
6. **Clear and light, 26:** "A 26-year-old man with a clear, lighter voice, narrating a story he finds fascinating. Natural, curious, conversational, even pace. Not hyped, not salesy. Neutral American accent. Clean studio recording."
7. **Soft-spoken, intimate, 28:** "A 28-year-old man speaking softly, almost like late at night to a friend. Low volume, slightly breathy, calm, intimate and sincere, slow pace with natural pauses. Neutral American accent. Clean studio recording."
8. **Slight rasp, 29:** "A 29-year-old man with a slightly raspy, textured mid-low voice. Grounded and honest, plain-spoken storyteller, unhurried, a little serious. Neutral American accent. Clean studio recording."
9. **Deep and calm, 30:** "A 30-year-old man with a deep, smooth, calm voice. Measured and confident, quiet authority without preaching, deliberate pauses before important lines. Neutral American accent. Clean studio recording."
10. **Engaged storyteller, 27:** "A 27-year-old man telling a gripping story with quiet intensity. Warm mid voice, natural rises and falls, leans in on key moments but never shouts or overacts. Neutral American accent. Clean studio recording."

Tip: run each description once with Preview B; rerun a favourite with Preview A only if it sounds too flat.

## Chosen voice, first full take (David and Nathan v4, 2026-11-18)
File: ElevenLabs v3, stability 50, similarity 75 (`video_analysis/voice/vo_take1.mp3`, not committed; word timings in `vo_take1_words.json`).
- **Accuracy:** 309 of 309 words read as written (Whisper transcript matches the script).
- **Length:** 1:42. **Pace:** 182 words/min overall (story 180, modern part 184).
- **Pauses:** 24 pauses over 0.45 s, all 0.54–0.68 s, at sentence ends. Even, but little variation at the big moments.
- **Key lines:** the verdict "As the Lord liveth…" runs fast (~237 wpm in that stretch); "Thou art the man" ~162 wpm with a 0.68 s pause after it (the longest in the take).
- **Loudness:** -19.7 LUFS integrated, true peak -1.4 dBTP, range 3 LU. Fine as a source; the final mix gets normalised for the platforms.
- **Fixable in the edit (no regeneration):** longer silence before "Thou art the man", after it, and before the last line. **Needs a regeneration if wanted:** a slower read of the verdict line.

## Directing the voice (Kerry, 2026-11-18)
- Tags are fine, but vague mood tags like [thoughtful] or [quiet] don't sound good with our voice: **don't use those**.
- Use tags that set **pace and pauses**, plus a plain emotion only on **quoted dialogue**: [short pause], [long pause], [slower], [faster], [angry], [frustrated].
- Placement follows the monks voiceover study (`library/notes/voiceover_monks_S06.md`): setups move, payoff lines slow down, the longest pause sits right before the line that changes the story, dialogue is acted while the narrator stays steady, the turn to today slows, the close is slow.
- Generate in one go. I fine-tune pause lengths in the edit from the word timings.

## Take 2 (directed v3, 2026-11-18): `video_analysis/voice/vo_take2.mp3`
- 308/308 words correct; 1:46; 175 wpm overall (same as the monks VO); -19.6 LUFS, peak -1.2 dBTP.
- Worked: payoff lines slowed ("David was furious" 143 wpm; "Then Nathan said, Thou art the man" 135, the slowest; "Suddenly there were reasons" 162; close 163 and the quietest line); verdict now 205 wpm (take 1: 237) with raised pitch; excuses acted fast/louder/higher like the monk's outburst.
- Not enough: [long pause] gave only 0.72-0.78 s around "Thou art the man" (normal gaps are 0.4-0.7). Fix in the edit: ~1.3 s before "Thou", ~1.5 s after "man", ~1.0 s before the close.
- Check by ear: "He could have argued." spikes (353 wpm, +136 Hz).
