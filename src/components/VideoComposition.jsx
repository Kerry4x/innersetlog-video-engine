/**
 * Innersetlog Master Compositor
 * ------------------------------------------------------------------
 * Vertical 9:16 (1080x1920) Flow-asset compositor + animation loop.
 *
 * FLOW-TO-CODE PIPELINE: Flow is the artist, this file is the assembler.
 * Every plate, prop, body pose, head expression and hand item is a Flow
 * PNG/SVG listed in assets/manifest.json (see docs/ASSET_PIPELINE.md). Code
 * only places, layers, moves and times them; the only vector art generated
 * here is the motion-graphics UI layer (text, highlighter, bubbles, checks).
 *
 * STRICT Z-ORDER (docs/CHARACTER_RIG.md §4) — rendered bottom to top:
 *   1. Background   – assets/backgrounds/<id>
 *   2. Midground    – assets/library/props/<id> (desks, chairs, items under the hands)
 *   3. Character body sprite                  <CharacterAssembly part="back" />
 *   4. Character head sprite                  <CharacterAssembly part="head" />
 *   5. Body front overlay + held item sprites <CharacterAssembly part="front" />, then
 *      scene `foreground` props that must sit in front (desk edges, laptop lids)
 *   6. UI / MoGraph – text, highlighter, zoom boxes, papers, checkmarks, bubbles, sprite pop-ups
 *
 * STUDIO MOTION (STYLE_GUIDE.md §3, engine in src/engine/):
 *   - Every UI entrance is a spring (mass / stiffness / damping) — no linear tweens.
 *   - Each layer has a parallax depth, so camera moves produce real depth.
 *   - Elements landing together are auto-staggered 4–8 frames; sub-parts
 *     (words, lines, puffs, tick-after-ring) stagger internally.
 *   - Any time can be an audio cue ('@word', '@"a phrase":end+2f') resolved
 *     against the voiceover's word timestamps.
 *
 * Time source:
 *   - Pass `frame` (e.g. Remotion's useCurrentFrame()) for deterministic renders.
 *   - Otherwise the preview clock follows timeline.audio.src (if present) or a rAF loop.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import CharacterAssembly from './CharacterAssembly.jsx';
import { BackgroundSprite, Sprite } from './Sprite.jsx';
import { useAssetManifest, auditTimeline } from '../engine/assets.js';
import {
  MOTION_CONFIG,
  EASE,
  clamp,
  lerp,
  envelope,
  parallaxTransform,
  resolveEase,
  spring,
  springTrack,
  staggered,
} from '../engine/motion.js';
import { resolveTimeline } from '../engine/timeline.js';

export const CANVAS = { width: 1080, height: 1920, fps: MOTION_CONFIG.fps };

const UI_FONT = "'Inter', 'Helvetica Neue', Arial, sans-serif";
const UI = {
  ink: '#111111',
  paper: '#FFFDF8',
  plate: '#F7EFE2',
  accent: '#E4572E', // emphasis color for highlights / zoom boxes
  good: '#2E9E5B', // checkmarks
  marker: '#FFE066', // highlighter
};

/* ============================ TRACK SAMPLING ============================ */
/**
 * Duration-based keyframe track (arrival semantics): each key is where the
 * value *arrives* at time t. Default ease is a cinematic bezier, never linear.
 * Numeric values tween; non-numeric values hold until the next key.
 */
export function tweenTrack(track, t) {
  if (!track || track.length === 0) return {};
  if (t <= track[0].t) return { ...track[0] };
  const last = track[track.length - 1];
  if (t >= last.t) return { ...last };
  let i = 0;
  while (i < track.length - 1 && track[i + 1].t <= t) i++;
  const a = track[i];
  const b = track[i + 1];
  const p = resolveEase(b.ease || 'cinematic')((t - a.t) / (b.t - a.t));
  const out = { ...a };
  for (const k of Object.keys(b)) {
    if (k === 't' || k === 'ease') continue;
    if (typeof a[k] === 'number' && typeof b[k] === 'number') out[k] = lerp(a[k], b[k], p);
    else if (!(k in a)) out[k] = b[k];
  }
  return out;
}

/** Camera tracks: tween by default; any key with `spring` switches to spring-trigger semantics. */
const sampleCamera = (keys, t) =>
  keys && keys.some((k) => k.spring) ? springTrack(keys, t, 'camera') : tweenTrack(keys, t);

