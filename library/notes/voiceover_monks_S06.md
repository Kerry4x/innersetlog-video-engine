# Voiceover study: the two monks (S06), measured 2026-11-18

Whisper word timings on the separated vocal track + pitch (pyin) and loudness per sentence (`video_analysis/voice/monks_words.json`).
225 words in 77 s = **175 wpm overall**, but **210-290 wpm inside sentences**: the speed comes from crisp, short sentences; the calm comes from the gaps between them. Median pitch 123 Hz.

## What makes it work
1. **Fast sentences, real gaps.** Words come quickly; every sentence is followed by a 0.4-0.9 s gap. Ours (take 1) was even inside sentences and had uniform 0.55-0.68 s gaps.
2. **Rule of three that accelerates, then a slow payoff.** "They walk past the fields. / through the village. / up the hill." runs 242 -> 288 -> 263 wpm with gaps shrinking to 0.36 s, then "He silently seethes the entire way." drops to **143 wpm**, the slowest line in the video.
3. **The longest pause sets up the outburst:** 0.90 s after "He snaps."
4. **Dialogue is acted, narration isn't.** The young monk's lines get louder (-14.8 dB vs about -18) and higher (up to +119 Hz on "You carried her."), with almost no gaps (0.36-0.40 s). The older monk's line is calm and slower ("Why are you still carrying her?" 194 wpm, quieter).
5. **The turn drops in energy:** "You see, in life…" 185 wpm, quieter (-18.9 dB).
6. **Examples with growing pauses:** three examples followed by 0.60, 0.68, 0.76 s, then a short, slow summary ("Four seconds of hurt." 176 wpm).
7. **Build, then a slow close:** "Yet you carry it home. You carry it into bed." speeds up (246 -> 294 wpm), and the last line slows back down (181 wpm), quiet.

## Rules we take for our narration
- Keep sentences short; let the gaps, not slow words, give the weight.
- Speed through setups and lists; slow down only on the payoff line after them.
- Put the longest pause right before the line that changes the story.
- Act quoted dialogue in the character's emotion; keep the narrator steady around it.
- Drop energy at the turn to today; build through the examples; land the last line slow and quiet.
