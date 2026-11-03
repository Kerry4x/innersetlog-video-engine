/**
 * Innersetlog Stickman Rig
 * ------------------------------------------------------------------
 * SOURCE OF TRUTH: docs/CHARACTER_RIG.md. Every coordinate below that the
 * spec defines is taken from it verbatim; see RIG and EXPRESSIONS.
 *
 * Coordinate conventions
 *  - Skeleton anchors in the spec are pelvis-relative with +y UP
 *    (spine top (0,165) sits above the pelvis). They are converted to SVG
 *    (+y down) exactly once, in `up()`.
 *  - Facial offsets in the spec are relative to the face anchor (fx, fy) with
 *    +y DOWN (the mouth at fy+58 is below the eyes), i.e. already SVG space.
 *  - The face anchor (fx, fy) == head center hC at rest. Only animation
 *    inputs (gaze, headTurn) move it; with both at 0 the face is exact.
 *
 * Proportions: spine 165 + head diameter 200 + leg reach 235 = 600 standing
 * height, so the head is exactly 1/3 of total height (spec §1).
 *
 * Z-order (spec §4): the rig renders in parts so the compositor can interleave
 * it with the scene: part="back" (torso + back limbs, layer 3), part="head"
 * (layer 4), part="front" (foreground limbs + hand props, layer 5).
 * part="all" renders all three in order for standalone use.
 *
 * All motion is a pure function of `time` (seconds) → deterministic frames.
 * `x, y` is the ground point between the feet, in composition pixels.
 */
import React, { useId } from 'react';

/* ============================= SPEC CONSTANTS ============================ */
export const PALETTE = {
  ink: '#111111',
  skin: '#F7EFE2', // never #FFFFFF
  shade: '#DFD6C5',
};

export const STROKE = {
  head: 20, // spec 18–22
  limb: 24, // spec 20–26
  brow: 8, // STYLE_GUIDE 6–10
  mouth: 8,
  eyelid: 10, // "heavy horizontal eyelid bars"
};

export const HAND_R = 0.58 * STROKE.limb; // spec §2: 0.58 × limb stroke width

/** Spec §2 anchors, pelvis-relative, +y UP. */
export const RIG = {
  pelvis: { x: 0, y: 0 },
  spineTop: { x: 0, y: 165 },
  shoulderL: { x: -40, y: 140 },
  shoulderR: { x: 40, y: 140 },
  headR: 100, // diameter 200 = 1/3 of 600 standing height
  // Bone lengths (not specified by the spec; sized to hit the 1/3 head ratio)
  thigh: 120,
  shin: 115,
  upperArm: 100,
  forearm: 95,
  armBow: 0.05, // "slight natural organic curve/bow outward": 5% of bone length
};

/* ================================ MATH =================================== */
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
const up = (p) => ({ x: p.x, y: -p.y }); // spec (+y up) → SVG (+y down)
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
const polar = (o, len, angDeg) => ({ x: o.x + len * Math.cos(rad(angDeg)), y: o.y + len * Math.sin(rad(angDeg)) });
const rotateAbout = (p, o, angDeg) => {
  const c = Math.cos(rad(angDeg));
  const s = Math.sin(rad(angDeg));
  const dx = p.x - o.x;
  const dy = p.y - o.y;
  return { x: o.x + dx * c - dy * s, y: o.y + dx * s + dy * c };
};

const hash01 = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Forward kinematics, 2 bones. a1 absolute (0 = +x, 90 = down), a2 bend relative to bone 1. */
export function fk(origin, len1, len2, a1, a2) {
  const mid = polar(origin, len1, a1);
  const end = polar(mid, len2, a1 + a2);
  return { mid, end };
}

/** Analytic 2-bone IK. Bone lengths are exact; out-of-reach targets straighten the limb toward them. */
export function solveIK(origin, target, len1, len2, bend = 1) {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const d = clamp(Math.hypot(dx, dy), Math.abs(len1 - len2) + 0.01, len1 + len2 - 0.01);
  const base = Math.atan2(dy, dx);
  const a = Math.acos(clamp((len1 * len1 + d * d - len2 * len2) / (2 * len1 * d), -1, 1));
  const ang = base - bend * a;
  const mid = { x: origin.x + len1 * Math.cos(ang), y: origin.y + len1 * Math.sin(ang) };
  const end = { x: origin.x + d * Math.cos(base), y: origin.y + d * Math.sin(base) };
  return { mid, end };
}

