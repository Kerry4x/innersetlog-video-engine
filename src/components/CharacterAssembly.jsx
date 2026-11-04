/**
 * Character Assembly — composites Flow-generated character parts.
 * ------------------------------------------------------------------
 * No figure, head or face is drawn in code. The character is three kinds of
 * Flow sprites joined at anchor points defined in assets/manifest.json:
 *
 *   body  (library/bodies/<pose>.png)        anchor = feet ground point
 *                                             neck   = where the head attaches
 *                                             hands  = { L, R } grip points + wrist angle
 *                                             front  = optional overlay of the front arm/leg
 *   head  (library/heads/<expression>.png)   neck   = point that sits on body.neck
 *                                             variants.blink / variants.talk (optional swaps)
 *   items (library/items/<item>.png)         grip   = point placed on the hand
 *                                             angle  = item's forward axis in its own image (deg)
 *
 * Z-order (docs/CHARACTER_RIG.md §4): part="back" → body (layer 3),
 * part="head" → head (layer 4), part="front" → front overlay + held items (layer 5).
 *
 * Motion applied to the sprites (never redrawn): breathing (tiny vertical
 * scale of the body about the feet, head rides the neck point), head tilt,
 * blink/talk variant swaps, and spring crossfades when pose/expression change.
 */
import React from 'react';
import { clamp, spring } from '../engine/motion.js';
import { resolveSprite, SpriteImage } from './Sprite.jsx';
import { assetUrl } from '../engine/assets.js';

const hash01 = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export const BLINK = { minGap: 3.5, maxGap: 4.5, duration: 0.15 };

/**
 * Eye openness 1 → 0 → 1 on a natural deterministic schedule: one blink every
 * 3.5–4.5s (jittered per blink), 0.15s long. The blink sprite shows while
 * openness < 0.75, i.e. ~3 frames at 30fps.
 */
export function blinkAmount(time, seed = 0) {
  let t = 0;
  for (let i = 0; i < 10000; i++) {
    const start = t + BLINK.minGap + hash01(i + seed * 97) * (BLINK.maxGap - BLINK.minGap);
    if (time >= start && time <= start + BLINK.duration) return Math.abs(1 - 2 * ((time - start) / BLINK.duration));
    if (start > time) break;
    t = start;
  }
  return 1;
}

// Default anchors for placeholder parts (and any entry that lacks them).
const bodyDefaults = (w, h) => ({
  anchor: { x: w / 2, y: h },
  neck: { x: w / 2, y: h * 0.06 },
  hands: { L: { x: w * 0.12, y: h * 0.5, angle: 100 }, R: { x: w * 0.88, y: h * 0.5, angle: 80 } },
});
const headDefaults = (w, h) => ({ neck: { x: w / 2, y: h } });
const itemDefaults = (w, h) => ({ grip: { x: w / 2, y: h / 2 }, angle: 0 });

/**
 * Props
 *  manifest, base       asset manifest + URL base
 *  part                 'all' | 'back' | 'head' | 'front'
 *  x, y, scale, facing  feet position (comp px), uniform scale, 1 / -1 mirror
 *  time                 global seconds (breath, blink)
 *  body, expression     body pose id, head expression id
 *  hold                 { L?: itemId | { asset, rotate?, scale? }, R?: ... }
 *  headTilt             degrees (springable via track)
 *  mouthOpen            0..1 from audio lip-sync → head variants `talk_small` (> 0.2) / `talk_wide` (> 0.82)
 *  talk                 generic talk cycle when no audio
 *  breathe              default true
 *  blinkSeed            desync blinks between characters
 *  swap                 { body: {prev, since}, expression: {prev, since} } → crossfade on change
 */
