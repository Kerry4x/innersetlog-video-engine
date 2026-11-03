/**
 * Innersetlog Master Compositor
 * ------------------------------------------------------------------
 * Vertical 9:16 (1080x1920) layer compositor + animation loop.
 *
 * STRICT Z-ORDER (STYLE_GUIDE.md §2) — rendered bottom to top:
 *   1. Background   – Flow-generated static room plate (assets/backgrounds)
 *   2. Midground    – desks, chairs, equipment (assets/props)
 *   3. Character    – <Stickman /> rig
 *   4. Foreground   – desk edges, laptops, anything in front of the hands
 *   5. UI / MoGraph – text, zoom boxes, research papers, checkmarks, bubbles
 *
 * Layers 1–4 live inside the "world" group and move with the camera.
 * Layer 5 is screen-space, so UI stays crisp and locked to the frame.
 *
 * Time source:
 *   - Pass `frame` (e.g. Remotion's useCurrentFrame()) for deterministic renders.
 *   - Omit it and the component runs its own requestAnimationFrame preview loop.
 */
import React, { useEffect, useRef, useState } from 'react';
import Stickman, { PALETTE, clamp, lerp } from './Stickman.jsx';

export const CANVAS = { width: 1080, height: 1920, fps: 30 };

const UI_FONT = "'Inter', 'Helvetica Neue', Arial, sans-serif";
const UI = {
  ink: PALETTE.ink,
  paper: '#FFFDF8',
  plate: PALETTE.skin,
  accent: '#E4572E', // emphasis color for highlights / zoom boxes
  good: '#2E9E5B', // checkmarks
};

/* ------------------------------- easing -------------------------------- */
export const EASE = {
  linear: (t) => t,
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t) => 1 - Math.pow(1 - t, 3),
  in: (t) => t * t * t,
  outBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

/**
 * Interpolate a keyframe track: [{ t, ...numericProps, ease? }, ...]
 * Numeric values tween; non-numeric values step (hold until next key).
 */
export function sampleTrack(track, t) {
  if (!track || track.length === 0) return {};
  if (t <= track[0].t) return { ...track[0] };
  const last = track[track.length - 1];
  if (t >= last.t) return { ...last };
  let i = 0;
  while (i < track.length - 1 && track[i + 1].t <= t) i++;
  const a = track[i];
  const b = track[i + 1];
  const ease = EASE[b.ease || 'inOut'] || EASE.inOut;
  const p = ease((t - a.t) / (b.t - a.t));
  const out = { ...a };
  for (const k of Object.keys(b)) {
    if (k === 't' || k === 'ease') continue;
    if (typeof a[k] === 'number' && typeof b[k] === 'number') out[k] = lerp(a[k], b[k], p);
    else if (typeof a[k] === 'object' && a[k] && typeof b[k] === 'object' && b[k])
      out[k] = sampleTrack([{ t: 0, ...a[k] }, { t: 1, ease: b.ease, ...b[k] }], p);
    else if (!(k in a)) out[k] = b[k];
  }
  return out;
}

/** Entrance/exit envelope for an overlay: returns { inP, outP, visible }. */
function envelope(t, start, end, inDur = 0.35, outDur = 0.25) {
  if (t < start || t > end) return { visible: false, inP: 0, outP: 0 };
  return {
    visible: true,
    inP: clamp((t - start) / inDur, 0, 1),
    outP: clamp((end - t) / outDur, 0, 1),
  };
}

/** Naive character-count wrapping for SVG text. */
function wrapText(text, maxChars) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxChars && line) {
      lines.push(line);
      line = w;
    } else line = (line + ' ' + w).trim();
  }
  if (line) lines.push(line);
  return lines;
}

/* ============================ LAYER 1 – 4 ============================== */
function ImageLayer({ item }) {
  // item: { src, x, y, w, h, rotate?, opacity? } or { render: (t) => <svg/> }
  if (item.render) return item.render(item.__t);
  const { src, x = 0, y = 0, w = CANVAS.width, h = CANVAS.height, rotate = 0, opacity = 1 } = item;
  return (
    <image
      href={src}
      x={x}
      y={y}
      width={w}
      height={h}
      opacity={opacity}
      preserveAspectRatio="xMidYMid slice"
      transform={rotate ? `rotate(${rotate} ${x + w / 2} ${y + h / 2})` : undefined}
    />
  );
}

function BackgroundPlate({ src }) {
  if (src) return <ImageLayer item={{ src }} />;
  // Placeholder until the Flow plate exists: flat wall + floor, no gradients.
  return (
    <g>
      <rect width={CANVAS.width} height={CANVAS.height} fill="#E9E1D3" />
      <rect y={1480} width={CANVAS.width} height={440} fill="#D8CDBA" />
      <line x1={0} y1={1480} x2={CANVAS.width} y2={1480} stroke="#C5B9A4" strokeWidth={6} />
    </g>
  );
}