/* ================================ POSES ================================== */
// Legs/arms as [boneAngle, jointBend] degrees (0 = screen-right, 90 = down).
export const POSES = {
  stand: { legL: [101, -5], legR: [79, 5], armL: [100, -10], armR: [80, 10], lean: 0 },
  sit: { legL: [-6, 98], legR: [4, 88], armL: [70, -40], armR: [60, -30], lean: -4 },
  // elbows drop, forearms fold horizontally across the chest at slightly different heights
  armsCrossed: { legL: [101, -5], legR: [79, 5], armL: [100, -100], armR: [84, 98], lean: 0 },
  shrug: { legL: [101, -5], legR: [79, 5], armL: [150, 100], armR: [30, -100], lean: 0 },
};

/* ======================= SPEC §3 FACIAL EXPRESSIONS ====================== */
// Offsets relative to (fx, fy), +y down. Endpoints marked SPEC are verbatim.
// Control points are the only derived values: a quadratic needs one and the
// spec gives endpoints. `arch` lifts a brow's control point; `sag` drops the
// mouth's control point below its chord (positive = upward smile).
const EYES = { r: 14.5, L: { x: -42, y: 6 }, R: { x: 42, y: -3 } }; // SPEC

export const EXPRESSIONS = {
  content: {
    eyes: 'open',
    browL: { from: [-62, -22], to: [-26, -30], arch: 6 }, // SPEC endpoints
    browR: { from: [24, -40], to: [62, -32], arch: 6 }, // SPEC endpoints
    mouth: { from: [-16, 58], to: [50, 36], sag: 14 }, // SPEC endpoints
  },
  focused: {
    eyes: 'open', // SPEC: same 14.5 radius
    // SPEC: "low, flat horizontal determination lines" — straight, just above
    // each eye (eye top = eyeY − 14.5), following the eyes' 9px height offset.
    browL: { from: [-62, -16], to: [-24, -16], arch: 0 },
    browR: { from: [24, -25], to: [62, -25], arch: 0 },
    mouth: { from: [-32, 52], to: [38, 48], sag: 0 }, // SPEC
  },
  tired: {
    eyes: 'half', // SPEC: top half covered by heavy horizontal lid bars
    // Brows not specified for `tired`: relaxed, slightly lowered `content` brows.
    browL: { from: [-62, -18], to: [-26, -24], arch: 3 },
    browR: { from: [24, -32], to: [62, -26], arch: 3 },
    mouth: { from: [0, 52], to: [26, 52], sag: 0 }, // SPEC: short, flat
  },
};

const resolveExpression = (name) => {
  if (EXPRESSIONS[name]) return EXPRESSIONS[name];
  if (name && typeof console !== 'undefined') console.warn(`[Stickman] unknown expression "${name}" — using "content"`);
  return EXPRESSIONS.content;
};

/* =============================== ANIMATION =============================== */
/** Eye openness 1 → 0 → 1 on a natural, deterministic schedule (blinks every 2.8–5.0s, 0.16s long). */
export function blinkAmount(time, seed = 0) {
  let t = 0;
  for (let i = 0; i < 10000; i++) {
    const start = t + 2.8 + hash01(i + seed * 97) * 2.2;
    if (time >= start && time <= start + 0.16) return Math.abs(1 - 2 * ((time - start) / 0.16));
    if (start > time) break;
    t = start;
  }
  return 1;
}

const breath = (time) => Math.sin((time * Math.PI * 2) / 3.8);

/* ============================== RIG SOLVER =============================== */
/**
 * Solve the full skeleton for one frame. Pure function shared by all parts,
 * so the back/head/front layers always agree. Points are rig-local SVG space
 * (origin = ground point between the feet, +y down).
 */