/* ============================ TEXT LAYOUT =============================== */
// Approximate advance widths for bold sans (em units). Each word is then rendered
// with textLength = its measured width, so layout, word spacing and highlighter
// bars are identical whatever font the renderer actually has installed.
function charEm(c) {
  if (c === ' ') return 0.3;
  if ("iljI.,:;!|'".includes(c)) return 0.3;
  if ('ftr()'.includes(c)) return 0.4;
  if ('mwMW'.includes(c)) return 0.9;
  if (/[A-Z]/.test(c)) return 0.72;
  if (/[0-9]/.test(c)) return 0.6;
  return 0.6;
}
const measure = (s, size) => [...s].reduce((w, c) => w + charEm(c) * size, 0);

/** Wrap words into centered lines; returns [{ words: [{text, x, w, i}], width }]. */
function layoutWords(text, size, maxWidth) {
  const toks = String(text).split(/\s+/).filter(Boolean);
  const space = measure(' ', size);
  const lines = [];
  let cur = [];
  let curW = 0;
  toks.forEach((tok, i) => {
    const w = measure(tok, size);
    if (cur.length && curW + space + w > maxWidth) {
      lines.push({ words: cur, width: curW });
      cur = [];
      curW = 0;
    }
    cur.push({ text: tok, w, i });
    curW += (cur.length > 1 ? space : 0) + w;
  });
  if (cur.length) lines.push({ words: cur, width: curW });
  for (const line of lines) {
    let x = -line.width / 2;
    for (const w of line.words) {
      w.x = x;
      x += w.w + space;
    }
  }
  return { lines, space };
}

/* ============================ LAYER 6 – UI ============================== */
function Plate({ width, height, y, size }) {
  return (
    <rect
      x={-width / 2 - size * 0.45}
      y={y}
      width={width + size * 0.9}
      height={height}
      rx={28}
      fill={UI.plate}
      stroke={UI.ink}
      strokeWidth={8}
    />
  );
}

/** Text callout. Words pop in staggered (4f) or exactly when spoken (syncWords). */
function TextOverlay({ o }) {
  const { inP, alpha, local } = o.env;
  const size = o.size || 72;
  const { lines } = layoutWords(o.text, size, o.maxWidth || 860);
  const lh = size * 1.18;
  const widest = Math.max(...lines.map((l) => l.width));
  const x = o.x ?? CANVAS.width / 2;
  const y = o.y ?? 360;
  const fps = o.fps;
  const hl = (w) => o.highlight && o.highlight.some((h) => w.toLowerCase().includes(h.toLowerCase()));

  return (
    <g opacity={alpha} transform={`translate(${x} ${y + (1 - inP) * 40}) scale(${0.92 + 0.08 * inP})`}>
      {o.plate !== false && <Plate width={widest} height={lines.length * lh + size * 0.5} y={-size * 1.05} size={size} />}
      {lines.map((line, li) =>
        line.words.map((w) => {
          let p;
          if (o.reveal === 'all') p = inP;
          else if (o.wordTimes) p = spring(local - (o.wordTimes[w.i].start - o.start), 'pop');
          else p = staggered(local, w.i, { fps, delay: 3 / fps });
          const cx = w.x + w.w / 2;
          const cy = li * lh - size * 0.35;
          return (
            <g
              key={w.i}
              opacity={clamp(p * 1.6, 0, 1)}
              transform={`translate(${cx} ${cy + (1 - p) * 22}) scale(${0.55 + 0.45 * p}) translate(${-cx} ${-cy})`}
            >
              <text x={w.x} y={li * lh} textLength={w.w} lengthAdjust="spacingAndGlyphs" fontFamily={UI_FONT} fontWeight={o.weight || 800} fontSize={size} fill={hl(w.text) ? UI.accent : UI.ink}>
                {w.text}
              </text>
            </g>
          );
        })
      )}
    </g>
  );
}

