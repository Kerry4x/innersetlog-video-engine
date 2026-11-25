// Approved character design (Study 2, built from the clay character system) as a RIGGED character.
// Geometry matches look_tests/clayref.html; every moving part sits on its own pivot so it can act.
// Rig: body (lean/sway/bob), head (nod/turn/tilt), eyes (look), upper+lower lids (blink/squint/widen),
// brows (raise/angry/sad), jaw (talk; carries the beard), arms (shoulder/elbow/wrist), fingers (curl/point), feet (walk).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
let seed = 5; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const print = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); g.fillStyle = '#808080'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 30; i++) { const x = rand() * 512, y = rand() * 512, R = 14 + rand() * 18, rot = rand() * 3; for (let k = 1; k < 8; k++) { g.strokeStyle = k % 2 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, y, R * k / 7, R * k / 7 * 0.7, rot, 0.4, 5.8); g.stroke(); } }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); return t; })();
const cache = {};
/* knit: rows of little V stitches in the bump map (sweaters read as wool, not plastic) */
const knitTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#606060'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 16) for (let x = 0; x < 256; x += 16) for (const sd of [-1, 1]) { const gr = g.createLinearGradient(x + 8, y, x + 8 + sd * 8, y + 16); gr.addColorStop(0, '#d8d8d8'); gr.addColorStop(1, '#505050');
    g.fillStyle = gr; g.beginPath(); g.ellipse(x + 8 + sd * 3.6, y + 9, 3.4, 7.2, -sd * 0.55, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
const knitCache = {};
export const knit = (c, rep = [18, 10]) => { const k = c + rep; if (knitCache[k]) return knitCache[k]; const t = knitTex.clone(); t.repeat.set(...rep); t.needsUpdate = true;
  return (knitCache[k] = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.85, bumpMap: t, bumpScale: 2.2, sheen: 0.5, sheenRoughness: 0.8, sheenColor: new THREE.Color(c).multiplyScalar(1.2) })); };
export const clay = (c, o = {}) => { const k = c + JSON.stringify(o); return cache[k] || (cache[k] = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.58, bumpMap: print, bumpScale: 0.8, sheen: 0.06, ...o })); };
export const M = (geo, mat, parent) => { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; if (parent) parent.add(m); return m; };
/* a tube bent along an arc with rounded, closed ends (an open TorusGeometry end shows a hollow) */
function arcTube(R, r, rs, ts, arc) { const parts = [new THREE.TorusGeometry(R, r, rs, ts, arc)];
  for (const a of [0, arc]) { const c = new THREE.SphereGeometry(r, rs + 4, Math.max(8, rs)); c.translate(R * Math.cos(a), R * Math.sin(a), 0); parts.push(c); }
  const g = mergeGeometries(parts); g.computeVertexNormals(); return g; }
/* average normals of vertices that share a position (lathe seams, capsule poles): no hard line where a surface wraps around */
export function smoothSeams(geo) { const p = geo.attributes.position, n = geo.attributes.normal; if (!n) return geo; const m = new Map(); for (let i = 0; i < p.count; i++) { const k = `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`; (m.get(k) || m.set(k, []).get(k)).push(i); }
  const v = new THREE.Vector3(); for (const ids of m.values()) { if (ids.length < 2) continue; v.set(0, 0, 0); for (const i of ids) v.x += n.getX(i), v.y += n.getY(i), v.z += n.getZ(i); v.normalize(); for (const i of ids) n.setXYZ(i, v.x, v.y, v.z); } n.needsUpdate = true; return geo; }
export const lathe = (pts, seg = 64, p0 = 0, pl = Math.PI * 2) => { const full = pl >= Math.PI * 2 - 1e-6; const g = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg, full ? Math.PI : p0, pl); /* full turns start at the back: the texture seam never faces the camera */ return pl >= Math.PI * 2 - 1e-6 ? smoothSeams(g) : g; };
function folds(geo, amp, n, y0, y1) { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(x, z); if (r < 1e-5) continue; const t = Math.max(0, Math.min(1, (y1 - y) / (y1 - y0))); const k = amp * t * Math.sin(Math.atan2(x, z) * n + Math.sin(y * 7) * 0.6); p.setX(i, x * (r + k) / r); p.setZ(i, z * (r + k) / r); } geo.computeVertexNormals(); return smoothSeams(geo); }
function grooves(geo, amp, n) { const p = geo.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const L = v.length(); if (L < 1e-5) continue; v.multiplyScalar((L + amp * Math.sin(Math.atan2(v.x, v.z) * n + v.y * 6)) / L); p.setXYZ(i, v.x, v.y, v.z); } geo.computeVertexNormals(); return smoothSeams(geo); }
function sausage(a, b, r, mat, parent) { const d = b.clone().sub(a), m = M(new THREE.CapsuleGeometry(r, d.length(), 10, 20), mat, parent); m.position.copy(a).lerp(b, 0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); return m; }

const HP_BASE = [[0, 0], [0.11, 0.008], [0.19, 0.05], [0.228, 0.13], [0.238, 0.24], [0.232, 0.36], [0.218, 0.45], [0.2, 0.51], [0.168, 0.565], [0.12, 0.605], [0.062, 0.624], [0, 0.629]];
/* 'egg' (the reference heads): widest at the eyes, the jaw tapering to a small chin */
const smoothProfile = pts => { const c = new THREE.CatmullRomCurve3(pts.map(([x, y]) => V(x, y, 0)), false, 'centripetal'); return c.getSpacedPoints(64).map(v => [Math.max(0, v.x), v.y]); }; /* a smooth curve, not a dozen straight segments (they showed as facets) */
const HP_EGG = smoothProfile([[0, 0], [0.1, 0.006], [0.168, 0.04], [0.203, 0.11], [0.221, 0.2], [0.23, 0.3], [0.229, 0.4], [0.213, 0.5], [0.178, 0.565], [0.125, 0.605], [0.064, 0.624], [0, 0.629]]); /* fuller, rounder jaw than the first egg */
let HP = HP_BASE;
const hr = y => { for (let i = 1; i < HP.length; i++) if (y <= HP[i][1]) { const [r0, y0] = HP[i - 1], [r1, y1] = HP[i]; return r0 + (r1 - r0) * (y - y0) / (y1 - y0); } return 0; };
const lerp1 = (a, b, k) => a + (b - a) * k;
/* face sculpt: a muzzle (the lower face comes forward, like a real jaw) and a chin, added to the skull's front.
   surf() includes it, so eyes, nose, mouth and beard sit on the sculpted surface. */
let FACE = { muzzle: 0, chin: 0 };
const sm01 = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const faceOff = (x, y, c) => { if (!FACE.muzzle && !FACE.chin) return 0; const w = sm01((c - 0.35) / 0.45);
  return w * (FACE.muzzle * 0.06 * Math.exp(-(((y - 0.11) / 0.11) ** 2)) * Math.exp(-((x / 0.24) ** 2)) + FACE.chin * 0.035 * Math.exp(-(((y - 0.025) / 0.04) ** 2)) * Math.exp(-((x / 0.11) ** 2))); }; /* broad and soft: a full lower face and a rounded chin, not a ridge or a point */
/* face structure (radial, pre-squash units): cheekbones, jaw corners, brow ridge, soft eye sockets, temples, a lip mound.
   Each term is a soft bump or dent, so the face reads as bone under clay from every angle instead of one smooth egg. */
