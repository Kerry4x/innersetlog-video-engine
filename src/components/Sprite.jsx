/**
 * Sprite primitives — the only things this engine "draws" are Flow images.
 * Missing assets render as a labeled dashed placeholder box (same footprint),
 * so a timeline can be blocked out and previewed before Flow delivers.
 */
import React from 'react';
import { assetUrl, findAsset, PLACEHOLDER_SIZE } from '../engine/assets.js';

export function Placeholder({ w, h, label, labelY }) {
  const fs = Math.max(14, Math.min(34, w / 9));
  return (
    <g data-placeholder={label}>
      <rect x={0} y={0} width={w} height={h} rx={14} fill="rgba(17,17,17,0.04)" stroke="#9A8F7E" strokeWidth={4} strokeDasharray="14 10" />
      <text x={w / 2} y={labelY ?? h / 2} textAnchor="middle" dominantBaseline="middle" fontFamily="'Inter', Arial, sans-serif" fontWeight={700} fontSize={fs} fill="#7A6F5E">
        {label}
      </text>
    </g>
  );
}

/** Resolve an asset → { entry, w, h, href, label } with placeholder sizing when missing. */
export function resolveSprite(manifest, id, category, base) {
  const found = findAsset(manifest, id, category) || { category, id, entry: null };
  const cat = found.category || category || 'props';
  const size = PLACEHOLDER_SIZE[cat] || PLACEHOLDER_SIZE.props;
  const entry = found.entry;
  return {
    entry,
    category: cat,
    w: entry?.w ?? size.w,
    h: entry?.h ?? size.h,
    href: entry ? assetUrl(entry.src, base) : null,
    label: `${cat}/${found.id}`,
  };
}

/** Raw image (or placeholder) at the origin of the current transform. */
export function SpriteImage({ href, w, h, label, opacity = 1 }) {
  if (!href) return <Placeholder w={w} h={h} label={label} />;
  return <image href={href} x={0} y={0} width={w} height={h} opacity={opacity} preserveAspectRatio="none" />;
}

/**
 * Place a library prop so its anchor lands on (x, y).
 * Default anchor: bottom-center (props stand on surfaces).
 */
export function Sprite({ manifest, base, asset, category = 'props', x = 0, y = 0, scale = 1, rotate = 0, flipX = false, opacity = 1, anchor }) {
  const s = resolveSprite(manifest, asset, category, base);
  const a = anchor || s.entry?.anchor || { x: s.w / 2, y: s.h };
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale * (flipX ? -1 : 1)} ${scale}) translate(${-a.x} ${-a.y})`} opacity={opacity}>
      <SpriteImage href={s.href} w={s.w} h={s.h} label={s.label} />
    </g>
  );
}

/** Background plate: cover-fits the canvas (Flow plates should be 9:16 with ~10% safe margin). */
export function BackgroundSprite({ manifest, base, asset, canvas, overscan = 1 }) {
  const { width: W, height: H } = canvas;
  const s = resolveSprite(manifest, asset, 'backgrounds', base);
  return (
    <g transform={`translate(${W / 2} ${H / 2}) scale(${overscan}) translate(${-W / 2} ${-H / 2})`}>
      {s.href ? (
        <image href={s.href} x={0} y={0} width={W} height={H} preserveAspectRatio="xMidYMid slice" />
      ) : (
        <g>
          <rect width={W} height={H} fill="#E9E1D3" />
          <Placeholder w={W} h={H} labelY={170} label={asset ? s.label : 'backgrounds/(none)'} />
        </g>
      )}
    </g>
  );
}
