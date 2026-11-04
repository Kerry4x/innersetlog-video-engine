/**
 * Cast Character — full-body Flow poses with in-place face masking.
 * ------------------------------------------------------------------
 * Assets come from Flow master turnaround sheets, sliced by
 * scripts/process_flow_assets.py into manifest.characters[<char_id>]:
 *
 *   poses.pose_N  full body WITH its native head (proportions + stroke weight locked)
 *                 anchor   = feet ground point
 *                 head     = { cx, cy, r } fitted outline circle (outer radius, px)
 *                 view     = front | three_quarter | profile | back
 *                 faceOverlay = true for front / three_quarter
 *                 masked   = same pose with the native head + protrusions cleared (used under overlays)
 *   heads.expr_N  isolated expression heads, each with its own fitted head circle
 *                 the neutral one carries variants { blink, talk, talk_wide }
 *   props.prop_N  signature props
 *
 * No neck slicing: the pose is drawn whole, then (when the pose allows it) the
 * chosen expression head is composited directly over the pose's head circle,
 * scaled so its outline radius equals the pose's r and centered on (cx, cy).
 * Profile / back poses keep their native face (overlays would not match the view).
 *
 * Z-order (docs/CHARACTER_RIG.md §4): part="back" → pose (layer 3),
 * part="head" → expression overlay (layer 4), part="front" → nothing yet (layer 5).
 */
import React from 'react';
import { clamp, spring } from '../engine/motion.js';
import { assetUrl } from '../engine/assets.js';
import { SpriteImage, Placeholder } from './Sprite.jsx';
import { blinkAmount } from './CharacterAssembly.jsx';

const lookup = (manifest, cast) => manifest?.characters?.[cast] || null;

/**
 * Props
 *  manifest, base       asset manifest + URL base
 *  cast                 character id, e.g. 'char_01_lead'
 *  pose                 'pose_1'..'pose_N'
 *  expression           'expr_N' | 'native' (show the pose's own face); default: the character's neutral
 *  part                 'all' | 'back' | 'head' | 'front'
 *  x, y, scale, facing  feet position (comp px), scale, 1 / -1 mirror
 *  time                 global seconds (breath, blink)
 *  headTilt             degrees, rotates the overlay about the head center (springable)
 *  mouthOpen            0..1 from audio lip-sync → variants talk (> 0.2) / talk_wide (> 0.82)
 *  talk                 generic talk cycle when no audio
 *  breathe, blinkSeed
 *  swap                 { pose: {prev, since}, expression: {prev, since} } → crossfades + grounded settle
 */