const G2 = (x, y, x0, y0, sx, sy) => Math.exp(-(((x - x0) / sx) ** 2) - (((y - y0) / sy) ** 2));
const sideOff = (x, y, c) => { const F = FACE.s; if (!F) return 0; const s = sm01(c / 0.35), w = sm01((c - 0.35) / 0.45); let d = 0;
  for (const k of [-1, 1]) d += (F.cheek || 0) * 0.02 * G2(x, y, 0.13 * k, 0.215, 0.055, 0.05) + (F.jaw || 0) * 0.016 * G2(x, y, 0.155 * k, 0.075, 0.05, 0.045)
                              - (F.temple || 0) * 0.012 * G2(x, y, 0.2 * k, 0.4, 0.04, 0.06) - (F.socket || 0) * 0.01 * G2(x, y, 0.09 * k, 0.32, 0.05, 0.04);
  d *= s; d -= (F.nape || 0) * 0.05 * sm01((0.17 - y) / 0.13) * sm01((0.35 - c) / 0.7); /* the lower back of the head narrows into the neck: a jaw angle under the ear, not a flat disc */
  d += w * ((F.brow || 0) * 0.012 * Math.exp(-(((y - 0.43) / 0.028) ** 2)) * Math.exp(-((x / 0.17) ** 2)) + (F.lips || 0) * 0.008 * G2(x, y, 0, 0.072, 0.05, 0.022));
  return d; };
const SZ = 0.94, surf = (x, y) => { const r = hr(y), z = Math.sqrt(Math.max(0.0001, r ** 2 - x * x)), c = r > 1e-4 ? z / r : 0; return (z + sideOff(x, y, c) * c) * SZ + faceOff(x, y, c); };