export default function CharacterAssembly({
  manifest,
  base = '',
  part = 'all',
  x = 540,
  y = 1500,
  scale = 1,
  facing = 1,
  time = 0,
  body,
  expression,
  hold = {},
  headTilt = 0,
  mouthOpen,
  talk = false,
  breathe = true,
  blinkSeed = 1,
  swap = {},
}) {
  const f = facing < 0 ? -1 : 1;
  const breath = breathe ? Math.sin((time * Math.PI * 2) / 3.8) : 0;
  // Pose change: grounded micro-settle, scaleY 0.98 → 1.0 about the feet (no overshoot).
  const settle = swap.body && swap.body.since >= 0 ? 0.98 + 0.02 * clamp(spring(swap.body.since, 'gentle'), 0, 1) : 1;
  const by = (1 + 0.006 * breath) * settle; // chest rise + settle, anchored at the feet

  const bodyLayer = (id) => {
    const s = resolveSprite(manifest, id, 'bodies', base);
    const e = { ...bodyDefaults(s.w, s.h), ...(s.entry || {}) };
    return { ...s, e, k: scale * (e.scale ?? 1) }; // k: per-pose normalization (manifest) × scene scale
  };
  const B = bodyLayer(body);
  const toWorld = (p) => ({ x: x + (p.x - B.e.anchor.x) * B.k * f, y: y + (p.y - B.e.anchor.y) * B.k * by });
  const bodyTransform = (L) =>
    `translate(${x} ${y}) scale(${L.k * f} ${L.k * by}) translate(${-L.e.anchor.x} ${-L.e.anchor.y})`;

  // Crossfade progress for a discrete swap (pose / expression change).
  const fade = (sw) => (sw && sw.prev && sw.since >= 0 ? clamp(spring(sw.since, 'snappy'), 0, 1) : 1);
  // Outgoing sprite stays opaque through the first half so the pair never turns see-through.
  const outAlpha = (p) => clamp(2 * (1 - p), 0, 1);

  /* ---------------- layer 3: body ---------------- */
  const renderBody = () => {
    const p = fade(swap.body);
    const layers = [];
    if (p < 1 && swap.body.prev !== body) {
      const P = bodyLayer(swap.body.prev);
      layers.push(
        <g key="prev" transform={bodyTransform(P)} opacity={outAlpha(p)}>
          <SpriteImage {...P} />
        </g>
      );
    }
    layers.push(
      <g key="cur" transform={bodyTransform(B)} opacity={p}>
        <SpriteImage {...B} />
      </g>
    );
    return <g data-part="body">{layers}</g>;
  };

  /* ---------------- layer 4: head ---------------- */
  const neckW = toWorld(B.e.neck);
  const headLayer = (id) => {
    const s = resolveSprite(manifest, id, 'heads', base);
    const e = { ...headDefaults(s.w, s.h), ...(s.entry || {}) };
    return { ...s, e };
  };
  const renderHead = () => {
    const H = headLayer(expression);
    // Every expression renders at one diameter: manifest.character.headDiameter (body px) / head art diameter.
    const D = manifest?.character?.headDiameter;
    const headNorm = D && H.e.diameter ? D / H.e.diameter : H.e.scale ?? 1;
    const hs = B.k * headNorm * (B.e.headScale ?? 1);
    // Head follows the pose's neck-stub direction (manifest headTilt) + animated tilt + breath.
    const tilt = (headTilt + (B.e.headTilt ?? 0) + breath * 0.6) * f;
    // Variant swaps (only if Flow supplied them for this expression)
    const v = H.e.variants || {};
    const talkOpen =
      typeof mouthOpen === 'number' ? mouthOpen : talk ? Math.max(0, Math.sin(time * 22)) * 0.6 + Math.max(0, Math.sin(time * 13.7)) * 0.4 : 0;
    let variant = null;
    if (H.entry) {
      // quiet editorial lip-sync: small mouth carries speech, wide only on syllable peaks
      if (v.talk_wide && talkOpen > 0.82) variant = v.talk_wide;
      else if (v.talk_small && talkOpen > 0.2) variant = v.talk_small;
      else if (v.talk && talkOpen > 0.35) variant = v.talk;
      if (v.blink && blinkAmount(time, blinkSeed) < 0.75) variant = v.blink; // blink wins
    }
    const href = variant ? assetUrl(variant.src || variant, base) : H.href;

    const p = fade(swap.expression);
    // quiet settle on expression change: 1.015 → 1.0, critically damped (no bounce)
    const pop = 1 + 0.015 * (1 - clamp(spring(swap.expression?.since ?? 9, 'gentle'), 0, 1));
    // Seat the head along the neck stub: its center sits one "neck radius" out from the
    // stub tip in the stub's own direction (manifest neckAxis, default straight up), so
    // forward-leaning or drooping necks carry the head with them. The face's rotation
    // (tilt) is applied separately and stays capped for readability.
    const axis = ((B.e.neckAxis ?? -90) * Math.PI) / 180;
    const ax = { x: Math.cos(axis) * f, y: Math.sin(axis) };
    const place = (L, inner, opacity, k) => {
      const k2 = hs * (k === 'cur' ? pop : 1);
      const cx = L.w / 2;
      const cy = L.h / 2;
      const reach = (L.e.neck.y - cy) * hs; // head center → neck point distance, in world px
      const c = { x: neckW.x + ax.x * reach, y: neckW.y + ax.y * reach };
      return (
        <g key={k} opacity={opacity} transform={`translate(${c.x} ${c.y}) rotate(${tilt}) scale(${k2 * f} ${k2}) translate(${-cx} ${-cy})`}>
          {inner}
        </g>
      );
    };
    const layers = [];
    if (p < 1 && swap.expression.prev !== expression) {
      const P = headLayer(swap.expression.prev);
      layers.push(place(P, <SpriteImage {...P} />, outAlpha(p), 'prev'));
    }
    layers.push(place(H, <SpriteImage {...H} href={href} />, p, 'cur'));
    return <g data-part="head">{layers}</g>;
  };

  /* ---------------- layer 5: front limbs + held items ---------------- */
  const renderFront = () => {
    const out = [];
    if (B.e.front?.src) {
      out.push(
        <g key="front" transform={bodyTransform(B)}>
          <SpriteImage href={assetUrl(B.e.front.src, base)} w={B.w} h={B.h} label={`${B.label} (front)`} />
        </g>
      );
    }
    for (const side of ['L', 'R']) {
      const spec = hold[side];
      if (!spec) continue;
      const hs = typeof spec === 'string' ? { asset: spec } : spec;
      const hand = B.e.hands?.[side];
      if (!hand) continue;
      const I = resolveSprite(manifest, hs.asset, 'items', base);
      const ie = { ...itemDefaults(I.w, I.h), ...(I.entry || {}) };
      const W = toWorld(hand);
      // spec §4: anchored at the hand point, rotated with the wrist vector
      const rot = (hand.angle ?? 90) - (ie.angle ?? 0) + (hs.rotate ?? 0);
      const is = B.k * (ie.scale ?? 1) * (hs.scale ?? 1);
      out.push(
        <g key={side} transform={`translate(${W.x} ${W.y}) scale(${f} 1) rotate(${rot}) scale(${is}) translate(${-ie.grip.x} ${-ie.grip.y})`}>
          <SpriteImage {...I} />
        </g>
      );
    }
    return <g data-part="front">{out}</g>;
  };

  return (
    <g data-character="assembly">
      {(part === 'all' || part === 'back') && renderBody()}
      {(part === 'all' || part === 'head') && renderHead()}
      {(part === 'all' || part === 'front') && renderFront()}
    </g>
  );
}
