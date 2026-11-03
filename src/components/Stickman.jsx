/**
 * Innersetlog Stickman Rig
 * ------------------------------------------------------------------
 * Programmatic SVG character built to STYLE_GUIDE.md:
 *   - Oversized #F7EFE2 head, #111111 outline (20px)
 *   - #DFD6C5 crescent cel-shade on the back-right of the head (no gradients)
 *   - Dot eyes, floating curved brows (8px), firm line / gentle smile mouth
 *   - #111111 limbs/torso at 24px, round caps + joins
 *   - Fixed bone lengths everywhere (FK + IK) -> clean joint bends, no noodle stretch
 *
 * Time-driven and deterministic: pass `time` in seconds (e.g. frame / fps).
 * Works in a plain rAF loop or inside Remotion (useCurrentFrame()/fps).
 *
 * Coordinates: (x, y) is the point between the feet on the ground plane,
 * in composition pixels. `scale` 1 ≈ 760px tall character.
 */
import React from 'react';

export const PALETTE = {
  ink: '#111111',
  skin: '#F7EFE2',
  shade: '#DFD6C5',
};

export const STROKE = {
  head: 20, // 18–22
  limb: 24, // 20–26
  brow: 8, // 6–10
  mouth: 8,
};

// Bone lengths in rig units (scale 1). Never change these per-frame.
export const BONES = {
  thigh: 115,
  shin: 110,
  torso: 230,
  neck: 22,
  upperArm: 105,
  forearm: 100,
  headR: 138,
};

/* ----------------------------- math helpers ----------------------------- */
const rad = (d) => (d * Math.PI) / 180;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
const polar = (o, len, angDeg) => ({
  x: o.x + len * Math.cos(rad(angDeg)),
  y: o.y + len * Math.sin(rad(angDeg)),
});

/** Deterministic hash -> [0,1). Keeps blinks identical on every render. */
const hash01 = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/**
 * Forward kinematics for a 2-bone limb.
 * a1: absolute angle of the first bone (deg, 0 = +x/right, 90 = down)
 * a2: bend at the middle joint relative to bone 1 (deg)
 */
export function fk(origin, len1, len2, a1, a2) {
  const mid = polar(origin, len1, a1);
  const end = polar(mid, len2, a1 + a2);
  return { mid, end };
}

/**
 * Two-bone analytic IK. Bone lengths are preserved exactly; if the target is
 * out of reach the limb straightens and points at it instead of stretching.
 * bend: +1 / -1 picks which side the elbow/knee folds to.
 */
export function solveIK(origin, target, len1, len2, bend = 1) {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const d = clamp(Math.hypot(dx, dy), Math.abs(len1 - len2) + 0.01, len1 + len2 - 0.01);
  const base = Math.atan2(dy, dx);
  const cosA = clamp((len1 * len1 + d * d - len2 * len2) / (2 * len1 * d), -1, 1);
  const a = Math.acos(cosA);
  const shoulderAng = base - bend * a;
  const mid = { x: origin.x + len1 * Math.cos(shoulderAng), y: origin.y + len1 * Math.sin(shoulderAng) };
  const end = { x: origin.x + d * Math.cos(base), y: origin.y + d * Math.sin(base) };
  return { mid, end };
}

/* -------------------------------- poses -------------------------------- */
// Angles: [boneAngle, jointBend] in degrees (0 = screen-right, 90 = down).
// Default facing = 1: face turned toward screen-left, so desks/work go on the left.
export const POSES = {
  stand: {
    legL: [101, -5],
    legR: [79, 5],
    armL: [100, -12],
    armR: [80, 12],
    lean: 0,
  },
  sit: {
    // side-ish seated pose: thighs forward, shins down
    legL: [-6, 98],
    legR: [4, 88],
    armL: [70, -40],
    armR: [60, -30],
    lean: -4,
    hipLift: 120, // hip height above (x,y) when sitting on a chair
  },
  armsCrossed: {
    legL: [96, -4],
    legR: [84, 4],
    armL: [60, 130],
    armR: [120, -130],
    lean: 0,
  },
  shrug: {
    legL: [96, -4],
    legR: [84, 4],
    armL: [150, 100],
    armR: [30, -100],
    lean: 0,
  },
};

