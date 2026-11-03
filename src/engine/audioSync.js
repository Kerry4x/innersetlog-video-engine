/**
 * Innersetlog Audio Sync
 * ------------------------------------------------------------------
 * Turns voiceover timestamps into cue times so motion is keyed to speech.
 *
 * Accepted transcript inputs (parseTranscript):
 *   - Whisper / faster-whisper / WhisperX JSON with word timestamps:
 *       { segments: [{ start, end, text, words: [{ word, start, end }] }] }
 *   - Flat word list: [{ word|text, start, end }]  or  { words: [...] }
 *   - SRT text (segment-level). Words are spread across each cue by length —
 *     usable, but word-level JSON is strongly preferred for tight sync.
 *
 * Cue syntax (anywhere the timeline accepts a time):
 *   2.4                 plain seconds (scene-local inside a scene)
 *   '@habit'            start of the first "habit" spoken at/after the scene start
 *   '@habit#2'          2nd occurrence (counted from the scene start)
 *   '@habit:end'        end of that word
 *   '@"sixty six days"' start of a phrase (quote multi-word cues)
 *   '@habit+0.15'       offset in seconds (also -0.1, or +4f for frames)
 *   '@habit:end-2f'     edges and offsets combine
 *   '@@12.8'            absolute audio time 12.8s
 */

const norm = (w) =>
  String(w)
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9']+/g, '')
    .trim();

/* ============================== PARSING ================================ */
function parseSrtTime(s) {
  const m = s.trim().match(/(\d+):(\d+):(\d+)[,.](\d+)/);
  if (!m) return 0;
  return +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000;
}

function parseSrt(text) {
  const words = [];
  const blocks = text.replace(/\r/g, '').split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block.split('\n').filter(Boolean);
    const timeLine = lines.find((l) => l.includes('-->'));
    if (!timeLine) continue;
    const [a, b] = timeLine.split('-->');
    const start = parseSrtTime(a);
    const end = parseSrtTime(b);
    const body = lines.slice(lines.indexOf(timeLine) + 1).join(' ');
    const toks = body.split(/\s+/).filter(Boolean);
    const total = toks.reduce((n, w) => n + Math.max(1, w.length), 0) || 1;
    let cursor = start;
    for (const w of toks) {
      const d = ((end - start) * Math.max(1, w.length)) / total;
      words.push({ word: w, start: cursor, end: cursor + d });
      cursor += d;
    }
  }
  return words;
}

/** Normalize any supported transcript into [{ word, norm, start, end, i }]. */
export function parseTranscript(input) {
  if (!input) return [];
  let raw;
  if (typeof input === 'string') {
    const trimmed = input.trim();
    raw = trimmed.startsWith('{') || trimmed.startsWith('[') ? parseTranscript(JSON.parse(trimmed)) : parseSrt(trimmed);
  } else if (Array.isArray(input)) {
    raw = input;
  } else if (Array.isArray(input.words)) {
    raw = input.words;
  } else if (Array.isArray(input.segments)) {
    raw = input.segments.flatMap((s) => s.words || []);
  } else {
    raw = [];
  }
  return raw
    .map((w) => ({ word: String(w.word ?? w.text ?? '').trim(), start: +w.start, end: +w.end }))
    .filter((w) => w.word && Number.isFinite(w.start))
    .sort((a, b) => a.start - b.start)
    .map((w, i) => ({ ...w, norm: norm(w.word), i }));
}

/* ============================ CUE RESOLVER ============================= */
const CUE_RE = /^@(?:"([^"]+)"|([^:#+\-\s]+))(?:#(\d+))?(?::(start|end))?([+-]\d*\.?\d+f?)?$/;

function parseOffset(str, fps) {
  if (!str) return 0;
  if (str.endsWith('f')) return parseFloat(str) / fps;
  return parseFloat(str);
}

/**
 * Build a resolver bound to a transcript.
 * resolve(cue, { from = 0, fps = 30 }) → absolute seconds, or throws with a helpful message.
 */
