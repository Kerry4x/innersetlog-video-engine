/**
 * Innersetlog Motion Physics
 * ------------------------------------------------------------------
 * Studio motion rules (STYLE_GUIDE.md §3):
 *   1. Springs / overshoot beziers for all UI — never linear, never rigid ease-in-out.
 *   2. Parallax depth per layer during camera moves.
 *   3. Staggered entries (4–8 frames) for anything that arrives together.
 *   4. Audio-synced triggers (see audioSync.js).
 *
 * Everything here is a pure function of time, so frame N always renders the
 * same pixels (required for frame-by-frame export and Remotion).
 */

/* ============================== CONFIG ================================= */
export const MOTION_CONFIG = {
  fps: 30,
  stagger: {
    defaultFrames: 6, // gap between elements that would otherwise land together
    minFrames: 4,
    maxFrames: 8,
    windowFrames: 8, // elements starting within this many frames of each other count as "together"
    wordFrames: 4, // intra-element stagger (words, list lines, bubble puffs)
  },
  // Camera-relative motion factor per layer. 1 = moves exactly with the camera.
  // <1 = farther away (moves/zooms less), >1 = closer (moves/zooms more).
  parallax: {
    background: 0.8,
    midground: 0.93,
    character: 1.0,
    foreground: 1.15,
    ui: 0.035, // UI is nearly screen-locked; a hint of float keeps it "in" the shot
  },
  // Background overscan so low-depth plates never expose edges while the camera pans.
  backgroundOverscan: 1.1,
  // Default camera when a scene defines none: slow cinematic push-in.
  slowZoom: { perSecond: 0.008, max: 0.06 },
  // Depth of field: blur (px) applied while an editorial card / typography takes focus.
  dof: { background: 5, midground: 2 },
  exitFrames: 9, // how long a UI element takes to leave
};

/* ============================== SPRINGS ================================ */
/**
 * Spring presets: { mass, stiffness (tension), damping (friction) }.
 * damping ratio ζ = damping / (2·√(stiffness·mass))
 */
export const SPRINGS = {
  pop: { mass: 1, stiffness: 170, damping: 14 }, // ζ≈0.54 → ~13% overshoot. UI pop-ins, checkmarks.
  bubble: { mass: 1.2, stiffness: 150, damping: 15 }, // a touch heavier/floatier for thought bubbles
  paper: { mass: 1.6, stiffness: 120, damping: 17 }, // heavy card: slower, ~8% overshoot, settles with inertia
  snappy: { mass: 0.8, stiffness: 320, damping: 22 }, // quick accents, highlight bars
  gentle: { mass: 1, stiffness: 110, damping: 19 }, // ζ≈0.9, almost no overshoot. Text drift, head turns.
  exit: { mass: 1, stiffness: 400, damping: 40 }, // critically damped fast exit
  camera: { mass: 3, stiffness: 60, damping: 26 }, // ζ≈0.97 heavy dolly, no bounce
};

const resolveSpring = (s) => (typeof s === 'string' ? SPRINGS[s] || SPRINGS.pop : s || SPRINGS.pop);

/**
 * Closed-form damped-harmonic step response from 0 → 1 with zero initial velocity.
 * `t` is seconds since the trigger. Deterministic: no integration drift.
 */
export function spring(t, config = 'pop') {
  if (t <= 0) return 0;
  const { mass, stiffness, damping } = resolveSpring(config);
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
  }
  if (zeta === 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  const s = Math.sqrt(zeta * zeta - 1);
  const r1 = -w0 * (zeta - s);
  const r2 = -w0 * (zeta + s);
  return 1 + (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r1 - r2);
}

/** Seconds until a spring stays within `eps` of rest (used to size exits/holds). */
export function springSettleTime(config = 'pop', eps = 0.005) {
  for (let t = 0; t < 5; t += 1 / 120) {
    let settled = true;
    for (let k = 0; k <= 30; k++) {
      if (Math.abs(1 - spring(t + k / 120, config)) > eps) {
        settled = false;
        break;
      }
    }
    if (settled) return t;
  }
  return 5;
}

/**
 * Spring-driven keyframe track (trigger semantics).
 * Each key marks the moment a change is *triggered* (e.g. an audio cue), and
 * the value springs toward it from wherever it currently is. Implemented as a
 * superposition of step responses, which is exactly how a linear spring
 * retargets mid-flight — so overlapping cues blend with real inertia.
 *
 * keys: [{ t, value | ...numeric props, spring? }]. Non-numeric props step at t.
 */