export function solveRig(props) {
  const {
    x = 540,
    y = 1500,
    scale = 1,
    facing = 1,
    time = 0,
    pose = 'stand',
    action = 'idle',
    handTarget,
    arms = {},
    headTurn = 0,
  } = props;
  const P = typeof pose === 'string' ? POSES[pose] || POSES.stand : pose;
  const b = breath(time);
  const toLocal = (pt) => ({ x: ((pt.x - x) / scale) * facing, y: (pt.y - y) / scale });

  // Legs from the pelvis, then lift so the lowest foot rests on the ground.
  const p0 = { x: 0, y: 0 };
  const legL0 = fk(p0, RIG.thigh, RIG.shin, P.legL[0], P.legL[1]);
  const legR0 = fk(p0, RIG.thigh, RIG.shin, P.legR[0], P.legR[1]);
  const pelvis = { x: 0, y: -Math.max(legL0.end.y, legR0.end.y) };
  const legL = { mid: add(legL0.mid, pelvis), end: add(legL0.end, pelvis) };
  const legR = { mid: add(legR0.mid, pelvis), end: add(legR0.end, pelvis) };

  // Torso frame: spec anchors, rotated rigidly about the pelvis by lean
  // (breathing is a gentle rock, so no anchor ever moves relative to another).
  const actionLean = action === 'writing' ? -9 : action === 'thinking' ? -2 : 0;
  const lean = (P.lean || 0) + actionLean + b * 0.8;
  const T = (p) => rotateAbout(add(pelvis, up(p)), pelvis, lean);
  const spineTop = T(RIG.spineTop);
  const shoulderL = T(RIG.shoulderL);
  const shoulderR = T(RIG.shoulderR);
  const clavicle = T({ x: 0, y: RIG.shoulderL.y }); // spine point at shoulder height
  const headC = T({ x: 0, y: RIG.spineTop.y + RIG.headR }); // head rests on the neck connection
  const headTilt = lean * 0.6 + headTurn * 4 + (action === 'thinking' ? -6 : 0) + (action === 'writing' ? -10 : 0);
  const hC = rotateAbout(headC, spineTop, headTilt); // world-space head center after tilt

  // Arms
  const solveArm = (key, shoulder, def, bend) => {
    const o = arms[key];
    if (o && typeof o.x === 'number') return solveIK(shoulder, toLocal(o), RIG.upperArm, RIG.forearm, bend);
    const ang = Array.isArray(o) ? o : def;
    return fk(shoulder, RIG.upperArm, RIG.forearm, ang[0], ang[1]);
  };
  let armL = solveArm('armL', shoulderL, P.armL, -1);
  let armR = solveArm('armR', shoulderR, P.armR, 1);

  const deskPt = handTarget ? toLocal(handTarget) : { x: -160, y: shoulderR.y + 150 };
  if (!arms.armR) {
    if (action === 'writing') {
      const adv = (time * 18) % 70; // slow line advance + small cursive loop
      const tgt = {
        x: deskPt.x - 35 + adv + Math.sin(time * 14) * 6,
        y: deskPt.y + Math.cos(time * 14) * 5 + Math.sin(time * 3.1) * 2,
      };
      armR = solveIK(shoulderR, tgt, RIG.upperArm, RIG.forearm, -1);
    } else if (action === 'thinking') {
      // hand to chin, just below the mouth
      // hand under the chin, elbow dropped and out to the front side
      armR = solveIK(shoulderR, { x: hC.x + 26, y: hC.y + RIG.headR * 1.02 }, RIG.upperArm, RIG.forearm, -1);
    } else if (action === 'wave') {
      // upper arm out to the front side, forearm up; never crosses the face
      armR = fk(shoulderR, RIG.upperArm, RIG.forearm, -18, -62 + Math.sin(time * 9) * 18);
    }
  }
  if (action === 'pointing') {
    // point with the arm on the target's side so the limb never crosses the face
    // and extend it ~95% of full reach along the aim line (near-straight, elbow just below the line).
    const tgt = handTarget ? toLocal(handTarget) : { x: -420, y: shoulderR.y - 260 };
    const aim = (sh) => {
      const ang = Math.atan2(tgt.y - sh.y, tgt.x - sh.x);
      const reach = (RIG.upperArm + RIG.forearm) * 0.95;
      return { x: sh.x + Math.cos(ang) * reach, y: sh.y + Math.sin(ang) * reach };
    };
    if (tgt.x < 0 && !arms.armL) armL = solveIK(shoulderL, aim(shoulderL), RIG.upperArm, RIG.forearm, 1);
    else if (tgt.x >= 0 && !arms.armR) armR = solveIK(shoulderR, aim(shoulderR), RIG.upperArm, RIG.forearm, -1);
  }
  if (!arms.armL && action === 'writing') {
    // back hand holds the page down, to the left of the pen
    armL = solveIK(shoulderL, { x: deskPt.x - 110, y: deskPt.y + 6 }, RIG.upperArm, RIG.forearm, -1);
  }

  return { pelvis, legL, legR, spineTop, clavicle, shoulderL, shoulderR, armL, armR, headC, hC, headTilt, lean };
}