export default function CastCharacter({
  manifest,
  base = '',
  cast,
  pose = 'pose_1',
  expression,
  part = 'all',
  x = 540,
  y = 1700,
  scale = 1,
  facing = 1,
  time = 0,
  headTilt = 0,
  mouthOpen,
  talk = false,
  breathe = true,
  blinkSeed = 1,
  swap = {},
}) {
  const C = lookup(manifest, cast);
  const f = facing < 0 ? -1 : 1;
  const breath = breathe ? Math.sin((time * Math.PI * 2) / 3.8) : 0;
  const settle = swap.pose && swap.pose.since >= 0 ? 0.98 + 0.02 * clamp(spring(swap.pose.since, 'gentle'), 0, 1) : 1;
  const by = (1 + 0.006 * breath) * settle;
  const fade = (sw) => (sw && sw.prev && sw.since >= 0 ? clamp(spring(sw.since, 'snappy'), 0, 1) : 1);
  const outAlpha = (p) => clamp(2 * (1 - p), 0, 1);

  // With an expression overlay active, draw the pose's masked variant (native head and
  // its protrusions — hair tufts, glasses arms — cleared; the overlay supplies its own).
  const overlayOn = (e) => !!(C && e && e.faceOverlay && e.head && expression !== 'native');
  const poseOf = (id) => {
    const e = C?.poses?.[id];
    if (!e) return { e: null, w: 300, h: 1000, anchor: { x: 150, y: 1000 }, label: `${cast || '?'}/${id}` };
    const src = overlayOn(e) && e.masked ? e.masked : e.src;
    return { e, w: e.w, h: e.h, anchor: e.anchor, href: assetUrl(src, base), label: `${cast}/${id}` };
  };
  const P = poseOf(pose);
  const toWorld = (p) => ({ x: x + (p.x - P.anchor.x) * scale * f, y: y + (p.y - P.anchor.y) * scale * by });
  const poseTransform = (L) => `translate(${x} ${y}) scale(${scale * f} ${scale * by}) translate(${-L.anchor.x} ${-L.anchor.y})`;

  /* ---------------- layer 3: full-body pose (with native head) ---------------- */
  const renderPose = () => {
    const p = fade(swap.pose);
    const out = [];
    if (p < 1 && swap.pose.prev !== pose) {
      const Q = poseOf(swap.pose.prev);
      out.push(
        <g key="prev" transform={poseTransform(Q)} opacity={outAlpha(p)}>
          {Q.href ? <SpriteImage href={Q.href} w={Q.w} h={Q.h} /> : <Placeholder w={Q.w} h={Q.h} label={Q.label} />}
        </g>
      );
    }
    out.push(
      <g key="cur" transform={poseTransform(P)} opacity={p}>
        {P.href ? <SpriteImage href={P.href} w={P.w} h={P.h} /> : <Placeholder w={P.w} h={P.h} label={P.label} />}
      </g>
    );
    return <g data-part="pose">{out}</g>;
  };

  /* ---------------- layer 4: expression overlay on the head circle ---------------- */
  const renderFace = () => {
    if (!C || !P.e || !P.e.faceOverlay || !P.e.head || expression === 'native') return null;
    const exprId = expression || C.neutral;
    const center = toWorld({ x: P.e.head.cx, y: P.e.head.cy });
    const rWorld = P.e.head.r * scale; // breathing scaleY is tiny; keep the face a true circle
    const tilt = (headTilt + breath * 0.5) * f;

    const headOf = (id) => C.heads?.[id] || null;
    const place = (H, href, opacity, key, k = 1) => {
      if (!H?.head) return null;
      const s = (rWorld / H.head.r) * k;
      return (
        <g key={key} opacity={opacity} transform={`translate(${center.x} ${center.y}) rotate(${tilt}) scale(${s * f} ${s}) translate(${-H.head.cx} ${-H.head.cy})`}>
          <SpriteImage href={href} w={H.w} h={H.h} />
        </g>
      );
    };

    const H = headOf(exprId);
    if (!H) return null;
    // Blink / talk variants (generated from the neutral face; only it has them)
    const v = H.variants || {};
    const talkOpen =
      typeof mouthOpen === 'number' ? mouthOpen : talk ? Math.max(0, Math.sin(time * 22)) * 0.6 + Math.max(0, Math.sin(time * 13.7)) * 0.4 : 0;
    let variant = null;
    if (v.talk_wide && talkOpen > 0.82) variant = v.talk_wide;
    else if (v.talk && talkOpen > 0.2) variant = v.talk;
    if (v.blink && blinkAmount(time, blinkSeed) < 0.75) variant = v.blink;
    const href = assetUrl(variant || H.src, base);

    const p = fade(swap.expression);
    const settleK = 1 + 0.015 * (1 - clamp(spring(swap.expression?.since ?? 9, 'gentle'), 0, 1));
    const out = [];
    if (p < 1 && swap.expression.prev && swap.expression.prev !== exprId) {
      const Q = headOf(swap.expression.prev === 'native' ? null : swap.expression.prev);
      if (Q) out.push(place(Q, assetUrl(Q.src, base), outAlpha(p), 'prev'));
    }
    out.push(place(H, href, p, 'cur', settleK));
    return <g data-part="face">{out}</g>;
  };

  return (
    <g data-character={cast}>
      {(part === 'all' || part === 'back') && renderPose()}
      {(part === 'all' || part === 'head') && renderFace()}
    </g>
  );
}