function buildHead({ skin, hair, browC, bald, beard, beardLen = 0.1, beardDepth = 0.85, beardLocks = 0, crown, lidTop = 0.36, hairStyle = 'short', glasses = null, nose = 1, lashes = false, lips = null, hairline = 0, browW = 1, noseStyle = 'ball', noseUp = 0, hairFlip = false, sideburnZ = 0, lidTube = 0.25, lidTilt = 0, browY = 0.06, lidWrap = 1, headShape = 'base', chin = 0, muzzle = 0, sculpt = null, earArc = 1.55, earScale = 1, earZ = 0, beardArc = 3.5, mouthY = 0.062, eyeR = 0.076, eyeX = 0.09, eyeSink = 0.12, noseRoot = 0 }, R) {
  HP = headShape === 'egg' ? HP_EGG : HP_BASE; /* every feature is placed on hr(): they all follow the shape */
  const g = new THREE.Group(), sk = clay(skin), hm = clay(hair), ink = clay('#120b08', { roughness: 0.25, bumpScale: 0 }), white = clay('#f4efe2', { roughness: 0.32, bumpScale: 0.15 });
  const skullG = lathe(HP, headShape === 'egg' ? 128 : 72); /* the throne cast keeps its original mesh */
  FACE = { muzzle, chin, s: sculpt };
  if (muzzle || chin || sculpt) { const p = skullG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(x, z); if (r < 1e-5 || y < 0.004) continue; /* keep the bottom pole closed */
      const q = sideOff(x, y, z / r), d = z > 0 ? faceOff(x, y, z / r) / SZ : 0; p.setX(i, x * (r + q) / r); p.setZ(i, z * (r + q) / r + d); if (chin && y < 0.03) p.setY(i, y - 0.03 * chin * Math.exp(-((x / 0.08) ** 2)) * sm01((z / r - 0.35) / 0.45) * (0.03 - y) / 0.03); }
    skullG.computeVertexNormals(); smoothSeams(skullG); }
  const skull = M(skullG, sk, g); skull.scale.z = SZ;
  const eY = 0.33, eX = eyeX, eR = eyeR;
  R.eyes = []; R.brows = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(eX * s, eY, surf(eX, eY) - eR * eyeSink); /* eyeSink: how deep the eyeball sits in the face */ g.add(e);
    M(new THREE.SphereGeometry(eR, 40, 30), white, e);
    const aim = new THREE.Group(); e.add(aim); const p = M(new THREE.SphereGeometry(eR * 0.27, 20, 16), ink, aim); p.scale.z = 0.45; p.position.z = eR * 0.98;
    const lid = (cover, tube, flip) => { const LR = eR * 1.06, lg = new THREE.Group();
      M(new THREE.SphereGeometry(LR, 40, 18, 0, Math.PI * 2, 0, Math.PI * cover), sk, lg);
      const rim = M(new THREE.TorusGeometry(LR * Math.sin(Math.PI * cover), tube, 16, 56), sk, lg); rim.rotation.x = Math.PI / 2; rim.position.y = LR * Math.cos(Math.PI * cover);
      e.add(lg); return lg; };
    const top = lid(lidTop, eR * lidTube, false), bot = lid(0.15, eR * (lidTube > 0.25 ? Math.min(lidTube * 0.84, 0.19) : lidTube * 0.84), true); /* the lower lid stays slim: a thick one reads as tired bags */ if (lidWrap < 1) for (const L of [top, bot]) L.scale.set(lidWrap, 1, 1); /* lidWrap < 1: the lids stay inside the eyeball's outline (no visor wings) */
    R.eyes.push({ aim, top, bot, s, tilt: lidTilt });
    const bg = new THREE.Group(); bg.position.set(eX * s + 0.004 * s, eY + browY, surf(eX, eY + browY + 0.03) + 0.002); g.add(bg);
    const bw = M(arcTube(0.062, 0.019 * browW, 14, 40, Math.PI * 0.62), clay(browC), bg); bw.rotation.set(-0.25, 0, Math.PI * 0.19 + (s > 0 ? -0.08 : 0.08)); bw.scale.set(1, 1, 1.3);
    R.brows.push({ g: bg, s, y0: bg.position.y });
    const ear = new THREE.Group(); ear.position.set(hr(0.25) * 0.97 * s, 0.25 - (earScale - 1) * 0.03, -0.01 + earZ); ear.scale.setScalar(earScale); ear.rotation.y = 0.25 * s; g.add(ear);
    const lobe = M(new THREE.SphereGeometry(0.06, 24, 18), sk, ear); lobe.scale.set(0.35, 1, 0.75);
    const rim = M(arcTube(0.052, 0.017, 12, 32, Math.PI * earArc), sk, ear); rim.rotation.set(0, Math.PI / 2, Math.PI * 0.72); rim.position.x = 0.012 * s;
  }
  const n0 = V(0, eY + 0.03, surf(0, eY + 0.03) - 0.015), n1 = V(0, 0.185 + 0.03 * (1 - nose), surf(0, 0.185) + 0.1 * nose); /* nose < 1: smaller, less protruding */
  if (noseStyle === 'wedge') { /* the reference nose (every Clayrified profile): ONE solid wedge that grows out from between the eyes,
       continues the forehead line, widens to a rounded bulb with wings and slopes back under itself to the upper lip.
       Built from horizontal slices that each reach from inside the face out to the silhouette, so from the side there is never a gap. */
    const yR = eY + 0.075 - noseRoot, yT = 0.2 + 0.02 * (1 - nose) + noseUp, yB = yT - 0.07 * Math.pow(nose, 0.6), PR = 0.175 * nose, sm = t => t * t * (3 - 2 * t);
    const pr = y => y >= yT ? 0.035 + (PR - 0.035) * Math.pow((yR - y) / (yR - yT), 1.05) : PR * Math.sqrt(Math.max(0, 1 - ((yT - y) / (yT - yB)) ** 2));
    const wd = y => { const k = Math.max(0, Math.min(1, (yR - y) / (yR - yB))); const base = 0.022 + 0.016 * k + 0.03 * Math.pow(nose, 0.8) * sm(Math.max(0, Math.min(1, (k - 0.55) / 0.35))); return y < yT ? base * Math.pow(Math.max(0, 1 - ((yT - y) / (yT - yB)) ** 2), 0.3) : base; };
    const rows = 44, cols = 40, pos = [], idx = [];
    for (let r = 0; r <= rows; r++) { const u = r / rows; let y, P, Wd;
      if (u < 0.12) { const k = sm(u / 0.12); y = yR + 0.03 * (1 - k); P = pr(yR) * k - 0.012 * (1 - k); Wd = wd(yR) * Math.sqrt(k); } /* the root: tucks in under the brow */
      else { y = yR - (yR - yB) * (u - 0.12) / 0.88; P = pr(y); Wd = wd(y); }
      const back = surf(0, y) - 0.03, front = surf(0, y) + Math.max(P, -0.01), zc = (back + front) / 2, D = Math.max(0.0005, (front - back) / 2);
      for (let c = 0; c <= cols; c++) { const a = c / cols * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a); const x = Wd * sa * (1 - 0.3 * Math.max(0, ca) ** 2); /* rounded-triangle section: narrower at the bridge */ pos.push(x, y, zc + D * ca); } }
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const a = r * (cols + 1) + c, b = a + cols + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const ng = new THREE.BufferGeometry(); ng.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); ng.setIndex(idx); ng.computeVertexNormals(); smoothSeams(ng);
    const nm = M(ng, clay(skin, { side: THREE.DoubleSide }), g); R.nose = nm;
    n1.set(0, yT, surf(0, yT) + PR);
    { const tp = M(new THREE.SphereGeometry(0.042 * nose, 28, 20), sk, g); tp.position.set(0, yT - 0.012 * nose, surf(0, yT) + PR - 0.034 * nose); tp.scale.set(1.1, 1, 1); } /* a rounded bulb over the wedge's point */
    for (const s of [-1, 1]) { const w = M(new THREE.SphereGeometry(0.03 * nose, 20, 14), sk, g); w.scale.set(0.8, 0.85, 1); w.position.set(wd(yT - 0.02) * 0.8 * s, yT - 0.03 * nose, surf(0, yT) + PR * 0.22); } /* nostril wings, half sunk into the bulb */
  } else {
  sausage(n0, n1, 0.05 * nose, sk, g);
  const tip = M(new THREE.SphereGeometry(0.07 * nose, 32, 24), sk, g); tip.position.copy(n1); tip.scale.set(1, 0.92, 1);
  for (const s of [-1, 1]) { const w = M(new THREE.SphereGeometry(0.03 * nose, 16, 12), sk, g); w.position.set(0.04 * nose * s, n1.y - 0.015 * nose, n1.z - 0.035 * nose); }
  }
  if (lashes) for (const e of R.eyes) for (let k = 0; k < 3; k++) { const ls = M(new THREE.CapsuleGeometry(0.006, 0.03, 4, 8), clay('#1a120c', { bumpScale: 0 }), e.top); const a = (0.35 + k * 0.13) * e.s; ls.position.set(Math.sin(a) * 0.08, 0.035, 0.055); ls.rotation.set(-0.6, 0, -a * 1.3); } /* lashes ride on the top lid */
  if (lidTop > 0.33) for (const y of [0.47, 0.505]) { const c = M(arcTube(hr(y) * 0.98, 0.006, 8, 48, Math.PI * 0.32), sk, g); c.rotation.set(Math.PI / 2, 0, Math.PI * 0.34); c.position.y = y; c.scale.y = SZ; }
  // mouth: a dark opening behind the lips; the jaw (with the beard) swings down to show it
  const mY = mouthY; R.mY = mY;
  R.mouth = M(new THREE.SphereGeometry(0.05, 24, 16), clay('#2a0d08', { bumpScale: 0 }), g); R.mouth.scale.set(1, 0.15, 0.5); R.mouth.position.set(0, mY, surf(0, mY) - 0.02);
  const lip = M(arcTube(0.042, lips ? 0.0085 : 0.0075, 10, 32, Math.PI * 0.62), clay(lips || '#4a1e14', { bumpScale: 0 }), g); lip.rotation.z = Math.PI * 0.19; lip.position.set(0, mY - 0.03, surf(0, mY) - 0.004); R.lip = lip; if (beard) lip.visible = false; /* a beard covers the lower lip: a half-hidden lip reads as a dark blob with legs */
  R.jaw = new THREE.Group(); R.jaw.position.set(0, 0.2, 0); g.add(R.jaw); // pivot near the ears

  if (bald) {
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const t = M(grooves(new THREE.SphereGeometry(0.06, 28, 20), 0.004, 10), hm, g); t.scale.set(0.55, 0.75, 1.3); const y = 0.43 - i * 0.045; t.position.set(hr(y) * 0.98 * s, y, -0.04 - i * 0.03); t.rotation.set(0.2, 0.5 * s, 0.25 * s); }
    const back = M(arcTube(0.215, 0.05, 16, 48, Math.PI * 0.9), hm, g); back.rotation.set(Math.PI / 2, 0, Math.PI * 1.05); back.position.y = 0.37; back.scale.z = 1.5;
  } else {
    /* the hair is a thick clay slab that follows the skull (2.4 cm proud of it, so the grooves never let skin through).
       At the hairline and the nape it slopes down under the skin: one closed surface, no thin cut edge. */
    const LOCKS = hairStyle === 'wavy' || hairStyle === 'swept', LONG = hairStyle === 'long' || hairStyle === 'wavy', T = LOCKS ? 0.01 : 0.024, hp = []; for (let y = LONG ? (hairStyle === 'wavy' ? -0.08 : -0.22) : 0.15; y < 0.62; y += LOCKS ? 0.004 : 0.01) hp.push([y < 0.1 ? hr(0.1) + T + 0.06 * (0.1 - y) : hr(y) + T, y]); /* long: the same shell flows on down to the shoulders, flaring a little */ hp.push([hr(0.625) + T * 0.8, 0.629 + T * 0.55], [0, 0.629 + T]);
    const hg = lathe(hp, LOCKS ? 240 : 120) /* fine mesh: the hairline edge is smooth, not stepped */, hpos = hg.attributes.position, sm = (v, a, b) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
    for (let i = 0; i < hpos.count; i++) { const x = hpos.getX(i), y = hpos.getY(i), z = hpos.getZ(i), r = Math.hypot(x, z); if (r < 1e-5) continue; const c = z / r; /* 1 = front */
      const lim = LOCKS && LONG ? lerp1(-0.06, 0.53, sm(c, 0.3, 0.58)) /* the under-shell opens fully before the brows, and its edge stays under the strands */ /* an arched hairline around a round face, not a box */ : LONG ? lerp1(-0.3, 0.47, sm(c, 0.42, 0.6)) /* long: open only where the face is */ : c >= 0 ? 0.33 + hairline * 0.6 + (0.14 + hairline) * sm(c, 0.25, 0.75) : 0.33 - (LOCKS ? 0.17 : 0.13) * sm(-c, 0.2, 0.8); /* swept: the hair comes down to the nape, no bowl-cut */ /* forehead 0.47 (+hairline), sides above the ears, nape 0.2 */
      const k = sm(y, lim - 0.03, lim + 0.004), outer = y < 0.1 ? hr(0.1) + T + 0.06 * (0.1 - y) : hr(Math.min(y, 0.628)) + T, inner = y < 0.12 ? 0.06 : hr(Math.min(y, 0.628)) - (LOCKS ? 0.032 : 0.012) /* locks/sculpted heads: deep enough to stay under the sculpted temples */, rn = Math.max(0.001, inner + k * (outer - inner)); hpos.setX(i, x * rn / r); hpos.setZ(i, z * rn / r); }
    const SWEPT = hairStyle === 'swept'; const cap = M(LOCKS && !SWEPT ? (hg.computeVertexNormals(), smoothSeams(hg)) : grooves(hg, 0.005, SWEPT ? 40 : 30), LOCKS && !SWEPT ? clay(new THREE.Color(hair).multiplyScalar(0.9).getStyle()) : hm, g); /* swept: the shell shows at the back and nape, so it is grooved hair, not a dark cap */ cap.scale.z = SZ; /* under the strands: a darker shell, so gaps read as depth */
    if (hairStyle === 'wavy' || hairStyle === 'swept') { hairLocks(hairStyle, g, hm, T, R); if (hairFlip) R.hairLocks.scale.x = -1; /* part on the other side */ }

    if (R.earrings) for (const sd of [-1, 1]) { const ring = M(new THREE.TorusGeometry(0.022, 0.0055, 8, 24), clay(R.earrings, { roughness: 0.3, bumpScale: 0 }), g); ring.position.set((hr(0.2) + 0.01) * sd, 0.17, 0.0); ring.rotation.y = Math.PI / 2; }
    if (!LOCKS) for (const s of [-1, 1]) { const sb = M(new THREE.CapsuleGeometry(0.03, 0.09, 8, 16), hm, g); sb.position.set(hr(0.3) * 0.95 * s, 0.31, 0.05); }
  }
  if (beard) {
    const t = 0.03, pts = []; for (let y = 0.0; y <= 0.04; y += 0.01) pts.push([hr(y) + t, y]); pts.unshift([hr(0) * 0.6 + t, -0.02]);
    /* one sculpted piece: the jaw band and the mass under the chin are merged, then ONE strand pattern is cut into both */
    const bandG = lathe(pts, 144, Math.PI * 0.5 - beardArc / 2, beardArc); bandG.applyMatrix4(new THREE.Matrix4().compose(V(0, -0.2, 0), new THREE.Quaternion(), V(1, 1, SZ * 1.04)));
    const massG = new THREE.SphereGeometry(0.15, 96, 64); massG.applyMatrix4(new THREE.Matrix4().compose(V(0, 0.03 - beardLen * 0.9 - 0.2, surf(0, 0.05) - 0.08), new THREE.Quaternion(), V(1.25, 0.8 + beardLen * 5, beardDepth))); /* beardDepth: front-to-back volume (seen in profile) */
    const bg = mergeGeometries([bandG, massG]); bg.computeVertexNormals(); const nb = bg.attributes.normal.array.slice(); /* smooth, indexed */
    /* strands are stored separately from the shape, so draping can move the shape and the strands are cut back in afterwards */
    const base = bg.attributes.position.array.slice(), n = base.length / 3, gx = new Float32Array(n), gz = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2], r = Math.hypot(x, z); if (r < 1e-4) continue;
      const fade = Math.max(0, Math.min(1, (-0.165 - y) / 0.025)), a = Math.atan2(x, z); const k = fade * (0.006 * Math.sin(a * 26 + y * 9 + Math.sin(y * 23) * 0.8) + beardLocks * 0.022 * Math.pow(0.5 + 0.5 * Math.sin(a * 8 + 1.3 + y * 4), 2) * Math.min(1, (-0.18 - y) / 0.08)); /* + chunky locks: depth in profile, not even grooves */ gx[i] = x / r * k; gz[i] = z / r * k; } /* strands fade out at the top edge: a clean line under the mustache */
    const beardM = M(bg, clay(beard, { side: THREE.DoubleSide, bumpScale: 0.08 }), R.jaw); R.beardMeshes = [beardM]; R.beardStrands = { base, gx, gz, nb };
    { const p = bg.attributes.position; for (let i = 0; i < n; i++) p.setXYZ(i, base[i * 3] + gx[i], base[i * 3 + 1], base[i * 3 + 2] + gz[i]); bg.computeVertexNormals(); smoothSeams(bg); }
    for (const s of [-1, 1]) { if (sideburnZ < 0) { const pts = []; for (let k = 0; k <= 12; k++) { const t = k / 12, y = 0.36 - 0.32 * t, th = s * (1.32 - 0.3 * t), r = hr(y) + 0.012; pts.push(V(r * Math.sin(th), y, r * Math.cos(th) * SZ)); }
        M(lockGeo(pts, 0.034, 0.45, false, 1), clay(beard), g); } /* a flat sideburn laid on the cheek, in front of the ear, down into the beard */
      else if (!sideburnZ) sausage(V(hr(0.3) * 0.95 * s, 0.29, 0.0), V(hr(0.07) * 0.98 * s, 0.05, 0.06), 0.032, clay(beard), g); /* sideburnZ > 0: none (a short beard on the jaw only) */
      sausage(V(0.015 * s, n1.y - 0.07, n1.z - 0.06), V(0.1 * s, mY + 0.03, surf(0.1, mY + 0.03) + 0.004), 0.026, clay(beard), g); }
  }
  if (glasses) { const gm = clay(glasses, { roughness: 0.3, bumpScale: 0 }); for (const s of [-1, 1]) { const ring = M(new THREE.TorusGeometry(0.068, 0.009, 10, 32), gm, g); ring.position.set(0.09 * s, 0.33, surf(0.09, 0.33) + 0.045); }
    const br = M(new THREE.CylinderGeometry(0.008, 0.008, 0.05, 8), gm, g); br.rotation.z = Math.PI / 2; br.position.set(0, 0.35, surf(0, 0.35) + 0.04);
    for (const s of [-1, 1]) { const a0 = V(0.158 * s, 0.335, surf(0.09, 0.33) + 0.04), a1 = V((hr(0.34) + 0.004) * s, 0.34, surf(0.09, 0.33) - 0.06), a2 = V((hr(0.3) * 0.98) * s, 0.3, -0.02); sausage(a0, a1, 0.007, gm, g); sausage(a1, a2, 0.007, gm, g); } } /* each arm runs from the rim along the temple to the ear: no floating stub */ /* glasses: rings in front of the eyes, arms back to the ears */
  if (crown) { /* the band sits ON the hair: tapered to the skull at y 0.46-0.54, squashed front-to-back like the head (no floating gap) */
    const cg = new THREE.Group(); cg.position.y = 0.515; cg.scale.z = SZ * 1.03; g.add(cg); const gold = clay('#d6a640', { roughness: 0.38, side: THREE.DoubleSide });
    M(new THREE.CylinderGeometry(0.222, 0.245, 0.085, 64, 1, true), gold, cg);
    for (const [y, r] of [[0.0425, 0.222], [-0.0425, 0.245]]) { const rim = M(new THREE.TorusGeometry(r, 0.006, 8, 64), gold, cg); rim.rotation.x = Math.PI / 2; rim.position.y = y; }
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; const k = M(new THREE.ConeGeometry(0.026, 0.09, 16), clay('#d6a640', { roughness: 0.38 }), cg); k.position.set(Math.cos(a) * 0.217, 0.087, Math.sin(a) * 0.217);
      const gem = M(new THREE.SphereGeometry(0.014, 12, 10), clay('#8a1c2a', { roughness: 0.25, bumpScale: 0 }), cg); gem.position.set(Math.cos(a) * 0.24, 0, Math.sin(a) * 0.24); } }
  HP = HP_BASE; FACE = { muzzle: 0, chin: 0, s: null }; return g;
}