/* ============================ LAYER 5 – UI ============================= */
function TextOverlay({ t, o }) {
  const { inP, outP } = o.env;
  const p = EASE.outBack(inP);
  const size = o.size || 72;
  const lines = wrapText(o.text, o.maxChars || 18);
  const words = o.text.split(/\s+/);
  const wordsShown = o.reveal === 'words' ? Math.ceil(clamp((t - o.start) / (o.wordRate || 0.18), 0, words.length)) : Infinity;
  let wordIdx = 0;
  const x = o.x ?? CANVAS.width / 2;
  const y = o.y ?? 360;
  const lh = size * 1.18;
  const plate = o.plate !== false;
  const padX = size * 0.45;
  const widest = Math.max(...lines.map((l) => l.length)) * size * 0.56;
  return (
    <g opacity={outP} transform={`translate(${x} ${y + (1 - p) * 40}) scale(${0.9 + 0.1 * p})`}>
      {plate && (
        <rect
          x={-widest / 2 - padX}
          y={-size * 1.05}
          width={widest + padX * 2}
          height={lines.length * lh + size * 0.5}
          rx={28}
          fill={UI.plate}
          stroke={UI.ink}
          strokeWidth={8}
        />
      )}
      {lines.map((line, li) => (
        <text
          key={li}
          y={li * lh}
          textAnchor="middle"
          fontFamily={UI_FONT}
          fontWeight={o.weight || 800}
          fontSize={size}
          fill={UI.ink}
        >
          {line.split(' ').map((w, wi) => {
            const idx = wordIdx++;
            const hl = o.highlight && o.highlight.some((h) => w.toLowerCase().includes(h.toLowerCase()));
            return (
              <tspan key={wi} fill={hl ? UI.accent : UI.ink} opacity={idx < wordsShown ? 1 : 0}>
                {w + (wi < line.split(' ').length - 1 ? ' ' : '')}
              </tspan>
            );
          })}
        </text>
      ))}
    </g>
  );
}

function ThoughtBubble({ o }) {
  const { inP, outP } = o.env;
  const p = EASE.outBack(inP);
  const { x = 640, y = 520, w = 600, h = 300, anchor = { x: 480, y: 820 } } = o;
  const lines = wrapText(o.text || '', o.maxChars || 16);
  const size = o.size || 54;
  // trailing puffs from anchor (character head) to bubble
  const puffs = [0.25, 0.5, 0.75].map((k, i) => ({
    x: lerp(anchor.x, x, k),
    y: lerp(anchor.y, y + h / 2, k),
    r: 12 + i * 9,
    show: inP > i * 0.2,
  }));
  const lobes = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    lobes.push({ cx: x + Math.cos(a) * w * 0.4, cy: y + Math.sin(a) * h * 0.36, r: h * 0.3 });
  }
  return (
    <g opacity={outP}>
      {puffs.map((pf, i) =>
        pf.show ? <circle key={i} cx={pf.x} cy={pf.y} r={pf.r} fill={UI.paper} stroke={UI.ink} strokeWidth={7} /> : null
      )}
      <g transform={`translate(${x} ${y}) scale(${p}) translate(${-x} ${-y})`}>
        {/* outline pass then fill pass = clean merged cloud silhouette */}
        {lobes.map((l, i) => (
          <circle key={`s${i}`} {...l} fill={UI.ink} r={l.r + 7} />
        ))}
        <ellipse cx={x} cy={y} rx={w * 0.42 + 7} ry={h * 0.38 + 7} fill={UI.ink} />
        {lobes.map((l, i) => (
          <circle key={`f${i}`} {...l} fill={UI.paper} />
        ))}
        <ellipse cx={x} cy={y} rx={w * 0.42} ry={h * 0.38} fill={UI.paper} />
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
            {line}
          </text>
        ))}
      </g>
    </g>
  );
}

function Checkmark({ o }) {
  const { inP, outP } = o.env;
  const { x = 540, y = 700, r = 90, label } = o;
  const ring = EASE.out(clamp(inP * 1.6, 0, 1));
  const tick = EASE.out(clamp(inP * 1.6 - 0.6, 0, 1));
  return (
    <g opacity={outP} transform={`translate(${x} ${y}) scale(${0.85 + 0.15 * EASE.outBack(inP)})`}>
      <circle r={r} fill={UI.good} opacity={ring} />
      <circle r={r} fill="none" stroke={UI.ink} strokeWidth={9} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - ring} />
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
        <text x={r + 30} y={20} fontFamily={UI_FONT} fontWeight={800} fontSize={60} fill={UI.ink} opacity={tick}>
          {label}
        </text>
      )}
    </g>
  );
}