/** Highlighter: the marker crosses each word as the narrator says it. */
function Highlight({ o }) {
  const { inP, alpha, local } = o.env;
  const size = o.size || 64;
  const { lines, space } = layoutWords(o.text, size, o.maxWidth || 860);
  const lh = size * 1.3;
  const widest = Math.max(...lines.map((l) => l.width));
  const x = o.x ?? CANVAS.width / 2;
  const y = o.y ?? 360;
  const times = o.wordTimes;

  return (
    <g opacity={alpha} transform={`translate(${x} ${y + (1 - inP) * 40}) scale(${0.92 + 0.08 * inP})`}>
      {o.plate !== false && <Plate width={widest} height={lines.length * lh + size * 0.4} y={-size * 1.1} size={size} />}
      {lines.map((line, li) =>
        line.words.map((w, wi) => {
          const wt = times[w.i];
          const t0 = wt.start - o.start;
          const dur = Math.max(wt.end - wt.start, 0.12);
          const hp = EASE.glide(clamp((local - t0) / dur, 0, 1));
          const isLast = wi === line.words.length - 1;
          const full = w.w + (isLast ? 0 : space) + 14;
          return (
            <rect
              key={`m${w.i}`}
              x={w.x - 7}
              y={li * lh - size * 0.8}
              width={full * hp}
              height={size * 1.0}
              rx={6}
              fill={UI.marker}
            />
          );
        })
      )}
      {lines.map((line, li) =>
        line.words.map((w) => (
          <text key={`t${w.i}`} x={w.x} y={li * lh} textLength={w.w} lengthAdjust="spacingAndGlyphs" fontFamily={UI_FONT} fontWeight={o.weight || 800} fontSize={size} fill={UI.ink}>
            {w.text}
          </text>
        ))
      )}
    </g>
  );
}

/** Thought bubble: trailing puffs pop in sequence from the head, then the cloud, then the text. */
function ThoughtBubble({ o }) {
  const { alpha, local } = o.env;
  const fps = o.fps;
  const { x = 640, y = 520, w = 600, h = 300, anchor = { x: 480, y: 820 } } = o;
  const size = o.size || 54;
  const { lines } = layoutWords(o.text || '', size, w * 0.68);
  const puffs = [0.22, 0.45, 0.7].map((k, i) => ({
    x: lerp(anchor.x, x, k),
    y: lerp(anchor.y, y + h / 2, k),
    r: 12 + i * 9,
    p: staggered(local, i, { fps, gapFrames: 4 }),
  }));
  const cloudP = spring(local - 12 / fps, 'bubble');
  const textP = spring(local - 17 / fps, 'gentle');
  const lobes = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2;
    return { cx: x + Math.cos(a) * w * 0.4, cy: y + Math.sin(a) * h * 0.36, r: h * 0.3 };
  });
  // idle float so the bubble breathes while held
  const bob = Math.sin(local * 2.2) * 5 * clamp(cloudP, 0, 1);
  return (
    <g opacity={alpha}>
      {puffs.map((pf, i) => (
        <circle key={i} cx={pf.x} cy={pf.y} r={Math.max(0, pf.r * pf.p)} fill={UI.paper} stroke={UI.ink} strokeWidth={7} />
      ))}
      <g transform={`translate(${x} ${y + bob}) scale(${Math.max(0, cloudP)}) translate(${-x} ${-y})`}>
        {/* outline pass then fill pass = clean merged cloud silhouette */}
        {lobes.map((l, i) => <circle key={`s${i}`} cx={l.cx} cy={l.cy} r={l.r + 7} fill={UI.ink} />)}
        <ellipse cx={x} cy={y} rx={w * 0.42 + 7} ry={h * 0.38 + 7} fill={UI.ink} />
        {lobes.map((l, i) => <circle key={`f${i}`} cx={l.cx} cy={l.cy} r={l.r} fill={UI.paper} />)}
        <ellipse cx={x} cy={y} rx={w * 0.42} ry={h * 0.38} fill={UI.paper} />
        <g opacity={clamp(textP, 0, 1)} transform={`translate(0 ${(1 - textP) * 14})`}>
          {lines.map((line, i) => (
            <text
              key={i}
              x={x}
              y={y + (i - (lines.length - 1) / 2) * size * 1.15 + size * 0.35}
              textAnchor="middle"
              fontFamily={UI_FONT}
              fontWeight={700}
              fontSize={size}
              fill={UI.ink}
            >
              {line.words.map((w) => w.text).join(' ')}
            </text>
          ))}
        </g>
      </g>
    </g>
  );
}

/**
 * Checkmark: the ring draws on at `start`; the fill floods + tick strokes at
 * `fillAt` (an audio cue, e.g. '@automatic'), with a scale pulse; label follows.
 */