export function springTrack(keys, t, defaultSpring = 'gentle') {
  if (!keys || keys.length === 0) return {};
  const out = { ...keys[0] };
  delete out.t;
  delete out.spring;
  delete out.ease;
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    const prev = keys.slice(0, i).reduce((acc, kk) => ({ ...acc, ...kk }), {});
    const p = spring(t - k.t, k.spring || defaultSpring);
    for (const name of Object.keys(k)) {
      if (name === 't' || name === 'spring' || name === 'ease') continue;
      const a = prev[name];
      const b = k[name];
      if (typeof a === 'number' && typeof b === 'number') {
        out[name] = (out[name] ?? a) + (b - a) * p;
      } else if (a && b && typeof a === 'object' && typeof b === 'object') {
        const nested = out[name] ? { ...out[name] } : { ...a };
        for (const sub of Object.keys(b)) {
          if (typeof a[sub] === 'number' && typeof b[sub] === 'number') nested[sub] = (nested[sub] ?? a[sub]) + (b[sub] - a[sub]) * p;
          else if (t >= k.t) nested[sub] = b[sub];
        }
        out[name] = nested;
      } else if (t >= k.t) {
        out[name] = b; // discrete values (action, expression) switch on the trigger
      }
    }
  }
  return out;
}

/* ============================ CUBIC BEZIER ============================== */
/** CSS-equivalent cubic-bezier(x1, y1, x2, y2) easing → function(t). */
export function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (u) => ((ax * u + bx) * u + cx) * u;
  const sy = (u) => ((ay * u + by) * u + cy) * u;
  const dx = (u) => (3 * ax * u + 2 * bx) * u + cx;
  const solveX = (x) => {
    let u = x;
    for (let i = 0; i < 8; i++) {
      const err = sx(u) - x;
      if (Math.abs(err) < 1e-6) return u;
      const d = dx(u);
      if (Math.abs(d) < 1e-6) break;
      u -= err / d;
    }
    let lo = 0;
    let hi = 1;
    u = x;
    while (hi - lo > 1e-6) {
      if (sx(u) < x) lo = u;
      else hi = u;
      u = (lo + hi) / 2;
    }
    return u;
  };
  return (t) => (t <= 0 ? 0 : t >= 1 ? 1 : sy(solveX(t)));
}

/**
 * Named eases for duration-based tweens (camera tracks, intra-element sweeps).
 * UI entrances should use SPRINGS; `linear` is intentionally absent.
 */
export const EASE = {
  popOut: cubicBezier(0.34, 1.56, 0.64, 1), // overshoot + settle (studio standard pop)
  cinematic: cubicBezier(0.45, 0, 0.15, 1), // camera: soft start, long luxurious settle
  glide: cubicBezier(0.22, 1, 0.36, 1), // easeOutQuint-like, for sweeps / slides
  anticipate: cubicBezier(0.36, 0, 0.66, -0.56), // slight pull-back before an exit
  exit: cubicBezier(0.55, 0, 1, 0.45),
};

export const resolveEase = (name) => {
  if (typeof name === 'function') return name;
  if (Array.isArray(name)) return cubicBezier(...name);
  return EASE[name] || EASE.cinematic;
};

/* ============================== HELPERS ================================= */
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const framesToSec = (f, fps = MOTION_CONFIG.fps) => f / fps;

/**
 * Entrance/exit envelope for a UI element, spring-based.
 *  inP  : spring progress since `start` (overshoots past 1 — use for scale/translate)
 *  alpha: opacity (clamped, eases in fast and out on exit)
 *  outP : 1 → 0 during the exit window ending at `end`
 */
export function envelope(t, start, end, { spring: sp = 'pop', fps = MOTION_CONFIG.fps, exitFrames = MOTION_CONFIG.exitFrames } = {}) {
  if (t < start || t > end) return { visible: false, inP: 0, outP: 0, alpha: 0, local: t - start };
  const local = t - start;
  const inP = spring(local, sp);
  const exitDur = exitFrames / fps;
  const outP = 1 - spring(t - (end - exitDur), 'exit');
  const alpha = clamp(spring(local, 'snappy') * 1.2, 0, 1) * clamp(outP, 0, 1);
  return { visible: true, inP, outP, alpha, local };
}

/**
 * Intra-element stagger: progress for sub-item `i` (word, line, puff) where each
 * item starts `gapFrames` after the previous one.
 */
export function staggered(local, i, { gapFrames = MOTION_CONFIG.stagger.wordFrames, spring: sp = 'pop', fps = MOTION_CONFIG.fps, delay = 0 } = {}) {
  return spring(local - delay - (i * gapFrames) / fps, sp);
}

/**
 * Parallax camera transform for a layer at `depth`.
 * cam: { zoom, x, y } in world coords (x,y = focus point).
 */
export function parallaxTransform(cam, depth, canvas, drift = { x: 0, y: 0 }) {
  const W = canvas.width;
  const H = canvas.height;
  const z = 1 + (cam.zoom - 1) * depth;
  const fx = W / 2 + (cam.x - W / 2) * depth - drift.x * depth;
  const fy = H / 2 + (cam.y - H / 2) * depth - drift.y * depth;
  return `translate(${W / 2} ${H / 2}) scale(${z}) translate(${-fx} ${-fy})`;
}
