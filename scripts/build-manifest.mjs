#!/usr/bin/env node
/**
 * Build / refresh assets/manifest.json from the Flow assets on disk.
 *
 *   node scripts/build-manifest.mjs [repoRoot]
 *
 * Scans:
 *   assets/backgrounds/*.{png,jpg,jpeg,webp,svg}
 *   assets/library/{bodies,heads,items,props}/*.{png,webp,svg}
 *
 * Naming:
 *   <id>.png              → entry <id>
 *   <id>__<variant>.png   → variant of <id> (heads: blink, talk; bodies: front)
 *
 * Re-running is safe: hand-tuned fields (anchor, neck, hands, grip, angle,
 * scale, headScale) are preserved; only src/w/h are refreshed. New entries get
 * default anchors and `"_anchorsVerified": false` until they are checked.
 * Entries whose files were deleted are removed and reported.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.argv[2] || process.cwd());
const MANIFEST = path.join(ROOT, 'assets/manifest.json');
const IMG = /\.(png|jpe?g|webp|svg)$/i;

/* --------------------------- image dimensions --------------------------- */
function dimensions(file) {
  const buf = fs.readFileSync(file);
  const ext = path.extname(file).toLowerCase();
  if (ext === '.png' && buf.toString('ascii', 1, 4) === 'PNG') return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (ext === '.svg') {
    const txt = buf.toString('utf8');
    const vb = txt.match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
    if (vb) return { w: +vb[1], h: +vb[2] };
    const w = txt.match(/\bwidth\s*=\s*["']([\d.]+)/i);
    const h = txt.match(/\bheight\s*=\s*["']([\d.]+)/i);
    if (w && h) return { w: +w[1], h: +h[1] };
  }
  if (ext === '.webp' && buf.toString('ascii', 0, 4) === 'RIFF') {
    const kind = buf.toString('ascii', 12, 16);
    if (kind === 'VP8X') return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
    if (kind === 'VP8L') {
      const b = buf.readUInt32LE(21);
      return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 };
    }
    if (kind === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
  }
  if (ext === '.jpg' || ext === '.jpeg') {
    let i = 2;
    while (i < buf.length) {
      if (buf[i] !== 0xff) break;
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker))
        return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
      i += 2 + len;
    }
  }
  throw new Error(`cannot read dimensions of ${file}`);
}

/* ------------------------------ defaults -------------------------------- */
const DEFAULTS = {
  backgrounds: () => ({}),
  props: (w, h) => ({ anchor: { x: Math.round(w / 2), y: h } }),
  bodies: (w, h) => ({
    anchor: { x: Math.round(w / 2), y: h },
    neck: { x: Math.round(w / 2), y: Math.round(h * 0.06) },
    hands: { L: { x: Math.round(w * 0.12), y: Math.round(h * 0.5), angle: 100 }, R: { x: Math.round(w * 0.88), y: Math.round(h * 0.5), angle: 80 } },
  }),
  heads: (w, h) => ({ neck: { x: Math.round(w / 2), y: h } }),
  items: (w, h) => ({ grip: { x: Math.round(w / 2), y: Math.round(h / 2) }, angle: 0 }),
};

/* -------------------------------- build --------------------------------- */
const rel = (abs) => path.relative(ROOT, abs).split(path.sep).join('/');
const old = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};
const oldTable = (cat) => (cat === 'backgrounds' ? old.backgrounds : old.library?.[cat]) || {};

const out = { version: 1, backgrounds: {}, library: { bodies: {}, heads: {}, items: {}, props: {} } };
const report = { added: [], updated: [], removed: [], unverified: [] };

function scan(cat, dir) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return;
  const files = fs.readdirSync(abs).filter((f) => IMG.test(f)).sort();
  const table = cat === 'backgrounds' ? out.backgrounds : out.library[cat];
  const prev = oldTable(cat);
  // base files first, then variants
  const parsed = files.map((f) => {
    const stem = f.replace(IMG, '');
    const [id, variant] = stem.split('__');
    return { f, id, variant };
  });
  for (const { f, id, variant } of parsed.filter((p) => !p.variant)) {
    const file = path.join(abs, f);
    const { w, h } = dimensions(file);
    const before = prev[id];
    const entry = { ...DEFAULTS[cat](w, h), ...(before || {}), src: rel(file), w, h };
    if (!before) {
      if (cat !== 'backgrounds') entry._anchorsVerified = false;
      report.added.push(`${cat}/${id}`);
    } else if (before.w !== w || before.h !== h || before.src !== entry.src) {
      report.updated.push(`${cat}/${id}`);
    }
    delete entry.variants;
    table[id] = entry;
  }
  for (const { f, id, variant } of parsed.filter((p) => p.variant)) {
    const base = table[id];
    if (!base) {
      console.warn(`  ! variant ${f} has no base file ${id}.*  — skipped`);
      continue;
    }
    const src = rel(path.join(abs, f));
    if (cat === 'bodies' && variant === 'front') base.front = { src };
    else (base.variants ||= {})[variant] = src;
  }
  for (const id of Object.keys(prev)) if (!table[id]) report.removed.push(`${cat}/${id}`);
  for (const [id, e] of Object.entries(table)) if (e._anchorsVerified === false) report.unverified.push(`${cat}/${id}`);
}

scan('backgrounds', 'assets/backgrounds');
for (const cat of ['bodies', 'heads', 'items', 'props']) scan(cat, `assets/library/${cat}`);

fs.writeFileSync(MANIFEST, JSON.stringify(out, null, 2) + '\n');
const count = Object.keys(out.backgrounds).length + Object.values(out.library).reduce((n, t) => n + Object.keys(t).length, 0);
console.log(`manifest: ${rel(MANIFEST)} — ${count} assets`);
for (const [k, v] of Object.entries(report)) if (v.length) console.log(`  ${k.padEnd(10)} ${v.join(', ')}`);