function Checkmark({ o }) {
  const { alpha, local, inP } = o.env;
  const fps = o.fps;
  const { x = 540, y = 700, r = 90, label } = o;
  const fl = local - ((o.fillAt ?? o.start + 6 / fps) - o.start);
  const ring = clamp(spring(local, 'snappy'), 0, 1);
  const fillP = spring(fl, 'pop');
  const tick = clamp(spring(fl - 3 / fps, 'snappy'), 0, 1);
  const pulse = spring(fl, 'pop') - spring(fl - 5 / fps, 'pop');
  const labelP = spring(fl - 6 / fps, 'gentle');
  return (
    <g opacity={alpha} transform={`translate(${x} ${y}) scale(${(0.85 + 0.15 * inP) * (1 + 0.18 * pulse)})`}>
      <circle r={r} fill={UI.paper} />
      <circle r={Math.max(0, r * fillP)} fill={UI.good} />
      <circle r={r} fill="none" stroke={UI.ink} strokeWidth={9} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - ring} transform="rotate(-90)" />
      <path
        d={`M${-r * 0.45},${r * 0.02} L${-r * 0.12},${r * 0.34} L${r * 0.48},${-r * 0.32}`}
        fill="none"
        stroke={UI.paper}
        strokeWidth={r * 0.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - tick}
      />
      {label && (
        <text
          x={r + 30 - (1 - labelP) * 30}
          y={20}
          fontFamily={UI_FONT}
          fontWeight={800}
          fontSize={60}
          fill={UI.ink}
          opacity={clamp(labelP, 0, 1)}
        >
          {label}
        </text>
      )}
    </g>
  );
}

/** Research paper: heavy card springs up with inertia, lines stagger in, highlight sweeps at `highlightAt`. */
function ResearchPaper({ o }) {
  const { alpha, local } = o.env;
  const fps = o.fps;
  const { x = 540, y = 900, w = 620, h = 800, rotate = -4, title = 'Research Paper', source, highlightLine = 3 } = o;
  const p = spring(local, 'paper');
  const titleSize = 46;
  const { lines: titleLines } = layoutWords(title, titleSize, w - 100);
  const lineCount = 9;
  const hlLocal = local - ((o.highlightAt ?? o.start + 0.8) - o.start);
  const hlP = EASE.glide(clamp(hlLocal / 0.45, 0, 1));
  return (
    <g opacity={alpha} transform={`translate(${x} ${y + (1 - p) * 1000}) rotate(${lerp(-14, rotate, p)}) scale(${0.85 + 0.15 * p})`}>
      <rect x={-w / 2 + 16} y={-h / 2 + 18} width={w} height={h} rx={18} fill={UI.ink} opacity={0.22} />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={18} fill={UI.paper} stroke={UI.ink} strokeWidth={8} />
      {titleLines.map((l, i) => (
        <text key={i} x={-w / 2 + 50} y={-h / 2 + 100 + i * 56} fontFamily={UI_FONT} fontWeight={800} fontSize={titleSize} fill={UI.ink}>
          {l.words.map((ww) => ww.text).join(' ')}
        </text>
      ))}
      {source && (
        <text x={-w / 2 + 50} y={-h / 2 + 120 + titleLines.length * 56} fontFamily={UI_FONT} fontSize={30} fill="#555">
          {source}
        </text>
      )}
      {Array.from({ length: lineCount }).map((_, i) => {
        const ly = -h / 2 + 260 + titleLines.length * 30 + i * 52;
        const lw = (w - 100) * (i === lineCount - 1 ? 0.55 : 0.85 + ((i * 37) % 15) / 100);
        const lp = clamp(staggered(local, i, { fps, gapFrames: 2, delay: 8 / fps, spring: 'snappy' }), 0, 1.05);
        const isHl = i === highlightLine;
        return (
          <g key={i}>
            {isHl && <rect x={-w / 2 + 44} y={ly - 22} width={(lw + 12) * hlP} height={40} fill={UI.marker} />}
            <rect x={-w / 2 + 50} y={ly - 8} width={lw * lp} height={14} rx={7} fill={isHl && hlP > 0 ? UI.ink : '#B9B2A6'} />
          </g>
        );
      })}
    </g>
  );
}