/* =============================== DRAWING ================================= */
const strokeProps = (w) => ({
  fill: 'none',
  stroke: PALETTE.ink,
  strokeWidth: w,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
});

/** Straight polyline limb (legs, spine). */
function Segment({ pts, w = STROKE.limb }) {
  return <path d={'M' + pts.map((p) => `${p.x},${p.y}`).join(' L')} {...strokeProps(w)} />;
}

/**
 * Arm: clavicle → shoulder, then each bone as a quadratic bowed slightly away
 * from the shoulder–wrist chord (spec §2: organic bow outward, never rigid),
 * terminated by a solid hand circle of radius 0.58 × limb stroke.
 */
function Arm({ clavicle, shoulder, arm }) {
  const { mid: elbow, end: wrist } = arm;
  const chordMid = { x: (shoulder.x + wrist.x) / 2, y: (shoulder.y + wrist.y) / 2 };
  const away = { x: elbow.x - chordMid.x, y: elbow.y - chordMid.y };
  const ref = Math.hypot(away.x, away.y) > 0.5 ? away : { x: shoulder.x, y: 1 }; // straight arm: bow outward/down
  const ctrl = (a, b2) => {
    const len = Math.hypot(b2.x - a.x, b2.y - a.y) || 1;
    let n = { x: -(b2.y - a.y) / len, y: (b2.x - a.x) / len };
    if (n.x * ref.x + n.y * ref.y < 0) n = { x: -n.x, y: -n.y };
    const k = RIG.armBow * len;
    return { x: (a.x + b2.x) / 2 + n.x * k, y: (a.y + b2.y) / 2 + n.y * k };
  };
  const c1 = ctrl(shoulder, elbow);
  const c2 = ctrl(elbow, wrist);
  return (
    <g>
      <path
        d={`M${clavicle.x},${clavicle.y} L${shoulder.x},${shoulder.y} Q${c1.x},${c1.y} ${elbow.x},${elbow.y} Q${c2.x},${c2.y} ${wrist.x},${wrist.y}`}
        {...strokeProps(STROKE.limb)}
      />
      <circle cx={wrist.x} cy={wrist.y} r={HAND_R} fill={PALETTE.ink} />
    </g>
  );
}

/* ----------------------------- hand props -------------------------------- */
// Built-in vector props, drawn in the hand frame: origin = hand center (tx, ty),
// +x = wrist angle vector (elbow → wrist). `rotate` is the resting grip angle.
export const PROP_LIBRARY = {
  pen: {
    rotate: -70,
    draw: () => (
      <g>
        <line x1={-18} y1={0} x2={58} y2={0} stroke={PALETTE.ink} strokeWidth={9} strokeLinecap="round" />
        <line x1={44} y1={0} x2={58} y2={0} stroke="#E4572E" strokeWidth={9} strokeLinecap="round" />
      </g>
    ),
  },
  phone: {
    rotate: -90,
    draw: () => (
      <g>
        <rect x={-6} y={-48} width={52} height={92} rx={10} fill={PALETTE.ink} />
        <rect x={1} y={-40} width={38} height={72} rx={5} fill="#BFD7EA" />
      </g>
    ),
  },
  notebook: {
    rotate: -90,
    draw: () => (
      <g>
        <rect x={-8} y={-70} width={120} height={96} rx={6} fill="#FFFDF8" stroke={PALETTE.ink} strokeWidth={7} />
        {[-50, -32, -14].map((ly, i) => (
          <line key={i} x1={6} y1={ly} x2={i === 2 ? 80 : 98} y2={ly} stroke="#B9B2A6" strokeWidth={5} />
        ))}
      </g>
    ),
  },
  paper: {
    rotate: -90,
    draw: () => (
      <g>
        <rect x={-6} y={-90} width={110} height={140} rx={4} fill="#FFFDF8" stroke={PALETTE.ink} strokeWidth={6} />
        <line x1={10} y1={-66} x2={86} y2={-66} stroke={PALETTE.ink} strokeWidth={7} />
        {[-46, -30, -14].map((ly, i) => (
          <line key={i} x1={10} y1={ly} x2={i === 1 ? 80 : 88} y2={ly} stroke="#B9B2A6" strokeWidth={5} />
        ))}
      </g>
    ),
  },
};

/**
 * A prop anchored at the hand circle (tx, ty) and rotated with the wrist
 * angle vector (spec §4).
 * spec: 'pen' | { type?, src?, w?, h?, render?(), offset?:{x,y}, rotate?, scale? }
 */