function ResearchPaper({ o }) {
  const { inP, outP } = o.env;
  const p = EASE.outBack(inP);
  const { x = 540, y = 900, w = 620, h = 800, rotate = -4, title = 'Research Paper', source, highlightLine = 3 } = o;
  const titleLines = wrapText(title, 20);
  const lineCount = 9;
  return (
    <g
      opacity={outP}
      transform={`translate(${x} ${y + (1 - p) * 900}) rotate(${rotate * p}) scale(${0.8 + 0.2 * p})`}
    >
      <rect x={-w / 2 + 16} y={-h / 2 + 18} width={w} height={h} rx={18} fill={UI.ink} opacity={0.22} />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={18} fill={UI.paper} stroke={UI.ink} strokeWidth={8} />
      {titleLines.map((l, i) => (
        <text
          key={i}
          x={-w / 2 + 50}
          y={-h / 2 + 100 + i * 56}
          fontFamily={UI_FONT}
          fontWeight={800}
          fontSize={46}
          fill={UI.ink}
        >
          {l}
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
        const isHl = i === highlightLine;
        const hlP = clamp((inP - 0.6) / 0.4, 0, 1);
        return (
          <g key={i}>
            {isHl && <rect x={-w / 2 + 44} y={ly - 22} width={(lw + 12) * hlP} height={40} fill="#FFE066" />}
            <rect x={-w / 2 + 50} y={ly - 8} width={lw} height={14} rx={7} fill={isHl ? UI.ink : '#B9B2A6'} />
          </g>
        );
      })}
    </g>
  );
}

function ZoomBox({ o }) {
  const { inP, outP } = o.env;
  const { x = 300, y = 900, w = 400, h = 300, label } = o;
  const draw = EASE.out(inP);
  return (
    <g opacity={outP}>
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
        <g opacity={clamp((inP - 0.5) * 2, 0, 1)}>
          <rect x={x} y={y - 92} width={label.length * 30 + 48} height={74} rx={16} fill={UI.accent} />
          <text x={x + 24} y={y - 40} fontFamily={UI_FONT} fontWeight={800} fontSize={48} fill={UI.paper}>
            {label}
          </text>
        </g>
      )}
    </g>
  );
}

const UI_COMPONENTS = {
  text: TextOverlay,
  thought: ThoughtBubble,
  check: Checkmark,
  paper: ResearchPaper,
  zoombox: ZoomBox,
};

/* ============================ SCENE RENDER ============================= */
function Scene({ scene, t }) {
  const local = t - scene.start;

  // Camera: world-space focus point + zoom, tweened between keyframes.
  const cam = {
    zoom: 1,
    x: CANVAS.width / 2,
    y: CANVAS.height / 2,
    ...sampleTrack(scene.camera, local),
  };
  // Optional subtle handheld drift keeps static plates alive.
  const drift = scene.drift === false ? { x: 0, y: 0 } : { x: Math.sin(local * 0.7) * 3, y: Math.cos(local * 0.5) * 3 };
  const camTransform = `translate(${CANVAS.width / 2} ${CANVAS.height / 2}) scale(${cam.zoom}) translate(${-cam.x + drift.x} ${-cam.y + drift.y})`;

  const charState = scene.character
    ? { ...scene.character, ...sampleTrack(scene.character.track, local) }
    : null;

  const withTime = (items = []) => items.map((it) => ({ ...it, __t: local }));

  return (
    <>
      <g data-layer="world" transform={camTransform}>
        <g data-layer="1-background">
          <BackgroundPlate src={scene.background} />
        </g>
        <g data-layer="2-midground">
          {withTime(scene.midground).map((it, i) => (
            <ImageLayer key={i} item={it} />
          ))}
        </g>
        <g data-layer="3-character">
          {charState && (
            <Stickman
              {...charState}
              track={undefined}
              time={t /* global time so blinks/breath are continuous across cuts */}
            />
          )}
        </g>
        <g data-layer="4-foreground">
          {withTime(scene.foreground).map((it, i) => (
            <ImageLayer key={i} item={it} />
          ))}
        </g>
      </g>

      <g data-layer="5-ui">
        {(scene.ui || []).map((o, i) => {
          const env = envelope(local, o.start, o.end, o.inDur, o.outDur);
          if (!env.visible) return null;
          const C = UI_COMPONENTS[o.type];
          return C ? <C key={i} t={local} o={{ ...o, env }} /> : null;
        })}
      </g>
    </>
  );
}