/** Zoom box: stroke draws on with a spring, settles from slightly oversized; label pops 5f later. */
function ZoomBox({ o }) {
  const { alpha, local } = o.env;
  const fps = o.fps;
  const { x = 300, y = 900, w = 400, h = 300, label } = o;
  const draw = clamp(spring(local, 'snappy'), 0, 1);
  const s = 1 + 0.08 * (1 - spring(local, 'pop'));
  const lp = spring(local - 5 / fps, 'pop');
  const cx = x + w / 2;
  const cy = y + h / 2;
  return (
    <g opacity={alpha} transform={`translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`}>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={24}
        fill="none"
        stroke={UI.accent}
        strokeWidth={12}
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - draw}
      />
      {label && (
        <g opacity={clamp(lp, 0, 1)} transform={`translate(${x} ${y - 55}) scale(${Math.max(0, lp)}) translate(${-x} ${-(y - 55)})`}>
          <rect x={x} y={y - 92} width={measure(label, 48) + 48} height={74} rx={16} fill={UI.accent} />
          <text x={x + 24} y={y - 40} fontFamily={UI_FONT} fontWeight={800} fontSize={48} fill={UI.paper}>
            {label}
          </text>
        </g>
      )}
    </g>
  );
}

/** Flow asset as a pop-up graphic (e.g. a phone, a trophy): springs in from below with a slight tilt, then floats. */
function SpritePop({ o }) {
  const { inP, alpha, local } = o.env;
  const float = Math.sin(local * 2.0) * 6 * clamp(inP, 0, 1);
  return (
    <g opacity={alpha} transform={`translate(0 ${(1 - inP) * 120 + float})`}>
      <Sprite
        manifest={o.manifest}
        base={o.base}
        asset={o.asset}
        category={o.category || 'props'}
        x={o.x ?? CANVAS.width / 2}
        y={o.y ?? 1000}
        scale={(o.scale ?? 1) * (0.6 + 0.4 * inP)}
        rotate={(o.rotate ?? 0) + (1 - inP) * -10}
        anchor={o.anchor}
      />
    </g>
  );
}

const UI_COMPONENTS = {
  sprite: { C: SpritePop, spring: 'pop' },
  text: { C: TextOverlay, spring: 'pop' },
  highlight: { C: Highlight, spring: 'pop' },
  thought: { C: ThoughtBubble, spring: 'bubble' },
  check: { C: Checkmark, spring: 'pop' },
  paper: { C: ResearchPaper, spring: 'paper' },
  zoombox: { C: ZoomBox, spring: 'snappy' },
};

/* ============================ SCENE RENDER ============================= */
/** Mouth opening from voiceover timing: syllable-ish pulses while a word is spoken. */
function lipSync(sync, t) {
  const w = sync.speakingAt(t);
  if (!w) return 0;
  const syll = Math.max(1, Math.round(w.norm.length / 3));
  const u = (t - w.start) / Math.max(w.end - w.start, 0.05);
  return Math.abs(Math.sin(Math.PI * syll * u)) * 0.9;
}

/**
 * For a discrete track property (body pose, expression): the value before the
 * most recent change and seconds since that change → drives sprite crossfades.
 */
function swapInfo(base, track, prop, local) {
  if (!track) return undefined;
  let prev = base[prop];
  let cur = base[prop];
  let since;
  for (const k of track) {
    if (!(prop in k) || k.t > local) continue;
    if (k[prop] !== cur) {
      prev = cur;
      cur = k[prop];
      since = local - k.t;
    }
  }
  return since === undefined ? undefined : { prev, since };
}

