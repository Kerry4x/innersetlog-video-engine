# Workflow baseline · 2 tutorials

Pulled from [T1](T1_claude-code-remotion-faceless-channel.md) and [T2](T2_claude-fable-3d-blocky-story-animations.md). Only the *workflow* matters here; neither tutorial's visual style is being used.

## Videos covered

| # | Niche / output | Main tools | Length |
|---|---|---|---|
| T1 | 2–3 min animated true-survival films (16:9), paper-cutout style | Claude desktop Code (Opus 5.5, Auto) · Remotion · `CLAUDE.md` rules | 8:50 |
| T2 | Vertical 3D blocky-avatar story shorts | Claude Code (Fable 5.2 orchestrator + Opus 5.5 sub-agents) · Blender · three.js · Remotion · Higgsfield audio MCP | 12:30 |

## Common pipeline (both do all of these)

1. **Pick a niche by measured demand**, not taste: T1 compares views to subscribers, T2 cites views in the last 7 days.
2. **Feed the model references.** T1 uses thumbnail screenshots, T2 uses the videos themselves.
3. **Turn references into persistent rules:** T1 saves them to `CLAUDE.md`, T2 builds a measured style spec and then a kit.
4. **Run a short test before the real thing.** T1 makes a 10 s clip, T2 a first draft.
5. **Generate the story or idea from a short prompt, with an approval gate before rendering** (T1 explicitly: "Don't animate anything until I say go").
6. **Fix by plain-English notes, one problem at a time.**
7. **Freeze it as a system:** every later video is "just the last step again" (T1) or a "kit" (T2).

## Problem → workaround catalogue

| Problem | Who | Workaround | Best practice |
|---|---|---|---|
| **Model can't hear audio** (voice character, music feel) | T2 | Human ear plus manual voice research; a TTS voice via MCP, sped up | Specify audio with measured numbers (wpm, pitch, music level vs voice) or pick it by ear. Never "match the reference" |
| **Model unsure which tool to use** | T2 | Human decides the stack from experience | Ask the model which tools it's strongest at, then constrain |
| **Copycat risk** | T1 | Remake the 10 s test in 5 styles, pick one nobody uses; new topic | Vary style and topic on cheap tests before committing |
| **Visual quality below references** | T2 | Upgrade one layer at a time (lighting, then textures, then environment) | Staged upgrades with before/after |
| **Geometry errors** (clipping) | T2 | Automated no-clip check across every pose | Build QA checks for known failure modes into the loop |
| **Usage limits / cost** | T1, T2 | T1: wait for the reset and type "continue". T2: expensive orchestrator, cheap sub-agents | Make long jobs resumable; route bulk work to the cheaper model |
| **Long renders** (~50 min) | T1 | Wait | Decide on 10 s tests; render full length only for finals |
| **First pass is off** | T1, T2 | Timestamped plain-English notes | Same |

## Where they differ

- **Reference input:** T1 uses screenshots of thumbnails (cheap, coarse). T2 uses full videos analyzed by sub-agents (expensive, precise numbers).
- **Rendering:** T1 is pure Remotion 2D. T2 uses a mixed 3D stack.
- **Style strategy:** T1 deliberately picks a style nobody uses. T2 matches the niche's style exactly and differentiates with original expressions.
- **Story source:** T1 uses real true stories (an existing demand topic, ported to animation). T2 uses invented "one impossible rule" fables from a fixed hook template.

## Gaps nobody solved

- **Audio is the blind spot.** Neither has the model measure the references' audio (voice speed and pitch, music level, SFX density). Kerry's video-analyzer skill *does* measure this.
- **No retention feedback loop.** Neither feeds analytics (retention graphs, CTR) back into the rules.
- **Idea supply is manual or one-off.** T1 asks for 10 ideas from a screenshot; T2 hand-writes one idea. Neither has a format where ideas are generated systematically and endlessly.
- **QA is mostly by eye** (except T2's clipping check).

## Combinations no one tried (ideas)

- **Measured spec + style search:** T2's numeric niche analysis (wpm, cuts, hook template) combined with T1's "remake the test in 5 styles" for differentiation.
- **Template-driven hooks as an idea engine:** T2's "In this world, [rule]" shows that a fixed hook pattern makes ideas nearly free. A new format could be designed *around* a hook template that generates endless topics, which fits Kerry's "ideas must be easy" requirement.
- **Real-story demand (T1) + formula hook (T2):** proven topics presented through a repeatable framing device. T1's day counter is one such device.
- **Audio spec from measurement:** run the skill's audio-layers mode on references and hand Claude numbers (voice share, music dB vs voice, SFX/min) instead of hoping.

## Relevance to Kerry

Kerry wants a niche where **ideas are easy and need little thought**. Both tutorials point the same way: the content engine should be a **repeatable framing device** (T1: one true survival story with a day counter; T2: one impossible-rule world). The style comparison of the reference videos (`../styles/`) decides the look and pacing.
