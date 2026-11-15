# Reference library

Every analyzed video has its own file: script breakdown (timestamped beats, short quotes), pacing numbers, motion technique, look (palette/texture/captions), audio layers, and what makes it work.

**Start here:** [`COMPARISON.md`](COMPARISON.md): all styles side by side, shared rules, gaps, and candidate niches.

## Tutorials (workflow only, visual style not used)

| ID | File | What it teaches |
|---|---|---|
| T1 | [tutorials/T1_claude-code-remotion-faceless-channel.md](tutorials/T1_claude-code-remotion-faceless-channel.md) | Claude Code + Remotion faceless channel: rules file, 10 s test, 5-style remake, views ÷ subs topic research, story-first approval gate |
| T2 | [tutorials/T2_claude-fable-3d-blocky-story-animations.md](tutorials/T2_claude-fable-3d-blocky-story-animations.md) | Reference analysis with an orchestrator + sub-agents, measured style spec, Blender + three.js + Remotion, the "model can't hear" voice problem |
| — | [tutorials/BASELINE.md](tutorials/BASELINE.md) | Common pipeline, problem → workaround catalogue, gaps, untried combinations |

## Style references

| ID | Video | Creator | Format | Use it for |
|---|---|---|---|---|
| S01 | [Why You'd Never Want To Meet A Sperm Whale](styles/S01_depth-theory_sperm-whale.md) | Depth Theory (as heard) | 10 min · 16:9 · flat 2D | 2nd-person danger hook, "what would you do?" option test, jokes as graphics, callbacks |
| S02 | [Life of a Gladiator](styles/S02_life-of-a-gladiator.md) | not named | 8 min · 16:9 · cinematic 3D | "Life of a ___" series template, cute characters + brutal facts, always-moving camera |
| S03 | [What Superpowers Would ACTUALLY Feel Like](styles/S03_what-superpowers-would-actually-feel-like.md) | not named | 15 min · 16:9 · rough hand-drawn 2D | 2nd-person fiction, in-medias-res cold open, mundane realism, cheap art + rich writing |
| S04 | [Vikings Versus Cannibals](styles/S04_inoxtag-ankama_vikings-versus-cannibals.md) | Inoxtag × Ankama Animations | 14 min · 2.39:1 · studio 2D | Wordless storytelling, fight choreography, cinemascope (a one-off film, not a format) |
| S05 | [The farmer's butter](styles/S05_clayrified_butter-and-bread-parable.md) | @clayrified | 68 s · 9:16 · clay look | Famous parable + twist, a shot per clause, word-by-word captions |
| S06 | [Two monks and the woman](styles/S06_clayrified_two-monks-parable.md) | @clayrified | 82 s · 9:16 · clay look | Parable → "You see, in life…" → modern examples in the same world |
| S07 | [The golden Buddha](styles/S07_clayrified_golden-buddha-parable.md) | @clayrified | 78 s · 9:16 · clay look | Story → "you did the same thing" → the metaphor becomes a character; color as meaning |

## Getting the raw material back

Full transcripts, frames, contact sheets and audio stems are **not** committed (size + they are other creators' work). Rebuild any of them from the Drive folder:

```bash
bash library/_tools/regenerate.sh            # all
bash library/_tools/regenerate.sh S03 T2     # specific entries
```
Output lands in `video_analysis/` (git-ignored): `local_<name>/transcript.txt`, `frames/`, `sheets/`, `manifest.json`.