function Scene({ scene, t, sync, fps, manifest, base: assetBase }) {
  const local = t - scene.start;
  const P = { ...MOTION_CONFIG.parallax, ...(scene.parallax || {}) };

  // Camera: authored keys, 'static', or (default) a slow cinematic push-in across the scene.
  const sceneLen = scene.end - scene.start;
  const camKeys =
    scene.camera === 'static'
      ? null
      : Array.isArray(scene.camera)
        ? scene.camera
        : [
            { t: 0, zoom: 1 },
            { t: sceneLen, zoom: 1 + Math.min(MOTION_CONFIG.slowZoom.max, MOTION_CONFIG.slowZoom.perSecond * sceneLen), ease: 'cinematic' },
          ];
  const cam = { zoom: 1, x: CANVAS.width / 2, y: CANVAS.height / 2, ...sampleCamera(camKeys, local) };

  // Depth of field: while an editorial card / typography holds focus, the plates soften.
  // 'paper' cards take focus by default; any UI element can opt in/out with `focus`.
  let focus = 0;
  for (const o of scene.ui || []) {
    const wants = o.focus ?? o.type === 'paper';
    if (!wants || local < o.start || local > o.end) continue;
    const env = envelope(local, o.start, o.end, { spring: 'gentle', fps });
    focus = Math.max(focus, clamp(spring(local - o.start, 'gentle'), 0, 1) * clamp(env.outP, 0, 1));
  }
  const dof = MOTION_CONFIG.dof;
  const blurBg = focus * (scene.dof?.background ?? dof.background);
  const blurMid = focus * (scene.dof?.midground ?? dof.midground);
  // Subtle handheld drift keeps static plates alive (scaled per layer by depth).
  const drift = scene.drift === false ? { x: 0, y: 0 } : { x: Math.sin(local * 0.7) * 4, y: Math.cos(local * 0.5) * 3 };
  const layerT = (depth) => parallaxTransform(cam, depth, CANVAS, drift);

  let charState = null;
  if (scene.character) {
    const { track, lipSync: ls, depth, ...base } = scene.character;
    charState = { ...base, ...springTrack(track, local, 'gentle') };
    if (ls && sync.words.length) charState.mouthOpen = lipSync(sync, t);
    charState.swap = {
      body: swapInfo(base, track, 'body', local),
      expression: swapInfo(base, track, 'expression', local),
    };
    charState.manifest = manifest;
    charState.base = assetBase;
  }
  const placeProp = (it) => (
    <Sprite manifest={manifest} base={assetBase} asset={it.asset} x={it.x} y={it.y} scale={it.scale ?? 1} rotate={it.rotate ?? 0} flipX={it.flipX} opacity={it.opacity ?? 1} anchor={it.anchor} />
  );

  const charDepth = scene.character?.depth ?? P.character;

  return (
    <>
      <defs>
        {blurBg > 0.05 && (
          <filter id="dof-bg" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation={blurBg} edgeMode="duplicate" />
          </filter>
        )}
        {blurMid > 0.05 && (
          <filter id="dof-mid" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation={blurMid} edgeMode="duplicate" />
          </filter>
        )}
      </defs>
      <g data-layer="1-background" transform={layerT(P.background)} filter={blurBg > 0.05 ? 'url(#dof-bg)' : undefined}>
        <BackgroundSprite manifest={manifest} base={assetBase} asset={scene.background} canvas={CANVAS} overscan={MOTION_CONFIG.backgroundOverscan} />
      </g>
      <g data-layer="2-midground" filter={blurMid > 0.05 ? 'url(#dof-mid)' : undefined}>
        {(scene.midground || []).map((it, i) => (
          <g key={i} transform={layerT(it.depth ?? P.midground)}>
            {placeProp(it)}
          </g>
        ))}
      </g>
      {/* global time keeps blinks/breath continuous across cuts */}
      <g data-layer="3-character-back" transform={layerT(charDepth)}>
        {charState && <CharacterAssembly {...charState} part="back" time={t} />}
      </g>
      <g data-layer="4-character-head" transform={layerT(charDepth)}>
        {charState && <CharacterAssembly {...charState} part="head" time={t} />}
      </g>
      <g data-layer="5-foreground">
        <g transform={layerT(charDepth)}>{charState && <CharacterAssembly {...charState} part="front" time={t} />}</g>
        {(scene.foreground || []).map((it, i) => (
          <g key={i} transform={layerT(it.depth ?? P.foreground)}>
            {placeProp(it)}
          </g>
        ))}
      </g>
      <g data-layer="6-ui" transform={layerT(P.ui)}>
        {(scene.ui || []).map((o, i) => {
          const def = UI_COMPONENTS[o.type];
          if (!def) return null;
          const env = envelope(local, o.start, o.end, { spring: o.spring || def.spring, fps });
          if (!env.visible) return null;
          const { C } = def;
          return <C key={i} o={{ ...o, env, fps, manifest, base: assetBase }} />;
        })}
      </g>
    </>
  );
}

/* ============================ DEMO TIMELINE ============================ */
/**
 * Demo-only stand-in for real Whisper word timestamps, so the cue system can be
 * previewed before a voiceover exists. Real projects pass
 * timeline.audio.transcript (Whisper JSON / word list / SRT).
 */