function HeldProp({ arm, spec }) {
  const s = typeof spec === 'string' ? { type: spec } : spec;
  const lib = PROP_LIBRARY[s.type] || {};
  const { mid: elbow, end: wrist } = arm;
  const wristAngle = deg(Math.atan2(wrist.y - elbow.y, wrist.x - elbow.x));
  const rot = wristAngle + (s.rotate ?? lib.rotate ?? 0);
  const off = s.offset || { x: 0, y: 0 };
  let body = null;
  if (s.render) body = s.render();
  else if (s.src) body = <image href={s.src} x={0} y={-(s.h || 100) / 2} width={s.w || 100} height={s.h || 100} />;
  else if (lib.draw) body = lib.draw();
  return (
    <g transform={`translate(${wrist.x} ${wrist.y}) rotate(${rot}) scale(${s.scale ?? 1}) translate(${off.x} ${off.y})`}>
      {body}
    </g>
  );
}

/* --------------------------------- head ---------------------------------- */
function Head({ headC, tilt, pivot, time, expression, gaze, blinkSeed, talk, mouthOpen, turn }) {
  const uid = useId().replace(/:/g, '');
  const r = RIG.headR;
  const ex = resolveExpression(expression);
  const open = blinkAmount(time, blinkSeed);
  const tr = clamp(turn, -1, 1);
  const hC = headC; // drawn upright, then the whole head rotates about the neck connection

  // Face anchor: exactly hC at rest; animation inputs offset it.
  const fx = hC.x + tr * r * 0.34 + gaze.x * r * 0.14;
  const fy = hC.y + gaze.y * r * 0.1;
  const sx = tr === 0 ? 1 : 1 - 0.22 * Math.abs(tr); // foreshortening only while turned
  const F = ([dx, dy]) => ({ x: fx + dx * sx, y: fy + dy });

  const brow = ({ from, to, arch }) => {
    const a = F(from);
    const b2 = F(to);
    return `M${a.x},${a.y} Q${(a.x + b2.x) / 2},${(a.y + b2.y) / 2 - arch} ${b2.x},${b2.y}`;
  };

  const m0 = F(ex.mouth.from);
  const m1 = F(ex.mouth.to);
  const mMid = { x: (m0.x + m1.x) / 2, y: (m0.y + m1.y) / 2 };
  const talkOpen =
    typeof mouthOpen === 'number'
      ? clamp(mouthOpen, 0, 1)
      : talk
        ? Math.max(0, Math.sin(time * 22)) * 0.6 + Math.max(0, Math.sin(time * 13.7)) * 0.4
        : 0;
  const mouth =
    talkOpen > 0.15 ? (
      <ellipse cx={mMid.x} cy={mMid.y} rx={14} ry={4 + talkOpen * 12} fill={PALETTE.ink} />
    ) : (
      <path d={`M${m0.x},${m0.y} Q${mMid.x - 4},${mMid.y + ex.mouth.sag} ${m1.x},${m1.y}`} {...strokeProps(STROKE.mouth)} />
    );

  const eye = (side) => {
    const c = F([EYES[side].x, EYES[side].y]);
    const er = EYES.r;
    if (ex.eyes === 'half') {
      const ry = Math.max(er * open, 1.5);
      return (
        <g key={side}>
          {/* lower half of the eye circle (sweep 0 = through the bottom) */}
          <path d={`M${c.x - er},${c.y} A${er},${ry} 0 0 0 ${c.x + er},${c.y} Z`} fill={PALETTE.ink} />
          {/* heavy horizontal lid bar across the top half */}
          <line x1={c.x - er - 5} y1={c.y} x2={c.x + er + 5} y2={c.y} {...strokeProps(STROKE.eyelid)} />
        </g>
      );
    }
    return <ellipse key={side} cx={c.x} cy={c.y} rx={er} ry={Math.max(er * open, 2.5)} fill={PALETTE.ink} />;
  };

  return (
    <g transform={`rotate(${tilt} ${pivot.x} ${pivot.y})`}>
      <defs>
        <clipPath id={`hc${uid}`}>
          <circle cx={hC.x} cy={hC.y} r={r} />
        </clipPath>
      </defs>
      {/* Cel shade: shade disc, then skin disc offset toward the face → crescent on the back-right */}
      <g clipPath={`url(#hc${uid})`}>
        <circle cx={hC.x} cy={hC.y} r={r} fill={PALETTE.shade} />
        <circle cx={hC.x - r * (0.2 - 0.4 * tr)} cy={hC.y - r * 0.08} r={r * 0.97} fill={PALETTE.skin} />
      </g>
      <circle cx={hC.x} cy={hC.y} r={r} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.head} />
      {eye('L')}
      {eye('R')}
      <path d={brow(ex.browL)} {...strokeProps(STROKE.brow)} />
      <path d={brow(ex.browR)} {...strokeProps(STROKE.brow)} />
      {mouth}
    </g>
  );
}

