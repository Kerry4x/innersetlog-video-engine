# T2 · Tutorial 2: 3D blocky-avatar story animations with Claude (Fable 5.2 + Opus sub-agents)

| | |
|---|---|
| Source | Drive: `Tutorial2.mp4` (id `1_SzNFKHBlXDev403odH81amBESuWHpPW`). The creator also linked a Google Doc (Kerry has it; not needed so far) |
| Creator | Unnamed. Sells "animation kits" in a paid school community |
| Niche / output | Vertical 3D "Roblox-style" story shorts: blocky avatars, one-impossible-rule stories, fast narration |
| Length | 12:30 (1280×720) |
| Analyzed | 2026-11-15 · faster-whisper small · 803 adaptive frames (`--screen`), 51 hard cuts |

> Visual style of this tutorial is **not** being adopted (Kerry's call). The value here is the workflow.

---

## 0. Script breakdown (beat by beat)

Short exact quotes only; the rest is paraphrased. Run `library/_tools/regenerate.sh T2` for the full transcript.

| Time | Beat | What's said / shown |
|---|---|---|
| 0:00–0:40 | **Hook: proof of demand** | "3D Roblox story animations are going insanely viral right now." Two channels: one "over 168 million views in just the past 7 days", another 84M. *Figures are his claims.* |
| 0:40–0:58 | Promise | Used to need months of 3D skill. Now the model "can make videos of identical quality very easily." |
| 0:58–1:52 | **Shows the result** | His finished short plays in full: a world where everyone gets one spoken word in their life, and a kid uses a loophole (registering a long phrase as a "word") to say goodbye to a best friend. |
| 1:52–3:45 | Step 1: analyze references | Uploads ~10 viral references and gives a prompt to analyze them and propose a tool stack. Orchestration rules: Fable 5.2 as orchestrator, **sub-agents only Opus 5.5** (cost). |
| 3:45–5:20 | Findings | Measured traits of the niche: 60 fps · ~4–5 words/s (241–282 wpm) · 85–125 hard cuts per video · smooth zoom-ins · opens "In this town / In this world…", hook = one impossible rule, line 2 starts "You see…" · blocky 6-part avatars, flat faces **swapped per shot**, no lip-sync, held poses, slow camera push-in · captions. |
| 5:20–6:40 | Step 2: tool choice | Model can't tell if references were made in Roblox Studio or Blender and asks him to install Roblox Studio. He refuses ("a whole other layer of complication") and steers it: Blender for models, **three.js** for animation (his experience: "3 to 4 times faster"), Remotion for text/overlays. |
| 6:40–7:10 | Step 3: assets | Claude builds the avatars and a set of original facial expressions in Blender. |
| 7:10–7:55 | Step 4: first full draft | One-word-world prompt, then the first draft. |
| 7:55–8:45 | **Problems** | (1) Wrong voice: references use a high-pitched cartoon narrator, but "current LLMs cannot actually hear the reference videos. They can only transcribe." (2) Hands and bodies "smushed and melted together". (3) Visuals too simple. |
| 8:45–9:25 | Fix: voice | Manual research found an ElevenLabs-family voice through **Higgsfield's audio MCP** (name heard as "Callin"; spelling unverified), then raised the speed until the pitch came up. |
| 9:25–10:35 | Fix: look | Long iteration plus his own research: cinematic lighting first (before/after shown), then textured clothing, a detailed environment, and no-clip arms. |
| 10:35–11:05 | Systemize | After one good video it becomes "an automatable system… deterministic, high quality videos every single time". |
| 11:05–12:30 | Pitch | Paid kit (this one plus "Vox-style", "Zack D. Films-style", "Kurzgesagt-style" kits). |

## 1. What he set out to make

"Recreate these kinds of viral Roblox 3D animations" with a coding model (2:04), then turn the first good result into a repeatable system (10:50).

## 2. Setup and tools

| Tool | First seen | Notes |
|---|---|---|
| Claude desktop app, Code session | 2:15 | Model picker shows **Fable 5.2 · High · Auto** (frame 5:56) |
| Sub-agents (Opus 5.5) | 3:06 | Orchestrator/worker split to save usage |
| Reference video files | 2:20 | ~10 MP4s dragged into the prompt (frame 2:20: a row of MP4 attachments) |
| Blender (local) | 6:46 | Claude drives it on his machine to build avatars and expressions |
| three.js | 6:01 | Animation layer (his claim: 3–4× faster for the model than Blender animation) |
| Remotion | 6:06 | Text and overlay motion graphics |
| Higgsfield audio MCP (ElevenLabs-family voice) | 9:04 | Narration. Speed raised to raise the pitch (frame 9:15: speed and pitch sliders) |

## 3. Pipeline, step by step

| # | Time | Step | How | Output |
|---|---|---|---|---|
| 1 | 2:15 | Collect references | ~10 recent viral videos in the niche | Files in the session |
| 2 | 2:26 | Analysis brief | Prompt (his paraphrase): analyze the videos thoroughly, get transcripts, visuals, animation style, pacing, story structure; give a step-by-step plan and tool stack, "and which of those tools you are strongest at using yourself" | Plan |
| 3 | 3:06 | Orchestration rule | "you are the main orchestrator… For sub agents only use opus 5.5. You can use as many sub agents as you want" | 11 sub-agents, reference sheets per video |
| 4 | 4:00 | Findings | fps, wpm, cut count, hook formula, avatar/face/camera rules, captions | Style spec |
| 5 | 5:50 | Constrain the stack | Asks for Blender + three.js + Remotion instead of Roblox Studio | Tool split |
| 6 | 6:46 | Build assets | Avatars + original expression set in Blender | Character kit |
| 7 | 7:15 | Draft | Story idea prompt ("in this world, everybody gets to say only one word in their whole lifetime") | Draft 1 |
| 8 | 8:45–10:35 | Fix loop | Voice, then lighting, then textures and clipping | Final video |
| 9 | 10:50 | Systemize | Freeze the working setup as a "kit" | Repeatable pipeline |

## 4. Problems and how he got around them

- **Model can't hear audio.** *Time:* 7:58. *What broke:* the generic voice didn't match the references' sped-up, high-pitched narrator. *How noticed:* watching draft 1. *Fix:* manual voice research, then a TTS voice via an MCP, sped up. *Worked:* shown in the final video. *Lesson:* LLM video analysis is blind to **voice character, music and SFX feel**. Specify audio by ear or by measured numbers, not by "match the reference".
- **Model unsure which tool made the references.** *Time:* 5:22. *What broke:* it wanted Roblox Studio installed. *Fix:* he decided the stack himself from past experience. *Lesson:* the human picks the toolchain and the model executes. Ask the model what it's strongest at, then constrain.
- **Mesh clipping (hands into bodies).** *Time:* 8:24. *Fix:* iterated until a "no-clipping check across every pose" passed (on-screen Claude message, 10:01). *Lesson:* ask for automated checks on known failure modes rather than eyeballing each render.
- **Too simple / low quality vs references.** *Time:* 9:25. *Fix:* staged upgrades, lighting first, then textures and environment. Before/after shown (10:05). *Lesson:* upgrade one visual layer at a time so you can see what helped.
- **Usage limits.** *Time:* 3:24. *Fix:* expensive model orchestrates, cheaper model does the bulk analysis. *Lesson:* route heavy, repetitive work to the cheaper model.

## 5. Rendering / export

Vertical shorts at 60 fps to match the references (per the analysis). Render tool chain: Blender (models), three.js (animation), Remotion (text). Render time not shown.

## 6. Habits worth noting

- **Measure the niche before building:** fps, words/min, cuts, hook formula, as numbers.
- **Asks the model to explain tool choice and its own strengths** before committing.
- Accepts a rough first draft, then **fixes one layer at a time**.
- Does real manual research when the model is blind (voice).
- *(Inference)* Values the "system" over the single video: a kit you can rerun.

## 7. Ideas worth borrowing (techniques, not content)

- **Reference analysis with an orchestrator and cheaper sub-agents** (3:06).
- **A measured style spec** (wpm, cuts/video, fps, hook template) as the build target (4:00).
- **Formulaic hooks:** "In this world, [one impossible rule]. You see, …" is a *template*, so ideas are cheap to generate (4:32). *(Relevant to Kerry's "easy ideas" goal.)*
- **Original expression sets** for differentiation (6:56).
- **Automated QA checks** (no-clip) inside the loop (10:01).
- **Mixed stack:** 3D asset tool + JS animation + Remotion overlays (6:20).

## 8. Data notes

Transcript via faster-whisper small. Model names are as spoken and as shown in the UI ("Fable 5.2", "Opus 5.5"). The voice name is uncertain from audio. OCR was stopped (tesseract stalled); all on-screen quotes are read from frames by eye. View counts and income are the creator's claims.