/* ------------------------------ expressions ----------------------------- */
// brows: [innerYOffset, outerYOffset, curve]; mouth: shape + curve
export const EXPRESSIONS = {
  neutral: { brow: [0, 0, -6], mouth: 'firm', curve: 0 },
  smile: { brow: [-2, 0, -8], mouth: 'smile', curve: 16 },
  focused: { brow: [5, -3, -4], mouth: 'firm', curve: 0 },
  raised: { brow: [-16, -12, -10], mouth: 'firm', curve: 4 },
  concerned: { brow: [-14, 6, -4], mouth: 'frown', curve: -10 },
  surprised: { brow: [-22, -18, -12], mouth: 'o', curve: 0 },
  thinking: { brow: [-14, 2, -6], mouth: 'firm', curve: -2 },
};

/* ------------------------------ animation ------------------------------ */
/** Returns eye openness 1 (open) -> 0 (closed) on a natural pseudo-random schedule. */
export function blinkAmount(time, seed = 0) {
  // blinks every 2.8–5.0s, each lasting ~0.16s
  let t = 0;
  let i = 0;
  while (t <= time + 0.5 && i < 10000) {
    const interval = 2.8 + hash01(i + seed * 97) * 2.2;
    const start = t + interval;
    const dur = 0.16;
    if (time >= start && time <= start + dur) {
      const p = (time - start) / dur;
      return Math.abs(1 - 2 * p); // 1 -> 0 -> 1
    }
    if (start > time) break;
    t = start;
    i++;
  }
  return 1;
}

const breath = (time) => Math.sin((time * Math.PI * 2) / 3.8); // ~3.8s breathing cycle

/* ------------------------------- the rig ------------------------------- */
function Limb({ a, b, c, width = STROKE.limb }) {
  return (
    <path
      d={`M${a.x},${a.y} L${b.x},${b.y} L${c.x},${c.y}`}
      fill="none"
      stroke={PALETTE.ink}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function Head({ cx, cy, r, time, expression, gaze, blinkSeed, tilt, talk }) {
  const ex = EXPRESSIONS[expression] || EXPRESSIONS.neutral;
  const open = blinkAmount(time, blinkSeed);
  const clipId = `head-clip-${blinkSeed}`;

  // Face features sit slightly toward screen-left (3/4 view), back of head = right.
  const fx = cx - r * 0.12 + gaze.x * r * 0.14;
  const fy = cy + r * 0.05 + gaze.y * r * 0.1;
  const eyeGap = r * 0.36;
  const eyeR = r * 0.085;
  const eyeY = fy - r * 0.04;
  const browY = eyeY - r * 0.27;

  const [bi, bo, bc] = ex.brow;
  const brow = (side) => {
    // side: -1 = screen-left eye, +1 = screen-right eye
    const ex0 = fx + side * eyeGap;
    const inner = { x: ex0 - side * r * 0.13, y: browY + bi };
    const outer = { x: ex0 + side * r * 0.13, y: browY + bo };
    const ctrl = { x: (inner.x + outer.x) / 2, y: (inner.y + outer.y) / 2 + bc };
    return `M${inner.x},${inner.y} Q${ctrl.x},${ctrl.y} ${outer.x},${outer.y}`;
  };

  // Simple talk cycle opens the mouth slightly when `talk` is true.
  const talkOpen = talk ? Math.max(0, Math.sin(time * 22)) * 0.6 + Math.max(0, Math.sin(time * 13.7)) * 0.4 : 0;
  const mouthY = fy + r * 0.38;
  const mw = r * 0.26;
  let mouth;
  if (ex.mouth === 'o' || talkOpen > 0.15) {
    const ry = ex.mouth === 'o' ? r * 0.09 : r * 0.03 + talkOpen * r * 0.07;
    mouth = <ellipse cx={fx} cy={mouthY} rx={r * 0.08} ry={ry} fill={PALETTE.ink} />;
  } else {
    const d = `M${fx - mw},${mouthY} Q${fx},${mouthY + ex.curve} ${fx + mw},${mouthY}`;
    mouth = (
      <path d={d} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.mouth} strokeLinecap="round" />
    );
  }

  return (
    <g transform={`rotate(${tilt} ${cx} ${cy + r})`}>
      <defs>
        <clipPath id={clipId}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      {/* Cel shade: shade-filled disc, then skin disc offset toward the face -> crescent on back-right */}
      <g clipPath={`url(#${clipId})`}>
        <circle cx={cx} cy={cy} r={r} fill={PALETTE.shade} />
        <circle cx={cx - r * 0.2} cy={cy - r * 0.08} r={r * 0.97} fill={PALETTE.skin} />
      </g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.head} />

      {/* Eyes (blink = squash the dot vertically) */}
      {[-1, 1].map((s) => (
        <ellipse
          key={s}
          cx={fx + s * eyeGap}
          cy={eyeY}
          rx={eyeR}
          ry={Math.max(eyeR * open, 2.5)}
          fill={PALETTE.ink}
        />
      ))}

      {/* Floating brows */}
      {[-1, 1].map((s) => (
        <path
          key={s}
          d={brow(s)}
          fill="none"
          stroke={PALETTE.ink}
          strokeWidth={STROKE.brow}
          strokeLinecap="round"
        />
      ))}

      {mouth}
    </g>
  );
}