/* ============================== COMPONENT ================================ */
/**
 * <Stickman />
 *  x, y        ground point between the feet (composition px)
 *  scale       uniform scale (1 → 600px standing height)
 *  facing      1 = default, -1 = mirrored
 *  time        seconds (breathing, blinking, actions)
 *  part        'all' | 'back' | 'head' | 'front'  (spec §4 layers 3 / 4 / 5)
 *  pose        key of POSES or a pose object
 *  action      'idle' | 'writing' | 'thinking' | 'pointing' | 'wave' | 'talking'
 *  expression  'content' | 'focused' | 'tired'  (spec §3)
 *  gaze        {x,y} −1..1 face offset
 *  headTurn    −1..1 head rotation (0 = spec rest face)
 *  mouthOpen   0..1 (audio lip-sync)
 *  handTarget  {x,y} composition px — work point for writing / pointing
 *  arms        { armL|armR: [a1,a2] | {x,y} } overrides ({x,y} = IK target, comp px)
 *  hold        { L?: prop, R?: prop } — 'pen' | 'phone' | 'notebook' | 'paper' | custom spec
 *  frontArm    'R' | 'L' — the arm/leg nearest camera (default 'R')
 *  blinkSeed   desync blinks between characters
 */
export default function Stickman(props) {
  const {
    x = 540,
    y = 1500,
    scale = 1,
    facing = 1,
    time = 0,
    part = 'all',
    action = 'idle',
    expression,
    gaze = { x: 0, y: 0 },
    headTurn = 0,
    mouthOpen,
    hold,
    frontArm = 'R',
    blinkSeed = 1,
  } = props;

  const R = solveRig(props);
  const backSide = frontArm === 'R' ? 'L' : 'R';
  const armOf = (s) => (s === 'L' ? R.armL : R.armR);
  const legOf = (s) => (s === 'L' ? R.legL : R.legR);
  const shoulderOf = (s) => (s === 'L' ? R.shoulderL : R.shoulderR);
  const held = hold ?? (action === 'writing' ? { [frontArm]: 'pen' } : {});

  const resolvedExpression = expression || (action === 'writing' || action === 'thinking' ? 'focused' : 'content');
  const resolvedGaze = action === 'writing' ? { x: gaze.x - 0.2, y: Math.max(gaze.y, 0.6) } : gaze;

  return (
    <g transform={`translate(${x} ${y}) scale(${scale * facing} ${scale})`} data-rig="stickman">
      {(part === 'all' || part === 'back') && (
        <g data-part="back">
          <Segment pts={[R.pelvis, legOf(backSide).mid, legOf(backSide).end]} />
          <Segment pts={[R.pelvis, R.spineTop]} />
          <Arm clavicle={R.clavicle} shoulder={shoulderOf(backSide)} arm={armOf(backSide)} />
        </g>
      )}
      {(part === 'all' || part === 'head') && (
        <g data-part="head">
          <Head
            headC={R.headC}
            tilt={R.headTilt}
            pivot={R.spineTop}
            time={time}
            expression={resolvedExpression}
            gaze={resolvedGaze}
            blinkSeed={blinkSeed}
            talk={action === 'talking'}
            mouthOpen={mouthOpen}
            turn={headTurn}
          />
        </g>
      )}
      {(part === 'all' || part === 'front') && (
        <g data-part="front">
          <Segment pts={[R.pelvis, legOf(frontArm).mid, legOf(frontArm).end]} />
          <Arm clavicle={R.clavicle} shoulder={shoulderOf(frontArm)} arm={armOf(frontArm)} />
          {/* hand props: spec §4 layer 5, anchored at each hand circle */}
          {['L', 'R'].map((s) => (held[s] ? <HeldProp key={s} arm={armOf(s)} spec={held[s]} /> : null))}
        </g>
      )}
    </g>
  );
}