function demoTranscript(text, { start = 0.4, wps = 2.7 } = {}) {
  let t = start;
  return text.split(/\s+/).map((word) => {
    const d = (0.55 + word.length * 0.06) / (wps * 0.75);
    const w = { word, start: t, end: t + d * 0.85 };
    t += d + (/[.?!]$/.test(word) ? 0.45 : /,$/.test(word) ? 0.2 : 0);
    return w;
  });
}

const DEMO_VO =
  'Why does discipline beat motivation? Because motivation is a feeling, and feelings fade. ' +
  'Researchers found new habits take about sixty six days to become automatic. So start small.';

/**
 * Timeline schema (any time field accepts seconds OR an audio cue — see audioSync.js)
 * {
 *   audio: { src: 'assets/audio/vo.mp3', transcript: <whisper json | word list | srt> },
 *   stagger: { defaultFrames: 6 },          // optional override (clamped 4–8)
 *   scenes: [{
 *     id, start, end?,                     // end defaults to next scene start
 *     background: '<background id>',        // assets/backgrounds/<id>.png via manifest
 *     parallax:   { background, midground, character, foreground, ui },   // optional per-scene depths
 *     midground:  [{ asset: '<prop id>', x, y, scale?, rotate?, flipX?, anchor?, depth? }],  // (x,y) = prop anchor
 *     character:  { body: '<pose id>', expression: '<head id>', hold: { L?, R?: '<item id>' },
 *                   x, y, scale, facing?, headTilt?, lipSync?, depth?,
 *                   track: [{ t, body?, expression?, hold?, x?, headTilt?, spring? }] },  // cue-triggered; swaps crossfade
 *     foreground: [{ asset: '<prop id>', x, y, ... }],  // props in front of the character
 *     camera:     [{ t, zoom, x, y, ease? }] | 'static'  // arrival keys (cinematic bezier); `spring` for trigger keys;
 *                                             // omitted → slow cinematic push-in (MOTION_CONFIG.slowZoom)
 *     dof:        { background?, midground? } // blur px while a focus card is up (defaults MOTION_CONFIG.dof)
 *     ui: [{ type: 'text'|'highlight'|'thought'|'check'|'paper'|'zoombox'|'sprite', start, end?, stagger?, spring?, focus?, ... }],
 *   }]
 * }
 */
export const DEMO_TIMELINE = {
  audio: { src: null, transcript: demoTranscript(DEMO_VO) },
  scenes: [
    {
      id: 'hook',
      start: 0,
      background: 'study_night',
      midground: [
        { asset: 'desk', x: 420, y: 1600, depth: 1.0 /* character touches it → same depth */ },
      ],
      character: { body: 'body_sit_desk_upright', expression: 'head_focused_deep', x: 700, y: 1600, scale: 0.42 },
      camera: [
        { t: 0, zoom: 1.0, x: 540, y: 960 },
        { t: '@because', zoom: 1.14, x: 470, y: 1020 },
      ],
      ui: [
        { type: 'text', start: '@why-0.1', text: 'Why discipline beats motivation', highlight: ['discipline'], syncWords: true, y: 330 },
        // lands on the same word as the title → engine staggers it 6 frames behind
        { type: 'zoombox', start: '@why-0.1', x: 220, y: 1160, w: 340, h: 140, label: 'the habit' },
      ],
    },
    {
      id: 'feeling',
      start: '@because',
      background: 'study_night',
      character: {
        body: 'body_stand_chin_think',
        expression: 'head_focused_deep',
        x: 540,
        y: 1720,
        scale: 0.5,
        track: [
          { t: 0, headTilt: 0 },
          { t: '@feelings', headTilt: 8 }, // head tilts toward the bubble as the word lands
          { t: '@fade', expression: 'head_exhausted_2am', body: 'body_stand_slump_heavy', x: 420, headTilt: 0 }, // sprite swap + grounded settle
        ],
      },
      camera: [
        { t: 0, zoom: 1.28, x: 540, y: 900 },
        { t: '@feeling', zoom: 1.0, x: 540, y: 960, spring: 'camera' }, // spring dolly-out keyed to speech
      ],
      ui: [
        { type: 'highlight', start: '@because', text: 'Motivation is a feeling, and feelings fade.', sweepStart: '@motivation', y: 300 },
        { type: 'thought', start: '@feelings', x: 720, y: 640, w: 520, h: 260, text: 'It fades.', anchor: { x: 650, y: 860 } },
      ],
    },
    {
      id: 'research',
      start: '@researchers',
      background: 'library_day',
      character: {
        body: 'body_stand_explain_right',
        expression: 'head_neutral_calm',
        x: 820,
        y: 1720,
        scale: 0.42,
        lipSync: true, // neutral head swaps talk_small / talk_wide per syllable; blinks every 3.5–4.5s
        track: [
          { t: 0, headTilt: 0 },
          { t: '@habits', headTilt: -6 },
          { t: '@automatic', expression: 'head_relief_peace' },
        ],
      },
      // no camera keys → default slow cinematic push-in; the paper card takes focus → plates blur (DOF)
      ui: [
        { type: 'paper', start: '@researchers', x: 400, y: 700, w: 580, title: 'Habit formation in everyday life', source: 'Lally et al., 2010 · EJSP', highlightAt: '@"sixty six"' },
        // starts with the paper → auto-staggered; fill keyed to the word "automatic"
        { type: 'check', start: '@researchers', fillAt: '@automatic', x: 140, y: 1500, r: 78, label: '66 days' },
      ],
    },
  ],
};