/* ============================ DEMO TIMELINE ============================ */
// Vector stand-ins used until Flow props exist in assets/props.
const DemoDesk = () => (
  <g>
    <rect x={40} y={1250} width={720} height={36} rx={8} fill="#8A6A4A" stroke={PALETTE.ink} strokeWidth={10} />
    <rect x={80} y={1286} width={26} height={300} fill={PALETTE.ink} />
    <rect x={694} y={1286} width={26} height={300} fill={PALETTE.ink} />
  </g>
);
const DemoNotebook = () => (
  <g>
    <rect x={250} y={1226} width={260} height={30} rx={4} fill={UI.paper} stroke={PALETTE.ink} strokeWidth={6} />
  </g>
);

/**
 * Timeline schema
 * {
 *   duration: seconds,
 *   scenes: [{
 *     id, start, end,                     // seconds (global)
 *     background: 'assets/backgrounds/x.png',
 *     midground:  [{ src, x, y, w, h } | { render }],
 *     character:  { ...Stickman props, track: [{ t, x, y, scale, action, expression, ... }] },
 *     foreground: [{ src, x, y, w, h } | { render }],
 *     camera:     [{ t, zoom, x, y, ease }], // t is scene-local
 *     ui:         [{ type: 'text'|'thought'|'check'|'paper'|'zoombox', start, end, ... }],
 *   }]
 * }
 */
export const DEMO_TIMELINE = {
  duration: 12,
  scenes: [
    {
      id: 'hook',
      start: 0,
      end: 6,
      background: null,
      midground: [{ render: () => <DemoDesk /> }],
      character: {
        x: 640,
        y: 1480,
        scale: 1,
        action: 'writing',
        handTarget: { x: 360, y: 1235 },
      },
      foreground: [{ render: () => <DemoNotebook /> }],
      camera: [
        { t: 0, zoom: 1.0, x: 540, y: 960 },
        { t: 6, zoom: 1.12, x: 520, y: 1000, ease: 'inOut' },
      ],
      ui: [
        { type: 'text', start: 0.3, end: 5.8, text: 'Why discipline beats motivation', highlight: ['discipline'], reveal: 'words', y: 330 },
        { type: 'zoombox', start: 2.5, end: 5.6, x: 220, y: 1160, w: 340, h: 140, label: 'the habit' },
      ],
    },
    {
      id: 'insight',
      start: 6,
      end: 12,
      background: null,
      character: {
        x: 540,
        y: 1560,
        scale: 1.05,
        action: 'thinking',
        track: [
          { t: 0, expression: 'thinking' },
          { t: 3.6, expression: 'smile' },
        ],
      },
      camera: [
        { t: 0, zoom: 1.25, x: 540, y: 900 },
        { t: 2.0, zoom: 1.0, x: 540, y: 960, ease: 'out' },
      ],
      ui: [
        { type: 'thought', start: 0.4, end: 3.4, x: 700, y: 430, text: 'What if I just start small?', anchor: { x: 600, y: 700 } },
        { type: 'paper', start: 3.4, end: 5.8, x: 560, y: 760, title: 'Habit formation in everyday life', source: 'Lally et al., 2010 · EJSP' },
        { type: 'check', start: 4.4, end: 5.9, x: 150, y: 1760, r: 80, label: '66 days' },
      ],
    },
  ],
};

/* ============================ MASTER COMPONENT ========================= */
/**
 * <VideoComposition />
 *  timeline   timeline object (defaults to DEMO_TIMELINE)
 *  frame      external frame number (Remotion). If omitted, a rAF loop drives preview.
 *  fps        frames per second (default 30)
 *  loop       loop the preview clock (default true)
 *  style      CSS for the outer <svg>
 */
export default function VideoComposition({ timeline = DEMO_TIMELINE, frame, fps = CANVAS.fps, loop = true, style }) {
  const [clock, setClock] = useState(0);
  const startRef = useRef(null);
  const external = typeof frame === 'number';

  useEffect(() => {
    if (external) return undefined;
    let raf;
    const tick = (now) => {
      if (startRef.current == null) startRef.current = now;
      let s = (now - startRef.current) / 1000;
      if (loop) s %= timeline.duration;
      else s = Math.min(s, timeline.duration);
      // quantize to frames so preview == final render
      setClock(Math.floor(s * fps) / fps);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [external, fps, loop, timeline.duration]);

  const t = external ? frame / fps : clock;
  const scene =
    timeline.scenes.find((s) => t >= s.start && t < s.end) || timeline.scenes[timeline.scenes.length - 1];

  return (
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
      <g clipPath="url(#frame-clip)">{scene && <Scene key={scene.id} scene={scene} t={t} />}</g>
    </svg>
  );
}