/* Hair built like the references: many thick sculpted strands (tapered, flattened clay ropes) laid over a dark under-shell.
   'wavy': a side part, strands sweep down over the skull and hang to the shoulders in waves, open around the face (S06 modern woman).
   'swept': a side part, chunky strands swept across the top to the other side, tips lifting at the forehead (S12/S13 modern men). */
function lockGeo(pts, R0, flat, up, blunt = 0) { const cv = new THREE.CatmullRomCurve3(pts), N = 48, S = 10, pos = [], idx = [], P = new THREE.Vector3(), Tn = new THREE.Vector3(), Nr = new THREE.Vector3(), B = new THREE.Vector3();
  for (let i = 0; i <= N; i++) { const t = i / N; cv.getPointAt(t, P); cv.getTangentAt(t, Tn); Nr.set(P.x, up ? P.y - 0.2 : 0, P.z).normalize(); B.crossVectors(Tn, Nr).normalize(); Nr.crossVectors(B, Tn).normalize();
    const r = R0 * Math.pow(Math.min(1, t / 0.1), 0.6) * (blunt ? Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, (t - 0.93) / 0.07), 2))) : Math.pow(Math.max(0.0, 1 - Math.pow(t, 2.5)), 0.6)) + 0.0006;
    for (let j = 0; j <= S; j++) { const a = j / S * Math.PI * 2; const w = Math.cos(a) * r, h = Math.sin(a) * r * flat; pos.push(P.x + B.x * w + Nr.x * h, P.y + B.y * w + Nr.y * h, P.z + B.z * w + Nr.z * h); } }
  for (let i = 0; i < N; i++) for (let j = 0; j < S; j++) { const a = i * (S + 1) + j, b = a + S + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  { const p = g.attributes.position, n = g.attributes.normal; cv.getPointAt(0.5, P); const k = Math.floor(N / 2) * (S + 1); const dx = p.getX(k) - P.x, dy = p.getY(k) - P.y, dz = p.getZ(k) - P.z; if (dx * n.getX(k) + dy * n.getY(k) + dz * n.getZ(k) < 0) { for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } g.setIndex(idx); g.computeVertexNormals(); } } /* faces point outward */
  return smoothSeams(g); }
