/**
 * Innersetlog Timeline Resolver
 * ------------------------------------------------------------------
 * Runs once per timeline (memoized by the compositor) and turns an authored
 * timeline into a render-ready one:
 *   - resolves every audio cue ('@word', '@"phrase":end+2f', ...) to seconds
 *   - fills missing scene/element ends
 *   - enforces staggered entries (4–8 frames) for elements that would collide
 *   - aligns on-screen sentences to spoken words (synced reveals / highlighter)
 *   - flags motion-rule violations (linear UI easing) as warnings
 */
import { MOTION_CONFIG, clamp } from './motion.js';
import { parseTranscript, createCueResolver, isCue, alignWords } from './audioSync.js';

const UI_TIME_FIELDS = ['start', 'end', 'fillAt', 'highlightAt', 'sweepStart', 'sweepEnd', 'turnAt'];

export function resolveTimeline(timeline, { fps = MOTION_CONFIG.fps, transcript } = {}) {
  const warnings = [];
  const words = parseTranscript(transcript ?? timeline.audio?.transcript);
  const sync = createCueResolver(words, { fps });
  const st = { ...MOTION_CONFIG.stagger, ...(timeline.stagger || {}) };
  const gapFrames = clamp(st.defaultFrames, st.minFrames, st.maxFrames);
  const gap = gapFrames / fps;
  const windowSec = st.windowFrames / fps;

  const abs = (v, from, label) => {
    if (!isCue(v)) return v;
    try {
      return sync.resolve(v, { from });
    } catch (e) {
      warnings.push(`${label}: ${e.message}`);
      return null;
    }
  };

  /* ---- scenes: absolute times ---- */
  let prevStart = 0;
  const scenes = timeline.scenes.map((s, i) => {
    const start = abs(s.start, prevStart, `scene ${s.id ?? i} start`) ?? prevStart;
    prevStart = start;
    return { ...s, start };
  });
  scenes.forEach((s, i) => {
    const authored = timeline.scenes[i].end;
    const next = scenes[i + 1]?.start;
    s.end = authored != null ? abs(authored, s.start, `scene ${s.id ?? i} end`) : next;
    if (s.end == null) s.end = timeline.duration ?? (words.length ? words[words.length - 1].end + 0.6 : s.start + 5);
  });
  const duration = timeline.duration ?? scenes[scenes.length - 1].end;

  /* ---- per scene ---- */
  for (const scene of scenes) {
    const sLen = scene.end - scene.start;
    // scene-local time from number (already local) or cue (absolute)
    const local = (v, label) => {
      if (v == null) return v;
      if (isCue(v)) {
        const a = abs(v, scene.start, `${scene.id}/${label}`);
        return a == null ? null : a - scene.start;
      }
      return v;
    };

    // camera + character tracks
    if (Array.isArray(scene.camera)) {
      scene.camera = scene.camera.map((k, i) => ({ ...k, t: local(k.t, `camera[${i}]`) ?? 0 }));
    }
    if (scene.character?.track) {
      scene.character = {
        ...scene.character,
        track: scene.character.track
          .map((k, i) => ({ ...k, t: local(k.t, `character.track[${i}]`) ?? 0 }))
          .sort((a, b) => a.t - b.t),
      };
    }

    // UI elements
    let ui = (scene.ui || []).map((o, i) => {
      const r = { ...o, __i: i };
      for (const f of UI_TIME_FIELDS) if (f in r) r[f] = local(r[f], `ui[${i}].${f}`);
      if (r.start == null) r.start = 0;
      if (r.end == null) r.end = sLen;
      if (r.ease === 'linear') {
        warnings.push(`${scene.id}/ui[${i}]: linear easing is not allowed for UI — using spring "pop"`);
        delete r.ease;
      }
      return r;
    });

    // Stagger: walk in time order (ties keep authored order = visual hierarchy).
    ui.sort((a, b) => a.start - b.start || a.__i - b.__i);
    let last = -Infinity;
    for (const o of ui) {
      if (o.stagger !== false && o.start - last < windowSec && o.start < last + gap) {
        const shift = last + gap - o.start;
        o.start += shift;
        if (o.fillAt != null && o.fillAt < o.start + gap) o.fillAt = o.start + gap;
        if (o.end - o.start < 0.4) o.end = o.start + 0.4;
      }
      last = o.start;
    }
    ui.sort((a, b) => a.__i - b.__i);

    // Word alignment for synced text + highlighter sweeps
    ui = ui.map((o) => {
      if (!((o.type === 'text' && o.syncWords) || o.type === 'highlight')) return o;
      const from = scene.start + (o.sweepStart ?? o.start);
      const fallbackEnd = scene.start + (o.sweepEnd ?? o.end - 0.3);
      const aligned = words.length ? alignWords(o.text, words, { from, fallbackStart: from, fallbackEnd }) : null;
      let wordTimes;
      if (aligned && aligned.some((w) => w.synced)) {
        wordTimes = aligned.map((w) => ({ ...w, start: w.start - scene.start, end: w.end - scene.start }));
      } else {
        // no transcript match → evenly pace across the sweep window
        const toks = String(o.text).split(/\s+/).filter(Boolean);
        const t0 = o.sweepStart ?? o.start + 0.2;
        const t1 = o.sweepEnd ?? Math.max(t0 + 0.3 * toks.length, o.end - 0.4);
        const d = (t1 - t0) / toks.length;
        wordTimes = toks.map((text, i) => ({ text, start: t0 + i * d, end: t0 + (i + 1) * d, synced: false }));
        if (words.length) warnings.push(`${scene.id}/ui[${o.__i}]: "${o.text}" not found in transcript — paced evenly`);
      }
      return { ...o, wordTimes };
    });

    scene.ui = ui;
  }

  return { ...timeline, scenes, duration, __sync: sync, __warnings: warnings, __fps: fps };
}