export function createCueResolver(words, { fps = 30 } = {}) {
  const find = (tokens, from, occurrence) => {
    let count = 0;
    for (let i = 0; i <= words.length - tokens.length; i++) {
      if (words[i].start + 1e-6 < from) continue;
      let ok = true;
      for (let k = 0; k < tokens.length; k++) {
        if (words[i + k].norm !== tokens[k]) {
          ok = false;
          break;
        }
      }
      if (ok && ++count === occurrence) return { first: words[i], last: words[i + tokens.length - 1] };
    }
    return null;
  };

  function resolve(cue, { from = 0 } = {}) {
    if (typeof cue === 'number') return cue;
    if (typeof cue !== 'string') throw new Error(`Invalid cue: ${JSON.stringify(cue)}`);
    if (cue.startsWith('@@')) return parseFloat(cue.slice(2));
    const m = cue.match(CUE_RE);
    if (!m) throw new Error(`Unrecognized cue syntax "${cue}"`);
    const [, phrase, single, occ, edge, off] = m;
    const tokens = (phrase || single).split(/\s+/).map(norm).filter(Boolean);
    const occurrence = occ ? parseInt(occ, 10) : 1;
    const hit = find(tokens, from, occurrence) || (from > 0 ? find(tokens, 0, occurrence) : null);
    if (!hit) throw new Error(`Cue "${cue}" not found in transcript (searched from ${from.toFixed(2)}s)`);
    const base = edge === 'end' ? hit.last.end : hit.first.start;
    return base + parseOffset(off, fps);
  }

  /** Words whose start falls in [t0, t1). */
  const wordsBetween = (t0, t1) => words.filter((w) => w.start >= t0 - 1e-6 && w.start < t1);

  /** Is the narrator mid-word at time t? (drives lip-sync) */
  const speakingAt = (t) => {
    // binary search
    let lo = 0;
    let hi = words.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (words[mid].end < t) lo = mid + 1;
      else if (words[mid].start > t) hi = mid - 1;
      else return words[mid];
    }
    return null;
  };

  return { resolve, wordsBetween, speakingAt, words };
}

export const isCue = (v) => typeof v === 'string' && v.startsWith('@');

/**
 * Match a display sentence to the transcript and return per-word times.
 * Used by synced text reveals and highlighter sweeps so each word reacts
 * exactly when it is spoken. Falls back to evenly spaced times between
 * [fallbackStart, fallbackEnd] for words the narrator doesn't say verbatim.
 */
export function alignWords(displayText, words, { from = 0, fallbackStart = 0, fallbackEnd = 1 } = {}) {
  const display = String(displayText).split(/\s+/).filter(Boolean);
  const out = [];
  let cursor = words.findIndex((w) => w.start >= from - 1e-6);
  if (cursor < 0) cursor = words.length;
  for (let i = 0; i < display.length; i++) {
    const n = norm(display[i]);
    let hit = null;
    for (let j = cursor; j < Math.min(words.length, cursor + 6); j++) {
      if (words[j].norm === n) {
        hit = words[j];
        cursor = j + 1;
        break;
      }
    }
    out.push(hit ? { text: display[i], start: hit.start, end: hit.end, synced: true } : { text: display[i], synced: false });
  }
  // fill unsynced gaps by interpolating between neighbours
  for (let i = 0; i < out.length; i++) {
    if (out[i].synced) continue;
    let p = i - 1;
    while (p >= 0 && !out[p].synced) p--;
    let q = i + 1;
    while (q < out.length && !out[q].synced) q++;
    const t0 = p >= 0 ? out[p].end : fallbackStart;
    const t1 = q < out.length ? out[q].start : Math.max(fallbackEnd, t0 + 0.2);
    const span = q - p;
    const k = i - p;
    out[i].start = t0 + ((t1 - t0) * (k - 0.5)) / span;
    out[i].end = t0 + ((t1 - t0) * (k + 0.5)) / span;
  }
  return out;
}