function hairLocks(style, g, hm, T, R) {
  let sd = 11; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const rad = y => y >= 0.3 ? hr(Math.min(y, 0.628)) + (style === 'wavy' ? 0.012 * (0.62 - y) : 0) : hr(0.3) + (style === 'wavy' ? 0.004 + 0.14 * (0.3 - y) : 0.05 * (0.3 - y)); /* wavy: volume, the bob flares out toward the ends */ /* below the cheeks the hair hangs straight down, flaring a little */
  const at = (th, y, off) => { const r = rad(y) + off; return V(r * Math.sin(th), y, r * Math.cos(th) * SZ); };
  const geos = [], wrap = (a, b) => b - a > Math.PI ? a + 2 * Math.PI : a - b > Math.PI ? a - 2 * Math.PI : a; /* start angle on the near side of the end angle: strands never go the long way round, across the face */
  if (style === 'wavy') {
    const xp = 0.05; /* part: a little to her left */
    for (const side of [-1, 1]) { const n = side > 0 ? 19 : 22;
      for (let i = 0; i < n; i++) { const u = (i + 0.5 * rnd()) / n, th1 = side * (0.95 + (Math.PI - 0.95) * Math.pow(u, 0.9)), wph = u * 1.2 + rnd() * 0.5, R0 = 0.034 + 0.006 * rnd();
        /* start on the part line: from the front hairline over the top to the crown */
        const ps = Math.PI * 0.2 + u * Math.PI * 0.55, sy = 0.33 + 0.3 * Math.sin(ps), sz = Math.cos(ps) * 0.3; const th0 = wrap(Math.atan2(xp - side * 0.012, sz), th1); /* both sides start a little past the part: they overlap, no skin shows */
        const pts = []; const yEnd = -0.06 - 0.05 * rnd() + 0.06 * Math.max(0, 1 - Math.abs(th1) / 1.2);
        for (let k = 0; k <= 24; k++) { const t = k / 24, ease = 1 - Math.pow(1 - Math.min(1, t / 0.45), 2), th = th0 + (th1 - th0) * ease, y = t < 0.45 ? sy + (0.4 - sy) * Math.pow(t / 0.45, 1.8) : 0.4 + (yEnd - 0.4) * ((t - 0.45) / 0.55);
          const yF = Math.max(y, 0.535 + (-1.5) * sm01((Math.abs(th) - 0.75) / 0.35)); /* over the forehead the strands stay above y 0.5 (no helmet across the brows); they only fall once they reach the temples */
          const wave = t > 0.3 ? 0.024 * Math.sin(yF * 26 + wph) * Math.min(1, (t - 0.3) / 0.2) : 0; pts.push(at(th + wave * 1.6, yF, T + (1 - u) * 0.016 + R0 * (0.62 * sm01(t / 0.12) - 0.55 * (1 - sm01(t / 0.12))) /* shingled: each strand lies a little above the one behind it, so neighbours never cut through each other */ /* the strand's root dives under the shell: no tabs at the part */ + (t > 0.45 ? 0.006 + 0.01 * (t - 0.45) : 0))); }
        geos.push(lockGeo(pts, R0 * 1.12, 0.7, true, 1)); } }
  } else { /* swept */
    const xp = -0.11;
    for (let i = 0; i < 26; i++) { const u = (i + 0.5 * rnd()) / 26, R0 = 0.036 + 0.008 * rnd();
      const ps = Math.PI * 0.28 + u * Math.PI * 0.5, sy = 0.33 + 0.29 * Math.sin(ps), sz = Math.cos(ps) * 0.3, th0r = Math.atan2(xp - 0.015, sz);
      /* the long side: across the top to the right, front strands ending in tips over the forehead, back ones down to the nape */
      const th1 = 0.15 + u * 2.6 + 0.08 * rnd(), th0 = wrap(th0r, th1), y1 = u < 0.25 ? 0.535 + 0.015 * rnd() : th1 < 1.35 ? 0.52 : 0.45 - 0.22 * (u - 0.25) / 0.75, pts = []; /* nothing in front of the ears comes below the brows */
      for (let k = 0; k <= 16; k++) { const t = k / 16, th = th0 + (th1 - th0) * t, y = sy + (y1 - sy) * Math.pow(t, 1.4); pts.push(at(th, y, T + (1 - u) * 0.014 + R0 * (0.6 * sm01(t / 0.12) - 0.4 * (1 - sm01(t / 0.12))) + (u < 0.25 ? 0.03 * t * t : 0.006 * t))); } /* shingled, roots tucked under */
      geos.push(lockGeo(pts, R0, 0.62, true)); }
    for (let i = 0; i < 11; i++) { const u = (i + 0.5 * rnd()) / 11, R0 = 0.034 + 0.006 * rnd(); /* the short side: down to above the left ear */
      const ps = Math.PI * 0.3 + u * Math.PI * 0.48, sy = 0.33 + 0.29 * Math.sin(ps), sz = Math.cos(ps) * 0.3, th1 = -0.55 - u * 2.3, th0 = wrap(Math.atan2(xp + 0.015, sz), th1), y1 = th1 > -1.35 ? 0.5 : 0.42 - 0.18 * u, pts = [];
      for (let k = 0; k <= 12; k++) { const t = k / 12; pts.push(at(th0 + (th1 - th0) * t, sy + (y1 - sy) * Math.pow(t, 1.3), T + (1 - u) * 0.01 + R0 * (0.6 * sm01(t / 0.12) - 0.4 * (1 - sm01(t / 0.12))) + 0.004 * t)); }
      geos.push(lockGeo(pts, R0, 0.62, true)); }
  }
  const lm = M(mergeGeometries(geos), hm, g); lm.userData.locks = true; R.hairLocks = lm; }