/* ============================ MASTER COMPONENT ========================= */
/**
 * <VideoComposition />
 *  timeline    timeline object (defaults to DEMO_TIMELINE)
 *  transcript  optional transcript override (else timeline.audio.transcript)
 *  frame       external frame number (Remotion). If omitted, preview clock runs.
 *  fps         frames per second (default 30)
 *  loop        loop the preview clock when there is no audio (default true)
 *  manifest    asset manifest object, or URL to it (default 'assets/manifest.json')
 *  assetBase   prefix for asset srcs (e.g. Remotion staticFile('') or a CDN root)
 *  style       CSS for the outer <svg>
 */
export default function VideoComposition({
  timeline = DEMO_TIMELINE,
  transcript,
  frame,
  fps = CANVAS.fps,
  loop = true,
  manifest: manifestSource = 'assets/manifest.json',
  assetBase = '',
  style,
}) {
  const manifest = useAssetManifest(manifestSource);
  const resolved = useMemo(() => resolveTimeline(timeline, { fps, transcript }), [timeline, fps, transcript]);
  const audit = useMemo(() => auditTimeline(timeline, manifest), [timeline, manifest]);
  const [clock, setClock] = useState(0);
  const startRef = useRef(null);
  const audioRef = useRef(null);
  const external = typeof frame === 'number';
  const audioSrc = timeline.audio?.src;

  useEffect(() => {
    if (resolved.__warnings.length) console.warn('[Innersetlog timeline]\n' + resolved.__warnings.join('\n'));
    if (audit.missing.length)
      console.info('[Innersetlog assets] placeholders in use for:\n' + audit.missing.map((m) => `  ${m.category}/${m.id}  (${m.where})`).join('\n'));
  }, [resolved, audit]);

  useEffect(() => {
    if (external) return undefined;
    let raf;
    const tick = (now) => {
      let s;
      if (audioSrc && audioRef.current) {
        s = audioRef.current.currentTime; // audio is the master clock → perfect sync in preview
      } else {
        if (startRef.current == null) startRef.current = now;
        s = (now - startRef.current) / 1000;
        s = loop ? s % resolved.duration : Math.min(s, resolved.duration);
      }
      setClock(Math.floor(s * fps) / fps); // quantize so preview == final render
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [external, fps, loop, resolved.duration, audioSrc]);

  const t = external ? frame / fps : clock;
  const scenes = resolved.scenes;
  const scene = scenes.find((s) => t >= s.start && t < s.end) || scenes[scenes.length - 1];

  const svg = (
    <svg
      viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
      width="100%"
      style={{ aspectRatio: '9 / 16', display: 'block', background: '#000', ...style }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <clipPath id="frame-clip">
          <rect width={CANVAS.width} height={CANVAS.height} />
        </clipPath>
      </defs>
      <g clipPath="url(#frame-clip)">
        {scene && <Scene key={scene.id} scene={scene} t={t} sync={resolved.__sync} fps={fps} manifest={manifest} base={assetBase} />}
      </g>
    </svg>
  );

  if (external || !audioSrc) return svg;
  return (
    <div>
      {svg}
      <audio ref={audioRef} src={audioSrc} controls style={{ width: '100%' }} />
    </div>
  );
}