/**
 * <Stickman />
 *
 * Props
 *  x, y         feet position (composition px)
 *  scale        uniform scale (default 1)
 *  facing       1 = default 3/4 view (face toward screen-left), -1 = mirrored
 *  time         seconds (drives breathing, blinking, actions)
 *  pose         key of POSES or a full pose object
 *  action       'idle' | 'writing' | 'thinking' | 'pointing' | 'wave' | 'talking'
 *  expression   key of EXPRESSIONS
 *  gaze         {x,y} in -1..1, shifts face features
 *  handTarget   {x,y} composition px – where the right hand works (writing) or points
 *  arms         optional overrides: { armL: [a1,a2] | {x,y}, armR: ... } ({x,y} = IK target in comp px)
 *  blinkSeed    vary per character so blinks don't sync
 */
export default function Stickman({
  x = 540,
  y = 1500,
  scale = 1,
  facing = 1,
  time = 0,
  pose = 'stand',
  action = 'idle',
  expression,
  gaze = { x: 0, y: 0 },
  handTarget,
  arms = {},
  blinkSeed = 1,
}) {
  const P = typeof pose === 'string' ? POSES[pose] || POSES.stand : pose;
  const b = breath(time);

  // Convert a composition-space point into rig-local space.
  const toLocal = (pt) => ({ x: ((pt.x - x) / scale) * facing, y: (pt.y - y) / scale });

  /* ---- skeleton (all bones fixed length) ---- */
  const hipY = -(P.hipLift ?? BONES.thigh + BONES.shin - 6);
  const hip = { x: 0, y: hipY };
  const actionLean = action === 'writing' ? -9 : action === 'thinking' ? -2 : 0;
  const lean = (P.lean || 0) + actionLean + b * 0.8; // breathing = gentle rock, not stretch
  const shoulder = polar(hip, BONES.torso, -90 + lean);
  const neckTop = polar(shoulder, BONES.neck, -90 + lean * 1.4);
  const headTilt = lean * 0.6 + (action === 'thinking' ? -6 : 0) + (action === 'writing' ? -10 : 0);
  const head = polar(neckTop, BONES.headR - 6, -90 + lean * 1.4);

  // Shoulder sockets sit just below the neck so arms read as attached.
  const sock = { x: shoulder.x, y: shoulder.y + 14 - b * 2 };

  /* ---- legs ---- */
  const legL = fk(hip, BONES.thigh, BONES.shin, P.legL[0], P.legL[1]);
  const legR = fk(hip, BONES.thigh, BONES.shin, P.legR[0], P.legR[1]);

  /* ---- arms ---- */
  const solveArm = (key, def, bend) => {
    const o = arms[key];
    if (o && typeof o.x === 'number') {
      return solveIK(sock, toLocal(o), BONES.upperArm, BONES.forearm, bend);
    }
    const ang = Array.isArray(o) ? o : def;
    return fk(sock, BONES.upperArm, BONES.forearm, ang[0], ang[1]);
  };

  let armL = solveArm('armL', P.armL, -1);
  let armR = solveArm('armR', P.armR, 1);

  // Action overrides (only if the caller didn't override that arm explicitly)
  if (!arms.armR) {
    if (action === 'writing') {
      const base = handTarget ? toLocal(handTarget) : { x: -150, y: sock.y + 150 };
      // small cursive scribble loop + slow line advance
      const adv = (time * 18) % 70;
      const tgt = {
        x: base.x - 35 + adv + Math.sin(time * 14) * 6,
        y: base.y + Math.cos(time * 14) * 5 + Math.sin(time * 3.1) * 2,
      };
      armR = solveIK(sock, tgt, BONES.upperArm, BONES.forearm, -1);
    } else if (action === 'thinking') {
      // hand to chin
      const chin = { x: head.x - BONES.headR * 0.15, y: head.y + BONES.headR * 0.95 };
      armR = solveIK(sock, chin, BONES.upperArm, BONES.forearm, 1);
    } else if (action === 'pointing') {
      const tgt = handTarget ? toLocal(handTarget) : { x: -420, y: sock.y - 260 };
      armR = solveIK(sock, tgt, BONES.upperArm, BONES.forearm, 1);
    } else if (action === 'wave') {
      const w = Math.sin(time * 9) * 18;
      armR = fk(sock, BONES.upperArm, BONES.forearm, -140, 60 + w);
    }
  }
  if (!arms.armL && action === 'writing') {
    // off-hand rests flat on the desk to hold the paper
    const base = handTarget ? toLocal(handTarget) : { x: -150, y: sock.y + 150 };
    armL = solveIK(sock, { x: base.x + 120, y: base.y + 10 }, BONES.upperArm, BONES.forearm, 1);
  }

  const resolvedExpression =
    expression || (action === 'thinking' ? 'thinking' : action === 'writing' ? 'focused' : 'neutral');
  const resolvedGaze =
    action === 'writing' ? { x: gaze.x - 0.2, y: Math.max(gaze.y, 0.6) } : gaze;

  const handOverFace = action === 'thinking' && !arms.armR;

  return (
    <g transform={`translate(${x} ${y}) scale(${scale * facing} ${scale})`} data-rig="stickman">
      {/* legs */}
      <Limb a={hip} b={legL.mid} c={legL.end} />
      <Limb a={hip} b={legR.mid} c={legR.end} />

      {/* torso + neck (single rigid stroke) */}
      <Limb a={hip} b={shoulder} c={neckTop} />

      {/* arms */}
      <Limb a={sock} b={armL.mid} c={armL.end} />
      {!handOverFace && <Limb a={sock} b={armR.mid} c={armR.end} />}

      {/* head on top */}
      <Head
        cx={head.x}
        cy={head.y}
        r={BONES.headR}
        time={time}
        expression={resolvedExpression}
        gaze={resolvedGaze}
        blinkSeed={blinkSeed}
        tilt={headTilt}
        talk={action === 'talking'}
      />

      {/* hand-to-chin must sit in front of the face */}
      {handOverFace && <Limb a={sock} b={armR.mid} c={armR.end} />}
    </g>
  );
}