function buildHand(skin, s) {
  const g = new THREE.Group(), sk = clay(skin), H = { g, fingers: [] };
  const palm = M(new THREE.SphereGeometry(0.052, 28, 20), sk, g); palm.scale.set(0.6, 1, 0.95);
  [0.03, 0.01, -0.01, -0.03].forEach((z, i) => { const f = new THREE.Group(); f.position.set(0, -0.04, z); g.add(f);
    const a = M(new THREE.CapsuleGeometry(0.0145, 0.024, 8, 12), sk, f); a.position.y = -0.018;
    const k = new THREE.Group(); k.position.y = -0.036; f.add(k); const b = M(new THREE.CapsuleGeometry(0.0138, 0.02 - Math.abs(i - 1.2) * 0.004, 8, 12), sk, k); b.position.y = -0.014;
    H.fingers.push({ f, k }); });
  H.thumb = new THREE.Group(); H.thumb.position.set(-0.015 * s, -0.005, 0.042); g.add(H.thumb); M(new THREE.CapsuleGeometry(0.016, 0.035, 8, 12), sk, H.thumb).position.y = -0.025;
  H.set = (curl = 0.35, point = false) => { H.fingers.forEach(({ f, k }, i) => { const c = point && i === 0 ? 0.05 : (point ? 1 : curl); f.rotation.z = -s * c * 1.2; k.rotation.z = -s * c * 1.3; });
    const tc = point ? 0.9 : curl; H.thumb.rotation.set(0.5 + 0.5 * tc, 0, -s * (0.5 + 0.6 * tc)); };
  H.set(); return H;
}

