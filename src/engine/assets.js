/**
 * Innersetlog Asset Manifest
 * ------------------------------------------------------------------
 * Flow is the artist; this engine only assembles. Every visual (plates,
 * props, body poses, head expressions, hand items) is a Flow-generated
 * transparent PNG/SVG listed in `assets/manifest.json`, which
 * `scripts/build-manifest.mjs` keeps in sync with the files on disk.
 *
 * Manifest shape (pixel coordinates are in the asset's own image space):
 * {
 *   "version": 1,
 *   "backgrounds": { "<id>": { "src", "w", "h" } },
 *   "library": {
 *     "props":  { "<id>": { "src", "w", "h", "anchor": {x,y} } },              // anchor = point placed at (x,y); default bottom-center
 *     "bodies": { "<id>": { "src", "w", "h",
 *                           "anchor": {x,y},                                    // ground point between the feet
 *                           "neck":   {x,y},                                    // where the head's neck point attaches
 *                           "hands":  { "L": {x,y,angle}, "R": {x,y,angle} },   // item grip points; angle = wrist direction (deg)
 *                           "front":  { "src" } } },                            // optional overlay: front arm/leg (z-layer 5)
 *     "heads":  { "<id>": { "src", "w", "h", "neck": {x,y},
 *                           "variants": { "blink": "<src>", "talk": "<src>" } } },
 *     "items":  { "<id>": { "src", "w", "h", "grip": {x,y}, "angle": 0 } }      // grip = point held in the hand
 *   }
 * }
 */
import { useEffect, useState } from 'react';

export const CATEGORIES = ['backgrounds', 'bodies', 'heads', 'items', 'props'];

export const EMPTY_MANIFEST = {
  version: 1,
  backgrounds: {},
  library: { bodies: {}, heads: {}, items: {}, props: {} },
};

/** Fill in missing sections so lookups never throw. */
export function normalizeManifest(m) {
  const src = m || {};
  return {
    ...EMPTY_MANIFEST,
    ...src,
    backgrounds: { ...(src.backgrounds || {}) },
    library: {
      bodies: { ...(src.library?.bodies || {}) },
      heads: { ...(src.library?.heads || {}) },
      items: { ...(src.library?.items || {}) },
      props: { ...(src.library?.props || {}) },
    },
  };
}

const table = (manifest, category) => (category === 'backgrounds' ? manifest.backgrounds : manifest.library[category]) || {};

/**
 * Look up an asset by id. `id` may be qualified ('props/desk_oak') or bare
 * ('desk_oak'); bare ids search `category` first, then everything.
 * Returns { category, id, entry } or { category, id, entry: null } if missing.
 */
export function findAsset(manifest, id, category) {
  if (!id) return null;
  let cat = category;
  let key = id;
  if (id.includes('/')) {
    const [c, ...rest] = id.split('/');
    if (CATEGORIES.includes(c)) {
      cat = c;
      key = rest.join('/');
    }
  }
  if (cat && table(manifest, cat)[key]) return { category: cat, id: key, entry: table(manifest, cat)[key] };
  for (const c of CATEGORIES) if (table(manifest, c)[key]) return { category: c, id: key, entry: table(manifest, c)[key] };
  return { category: cat, id: key, entry: null };
}

/** Join a manifest src with the serving base (e.g. '' in dev, staticFile root in Remotion). */
export const assetUrl = (src, base = '') => (!src ? null : /^([a-z][a-z0-9+.-]*:|\/)/i.test(src) ? src : `${base}${src}`); // any URL scheme or root path = absolute

/** Placeholder box sizes used until a Flow asset exists, so timelines stay previewable. */
export const PLACEHOLDER_SIZE = {
  backgrounds: { w: 1080, h: 1920 },
  bodies: { w: 380, h: 640 },
  heads: { w: 260, h: 260 },
  items: { w: 110, h: 110 },
  props: { w: 560, h: 360 },
};

/** Every asset id a timeline references, with the ones the manifest doesn't have yet. */
export function auditTimeline(timeline, manifest) {
  const refs = [];
  const add = (id, category, where) => id && refs.push({ id, category, where });
  for (const s of timeline.scenes || []) {
    add(s.background, 'backgrounds', `${s.id}.background`);
    for (const [i, it] of (s.midground || []).entries()) add(it.asset, 'props', `${s.id}.midground[${i}]`);
    for (const [i, it] of (s.foreground || []).entries()) add(it.asset, 'props', `${s.id}.foreground[${i}]`);
    const ch = s.character;
    if (ch) {
      const frames = [ch, ...(ch.track || [])];
      for (const f of frames) {
        add(f.body, 'bodies', `${s.id}.character.body`);
        add(f.expression, 'heads', `${s.id}.character.expression`);
        for (const v of Object.values(f.hold || {})) add(typeof v === 'string' ? v : v?.asset, 'items', `${s.id}.character.hold`);
      }
    }
    for (const [i, o] of (s.ui || []).entries()) if (o.type === 'sprite') add(o.asset, 'props', `${s.id}.ui[${i}]`);
  }
  const seen = new Set();
  const unique = refs.filter((r) => {
    const k = `${r.category}:${r.id}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return { refs: unique, missing: unique.filter((r) => !findAsset(manifest, r.id, r.category)?.entry) };
}

/**
 * React hook: accepts a manifest object or a URL to manifest.json.
 * Returns a normalized manifest (empty until a URL finishes loading).
 */
export function useAssetManifest(source) {
  const [manifest, setManifest] = useState(() => normalizeManifest(typeof source === 'object' ? source : null));
  useEffect(() => {
    if (typeof source === 'object') {
      setManifest(normalizeManifest(source));
      return undefined;
    }
    if (typeof source !== 'string') return undefined;
    let alive = true;
    fetch(source)
      .then((r) => r.json())
      .then((m) => alive && setManifest(normalizeManifest(m)))
      .catch((e) => console.warn(`[assets] could not load manifest ${source}:`, e));
    return () => {
      alive = false;
    };
  }, [source]);
  return manifest;
}

/** Collect every src in the manifest (incl. variants / front overlays). */
export function manifestSources(manifest) {
  const out = [];
  for (const c of CATEGORIES) {
    for (const e of Object.values(table(manifest, c))) {
      if (e.src) out.push(e.src);
      if (e.front?.src) out.push(e.front.src);
      for (const v of Object.values(e.variants || {})) out.push(typeof v === 'string' ? v : v.src);
    }
  }
  return out;
}

/** Browser preload so the first frames don't pop in. In Remotion, wrap with delayRender/continueRender. */
export function preloadManifest(manifest, base = '') {
  if (typeof Image === 'undefined') return Promise.resolve();
  return Promise.all(
    manifestSources(manifest).map(
      (src) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = img.onerror = resolve;
          img.src = assetUrl(src, base);
        })
    )
  );
}