export function buildCharacter({ skin = '#c8784e', tunic, trim, mantle, sash, seated = false, outfit = 'robe', pants = '#2f3a52', shoes = '#ece6da', earrings = null, legLen = 0, chest = 0, hips = 0, ...h }) {
  const root = new THREE.Group(), R = { root, earrings };
  R.body = new THREE.Group(); root.add(R.body); // pivot at the feet: lean, sway, bob
  const modern = outfit === 'modern';
  const tm = modern ? knit(tunic, [1, 1.3]) : clay(tunic);
  const T = modern ? [[0, 0.6], [0.2, 0.6], [0.212, 0.63]].concat(smoothProfile([[0.214, 0.66], [0.208 + hips, 0.7], [0.2 + chest * 0.3 + hips * 0.2, 0.84], [0.214 + chest * 0.6, 0.98], [0.222 + chest, 1.08], [0.208 + chest * 0.8, 1.17], [0.16, 1.245], [0.1, 1.295]]), [[0.08, 1.31], [0, 1.31]]) /* modern: a soft waist and sloping shoulders (no box) */ /* shirt/sweater over the hips */
                   : [[0, 0.04], [0.3, 0.04], [0.31, 0.1], [0.28, 0.35], [0.235, 0.6], [0.222, 0.72], [0.232, 0.86], [0.238, 1.02], [0.238, 1.14], [0.22, 1.23], [0.13, 1.29], [0.08, 1.31], [0, 1.31]]; /* cinched at the belt so arms can hang */
  if (modern) { /* modern clothes: sweater or shirt, jeans as two legs that swing from the hip, shoes */
    R.robe = M(lathe(T, 96), knit(tunic, [2.2, 1.6]), R.body); R.robe.scale.z = 0.8; /* an oval chest, flatter front to back than a tube */
    { const rib = M(new THREE.TorusGeometry(0.212, 0.022, 14, 72), clay(new THREE.Color(tunic).multiplyScalar(0.9).getStyle()), R.body); rib.rotation.x = Math.PI / 2; rib.position.y = 0.625; rib.scale.set(1, 0.8, 0.8); /* torus: scale y is the depth after the rotation */ } /* ribbed sweater hem */
    const pm = clay(pants, { roughness: 0.7 }); { const hp = M(lathe([[0, 0.5], [0.19, 0.5], [0.198, 0.58], [0.2, 0.64], [0, 0.64]], 48), pm, R.body); hp.scale.z = 0.8; } /* hips oval like the sweater */
    R.legs = [-1, 1].map(sd => { const L = new THREE.Group(); L.position.set(0.095 * sd, 0.56, 0); R.body.add(L); sausage(V(0, 0, 0), V(0, -0.47, 0.0), 0.088, pm, L);
      const ft = M(new THREE.SphereGeometry(0.075, 32, 20), clay(shoes, { roughness: 0.45 }), L); ft.scale.set(1.0, 0.62, 1.75); ft.position.set(0, -0.52, 0.075);
        return L; });
    R.feet = R.legs.map(L => L.children[1]);
  } else if (!seated) {
    R.robe = M(folds(lathe(T, 72), 0.012, 9, 0.05, 0.7), tm, R.body);
    R.feet = [-1, 1].map(s => { const ft = M(new THREE.SphereGeometry(0.075, 24, 16), clay('#6a4426'), root); ft.scale.set(0.85, 0.5, 1.5); ft.position.set(0.1 * s, 0.035, 0.22); return ft; });
  } else {
    /* seated: the robe's upper body sits on the seat at y = 0.55; the skirt drapes over the thighs and down the shins.
       Place the root so y = 0.55 is the seat top; the feet land 0.5 below it. */
    R.robe = M(folds(lathe([[0, 0.5], [0.27, 0.5], [0.275, 0.56], [0.235, 0.62], ...T.filter(([, y]) => y > 0.62)], 72), 0.008, 9, 0.5, 0.75), tm, R.body);
    for (const sd of [-1, 1]) {
      const th = M(new THREE.CapsuleGeometry(0.12, 0.34, 10, 24), tm, R.body); th.rotation.x = Math.PI / 2; th.position.set(0.12 * sd, 0.6, 0.2);
      const sh = M(lathe([[0, 0], [0.13, 0], [0.12, 0.25], [0.105, 0.48], [0, 0.5]], 40, 0, Math.PI * 2), tm, R.body); sh.position.set(0.12 * sd, 0.05, 0.39);
    }
    { const kb = M(new THREE.CapsuleGeometry(0.115, 0.24, 10, 24), tm, R.body); kb.rotation.z = Math.PI / 2; kb.position.set(0, 0.6, 0.33); } /* cloth bridging the knees: no dark gap between the thighs */
    /* the robe falls from the knees to the ankles as one skirt in front of both shins (no trouser legs) */
    const skirt = M(folds(lathe([[0.3, 0.0], [0.285, 0.2], [0.26, 0.45], [0.24, 0.6], [0.2, 0.66], [0.1, 0.685], [0, 0.69]], 64), 0.014, 9, 0, 0.6), clay(tunic, { side: THREE.DoubleSide }), R.body); skirt.scale.set(1, 1, 0.75); skirt.position.set(0, 0.03, 0.42); /* hangs in front of the calves; its back stays clear of the seat front */
    const lapDrape = M(folds(lathe([[0, 0.0], [0.29, 0.0], [0.28, 0.1], [0.25, 0.14], [0, 0.15]], 56), 0.01, 8, 0, 0.15), tm, R.body); lapDrape.scale.set(1, 1, 1.3); lapDrape.position.set(0, 0.56, 0.12); /* stays behind the skirt top: poking through made a dark notch */
    R.feet = [-1, 1].map(sd => { const ft = M(new THREE.SphereGeometry(0.075, 24, 16), clay('#8a5a34'), root); ft.scale.set(0.85, 0.5, 1.5); ft.position.set(0.12 * sd, 0.058, 0.58); /* toes show past the hem, resting on the floor */ return ft; });
  }
  const neck = M(new THREE.CylinderGeometry(0.1, 0.12, 0.1, 28), clay(skin), R.body); neck.position.y = 1.33;
  const col = M(new THREE.TorusGeometry(0.12, 0.024, 14, 40), clay(trim), R.body); col.rotation.x = Math.PI / 2 + 0.25; col.position.set(0, 1.3, 0.015);
  if (!modern) { const belt = M(new THREE.TorusGeometry(0.232, 0.028, 14, 56), clay(sash), R.body); belt.rotation.x = Math.PI / 2; belt.position.y = 0.72;
  const knot = M(new THREE.SphereGeometry(0.038, 16, 12), clay(sash), R.body); knot.position.set(0.07, 0.71, 0.222);
  for (const s of [-1, 1]) { const tail = M(new THREE.CapsuleGeometry(0.02, 0.17, 8, 12), clay(sash), R.body); tail.position.set(0.08 + s * 0.016, 0.59, 0.228); tail.rotation.z = 0.08 * s; } }
  if (mantle) { const mp = seated ? [[0.3, 0.58], [0.275, 0.7], [0.265, 0.95], [0.255, 1.14], [0.225, 1.24], [0.14, 1.3]] : [[0.31, 0.35], [0.28, 0.65], [0.265, 0.95], [0.255, 1.14], [0.225, 1.24], [0.14, 1.3]]; /* seated: the cloak ends on the seat, not through it */
    const m = M(folds(lathe(mp, 64, Math.PI * 0.6, Math.PI * 0.8), 0.01, 7, 0.35, 1.0), clay(mantle, { side: THREE.DoubleSide }), R.body); m.scale.set(1.08, 1, 1.1); } // a cloak hanging behind the arms
  R.arms = [-1, 1].map(s => {
    const sh = new THREE.Group(); sh.position.set(0.3 * s, 1.17, 0); R.body.add(sh); /* shoulder at the edge of the chest: arms hang against the body */
    M(new THREE.SphereGeometry(0.08, 24, 18), tm, sh); sausage(V(0, 0, 0), V(0, -0.24, 0.0), 0.07, tm, sh);
    const el = new THREE.Group(); el.position.y = -0.24; sh.add(el);
    M(lathe([[0.055, 0.0], [0.072, -0.1], [0.08, -0.185], [0.077, -0.205], [0.064, -0.214], [0.049, -0.212], [0.047, -0.19]], 40), clay(tunic, { side: THREE.DoubleSide }), el); /* closed rolled cuff hugging the wrist: no open hole */
    sausage(V(0, 0, 0), V(0, -0.22, 0), 0.046, clay(skin), el);
    const wr = new THREE.Group(); wr.position.y = -0.27; el.add(wr);
    const hand = buildHand(skin, s); hand.g.scale.setScalar(1.35); wr.add(hand.g);
    return { sh, el, wr, hand, s };
  });
  R.head = buildHead({ skin, ...h }, R); R.head.position.y = 1.35; R.body.add(R.head); if (h.headScale) R.head.scale.set(...h.headScale); /* e.g. [0.88, 1.05, 0.95]: a taller, narrower egg */
  R.lidRest = h.lidTop || 0.36;
  if (legLen) { /* adapted build: longer legs lift the whole upper body (a more natural 4-head figure in 3D) */
    for (const c of R.body.children) if (!R.legs || !R.legs.includes(c)) c.position.y += legLen;
    if (R.legs) R.legs.forEach(L => { L.position.y += legLen; L.scale.y = (0.56 + legLen) / 0.56; const ft = L.children[1]; ft.scale.y /= L.scale.y; ft.position.y = -(0.52 + legLen) / L.scale.y; });
  }
  if (chest) R.arms.forEach(a => { a.sh.position.x += chest * 0.4 * a.s; });
  if (modern) { R.arms.forEach(a => { a.sh.children[0].scale.setScalar(0.72); a.sh.children[1].scale.set(0.8, 1, 0.8); a.sh.position.x -= 0.065 * a.s; a.sh.position.y -= 0.05; a.sh.children[1].geometry = lathe([[0, -0.245], [0.057, -0.24], [0.058, -0.12], [0.058, 0.0], [0.04, 0.026], [0, 0.03]], 40) /* points bottom-up: normals face out */; a.sh.children[1].position.set(0, 0, 0); a.sh.children[1].quaternion.identity(); a.sh.children[1].scale.set(1, 1, 1); /* lathe sleeve: even knit, no stretched capsule UVs */ a.el.children[0].geometry = lathe([[0.056, 0.0], [0.055, -0.08], [0.051, -0.16], [0.052, -0.19], [0.05, -0.205], [0.043, -0.214], [0.038, -0.2]], 40); /* a straight sleeve the same width as the upper arm, with a soft rolled cuff */ const j = M(new THREE.SphereGeometry(0.056, 24, 16), tm, a.el); j.userData.elbow = true; }); /* one continuous sleeve: matching radii and a rounded elbow, no stacked posts */ /* the arm grows out of the sloping shoulder, half inside the sweater */
    R.head.position.y -= 0.035; } /* slimmer sleeves, shoulders tucked in: not a bodybuilder */ /* smaller shoulder balls tucked into the sweater: no puffed epaulettes */

  // ---------- posing API (all angles in radians) ----------
  R.setBody = ({ lean = 0, sway = 0, twist = 0, bob = 0, breathe = 0 } = {}) => { R.body.rotation.set(lean, twist, sway); R.body.position.y = bob; R.robe.scale.set(1 + breathe * 0.008, 1, 1 + breathe * 0.012); }; /* breathing moves the chest only: hands resting on things stay planted */
  R.setHead = ({ nod = 0, turn = 0, tilt = 0 } = {}) => R.head.rotation.set(nod, turn, tilt);
  // lid: + closes (1 = shut), - widens; squint raises the lower lid; brows: raise (up/down), angry (inner down), sad (inner up)
  R.setFace = ({ lid = 0, blink = 0, look = [0, 0], squint = 0, raise = 0, angry = 0, sad = 0, open = 0, browL = 0, soft = 0, smile = 0 } = {}) => {
    const close = Math.max(lid >= 0 ? lid * 0.75 : lid * 0.6, blink * 1.35); // expression lids stay readable; only a blink fully shuts
    R.eyes.forEach(({ aim, top, bot, s, tilt = 0 }) => {
      aim.rotation.set(-look[1] * 0.4, look[0] * 0.45, 0);
      top.rotation.set(0.1 + tilt + close + angry * 0.1 + sad * 0.12, 0, 0.12 * s * (1 - Math.min(1, soft)) + sad * 0.15 * s); /* soft also levels the lids: their inward tilt is what reads stern */
      bot.rotation.set(Math.PI - 0.1 - squint * 0.35 - blink * 0.2, 0, -0.12 * s);
    });
    R.brows.forEach(({ g, s, y0 }, i) => { const extra = i === 0 ? browL : 0; g.position.y = y0 + 0.03 * (raise + extra) - 0.018 * angry + 0.008 * sad; g.rotation.z = s * (-0.35 * angry + 0.35 * sad + 0.3 * soft); }); /* soft: relaxed brows (the resting brow reads stern) */
    R.jaw.rotation.x = 0.16 * open; R.mouth.scale.set(1, 0.15 + 0.85 * open, 0.5); R.lip.position.y = (R.mY ?? 0.062) - 0.03 - 0.03 * open; R.lip.rotation.z = smile > 0 ? Math.PI * 1.19 : Math.PI * 0.19; R.lip.position.y += smile > 0 ? 0.06 : 0; R.mouth.visible = !(smile > 0 && open < 0.05); /* smile: the curve IS the closed mouth (ends at the slit's corners), not a second line under it */
  };
  // arm: fwd raises forward, out raises sideways, twist rolls, bend folds the elbow; curl 0 open → 1 fist; point
  R.setArm = (side, { fwd = 0.1, out = 0.13, twist = 0, bend = 0.35, wrist = 0, curl = 0.35, point = false } = {}) => {
    const a = R.arms[side === 'L' ? 0 : 1]; a.sh.rotation.set(-fwd, twist * a.s, out * a.s); a.el.rotation.set(-bend, 0, 0); a.wr.rotation.set(-wrist, 0, 0); a.hand.set(curl, point);
  };
  // walk cycle: phase 0..1 per step pair; feet slide forward/back under the robe, robe swings
  R.walk = (phase, amt = 1) => {
    const w = phase * Math.PI * 2;
    if (R.legs) R.legs.forEach((L, i) => { const p = w + i * Math.PI; L.rotation.x = -Math.sin(p) * 0.32 * amt; L.position.y = 0.56 + Math.max(0, Math.cos(p)) * 0.02 * amt; });
    else R.feet.forEach((f, i) => { const p = w + i * Math.PI; f.position.z = 0.22 + Math.sin(p) * 0.13 * amt; f.position.y = 0.035 + Math.max(0, Math.cos(p)) * 0.035 * amt; });
    if (!R.legs) R.robe.rotation.set(Math.sin(w * 2) * 0.03 * amt, 0, Math.sin(w) * 0.04 * amt);
    return { bob: Math.abs(Math.sin(w)) * 0.025 * amt, sway: Math.sin(w) * 0.035 * amt, swing: Math.sin(w) * 0.35 * amt };
  };
  // ---------- collision: nothing passes through the body ----------
  // The robe is a lathe, so its surface is known exactly at every height: radius(y). The mantle adds ~10% at the sides/back.
  const bodyR = (y) => { if (y <= T[1][1]) return T[1][0]; for (let i = 2; i < T.length; i++) if (y <= T[i][1]) { const [r0, y0] = T[i - 1], [r1, y1] = T[i]; return r0 + (r1 - r0) * (y - y0) / (y1 - y0); } return 0.12; };
  const surfaceR = (x, y, z) => { let r = bodyR(y) + 0.015; if (y > 1.24 && y < 1.36) r = Math.max(r, 0.15); return r; };
  const inv = new THREE.Matrix4(), P = new THREE.Vector3();
  const armSamples = [[0, -0.17, 0.062], [0, -0.24, 0.06]] /* the top of the arm attaches inside the sleeve: not a collision */, foreSamples = [[0, -0.06, 0.05], [0, -0.14, 0.048], [0, -0.22, 0.046]], handSample = [0, -0.32, 0.05]; /* sized to the real forearm and hand */
  const armPen = (a) => { // deepest point of this arm inside the body (metres)
    let worst = 0; a.front = false; const test = (obj, [x, y, z], rad) => { P.set(x, y, z).applyMatrix4(obj.matrixWorld).applyMatrix4(inv); if (P.y < 0.05 || P.y > 1.36) return;
      const d = surfaceR(P.x, P.y, P.z) + rad - Math.hypot(P.x, P.z); if (d > worst) { worst = d; a.front = Math.abs(Math.atan2(P.x, P.z)) < Math.PI * 0.3; } };
    armSamples.forEach(sm => test(a.sh, sm, sm[2])); foreSamples.forEach(sm => test(a.el, sm, sm[2])); test(a.el, handSample, handSample[2]); return worst; };
    R.solve = ({ on = true } = {}) => {
    R.root.updateMatrixWorld(true); inv.copy(R.body.matrixWorld).invert();
    let report = 0;
    for (const a of R.arms) { // push the arm outward until it clears the body (at most ~0.6 rad)
      let pen = armPen(a), k = 0;
      while (on && pen > 0.008 && k < 15) /* light contact allowed: hands can rest on the robe */ { if (a.front) a.sh.rotation.x -= 0.04; else a.sh.rotation.z += 0.04 * a.s; /* hands in front come forward; arms at the side move out */ a.sh.updateMatrixWorld(true); pen = armPen(a); k++; }
      report = Math.max(report, pen);
    }
    (R.beardMeshes || []).forEach((m) => { /* drape the SHAPE onto the chest, then cut the strands back in so the texture is the same everywhere */
      const pos = m.geometry.attributes.position, { base, gx, gz, nb } = R.beardStrands, Nn = new THREE.Vector3();
      const toBody = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld), back = new THREE.Matrix4().copy(toBody).invert();
      for (let i = 0; i < pos.count; i++) {
        P.set(base[i * 3], base[i * 3 + 1], base[i * 3 + 2]);
        if (on) { P.applyMatrix4(toBody);
          if (P.y < 1.36 && P.z > -0.08) { const Rb = surfaceR(P.x, P.y, P.z) + 0.012; if (Math.abs(P.x) < Rb) { const zs = Math.sqrt(Rb * Rb - P.x * P.x); if (P.z < zs) { Nn.set(nb[i * 3], nb[i * 3 + 1], nb[i * 3 + 2]).transformDirection(toBody); P.z = zs + (Nn.z > 0 ? 0.012 : 0); } } } /* front surface stays ahead of the back surface: no flicker */
          P.applyMatrix4(back); }
        pos.setXYZ(i, P.x + gx[i], P.y, P.z + gz[i]);
      }
      pos.needsUpdate = true; m.geometry.computeVertexNormals(); smoothSeams(m.geometry);
    });
    return report; // remaining arm penetration in metres (the clip checker)
  };
  R.setFace(); R.setArm('L'); R.setArm('R');
  return R;
}
