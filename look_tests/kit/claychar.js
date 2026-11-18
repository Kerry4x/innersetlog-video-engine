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
export const clay = (c, o = {}) => { const k = c + JSON.stringify(o); return cache[k] || (cache[k] = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.58, bumpMap: print, bumpScale: 0.8, sheen: 0.06, ...o })); };
export const M = (geo, mat, parent) => { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; if (parent) parent.add(m); return m; };
/* average normals of vertices that share a position (lathe seams, capsule poles): no hard line where a surface wraps around */
export function smoothSeams(geo) { const p = geo.attributes.position, n = geo.attributes.normal; if (!n) return geo; const m = new Map(); for (let i = 0; i < p.count; i++) { const k = `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`; (m.get(k) || m.set(k, []).get(k)).push(i); }
  const v = new THREE.Vector3(); for (const ids of m.values()) { if (ids.length < 2) continue; v.set(0, 0, 0); for (const i of ids) v.x += n.getX(i), v.y += n.getY(i), v.z += n.getZ(i); v.normalize(); for (const i of ids) n.setXYZ(i, v.x, v.y, v.z); } n.needsUpdate = true; return geo; }
export const lathe = (pts, seg = 64, p0 = 0, pl = Math.PI * 2) => { const full = pl >= Math.PI * 2 - 1e-6; const g = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg, full ? Math.PI : p0, pl); /* full turns start at the back: the texture seam never faces the camera */ return pl >= Math.PI * 2 - 1e-6 ? smoothSeams(g) : g; };
function folds(geo, amp, n, y0, y1) { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(x, z); if (r < 1e-5) continue; const t = Math.max(0, Math.min(1, (y1 - y) / (y1 - y0))); const k = amp * t * Math.sin(Math.atan2(x, z) * n + Math.sin(y * 7) * 0.6); p.setX(i, x * (r + k) / r); p.setZ(i, z * (r + k) / r); } geo.computeVertexNormals(); return smoothSeams(geo); }
function grooves(geo, amp, n) { const p = geo.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const L = v.length(); if (L < 1e-5) continue; v.multiplyScalar((L + amp * Math.sin(Math.atan2(v.x, v.z) * n + v.y * 6)) / L); p.setXYZ(i, v.x, v.y, v.z); } geo.computeVertexNormals(); return smoothSeams(geo); }
function sausage(a, b, r, mat, parent) { const d = b.clone().sub(a), m = M(new THREE.CapsuleGeometry(r, d.length(), 10, 20), mat, parent); m.position.copy(a).lerp(b, 0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); return m; }

const HP = [[0, 0], [0.11, 0.008], [0.19, 0.05], [0.228, 0.13], [0.238, 0.24], [0.232, 0.36], [0.218, 0.45], [0.2, 0.51], [0.168, 0.565], [0.12, 0.605], [0.062, 0.624], [0, 0.629]];
const hr = y => { for (let i = 1; i < HP.length; i++) if (y <= HP[i][1]) { const [r0, y0] = HP[i - 1], [r1, y1] = HP[i]; return r0 + (r1 - r0) * (y - y0) / (y1 - y0); } return 0; };
const SZ = 0.94, surf = (x, y) => Math.sqrt(Math.max(0.0001, hr(y) ** 2 - x * x)) * SZ;

function buildHead({ skin, hair, browC, bald, beard, beardLen = 0.1, crown, lidTop = 0.36 }, R) {
  const g = new THREE.Group(), sk = clay(skin), hm = clay(hair), ink = clay('#120b08', { roughness: 0.25, bumpScale: 0 }), white = clay('#f4efe2', { roughness: 0.32, bumpScale: 0.15 });
  const skull = M(lathe(HP, 72), sk, g); skull.scale.z = SZ;
  const eY = 0.33, eX = 0.09, eR = 0.076;
  R.eyes = []; R.brows = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(eX * s, eY, surf(eX, eY) - eR * 0.12); g.add(e);
    M(new THREE.SphereGeometry(eR, 40, 30), white, e);
    const aim = new THREE.Group(); e.add(aim); const p = M(new THREE.SphereGeometry(eR * 0.27, 20, 16), ink, aim); p.scale.z = 0.45; p.position.z = eR * 0.98;
    const lid = (cover, tube, flip) => { const LR = eR * 1.06, lg = new THREE.Group();
      M(new THREE.SphereGeometry(LR, 40, 18, 0, Math.PI * 2, 0, Math.PI * cover), sk, lg);
      const rim = M(new THREE.TorusGeometry(LR * Math.sin(Math.PI * cover), tube, 16, 56), sk, lg); rim.rotation.x = Math.PI / 2; rim.position.y = LR * Math.cos(Math.PI * cover);
      e.add(lg); return lg; };
    const top = lid(lidTop, eR * 0.25, false), bot = lid(0.15, eR * 0.21, true);
    R.eyes.push({ aim, top, bot, s });
    const bg = new THREE.Group(); bg.position.set(eX * s + 0.004 * s, eY + 0.06, surf(eX, eY + 0.09) + 0.002); g.add(bg);
    const bw = M(new THREE.TorusGeometry(0.062, 0.019, 14, 40, Math.PI * 0.62), clay(browC), bg); bw.rotation.set(-0.25, 0, Math.PI * 0.19 + (s > 0 ? -0.08 : 0.08)); bw.scale.set(1, 1, 1.3);
    R.brows.push({ g: bg, s, y0: bg.position.y });
    const ear = new THREE.Group(); ear.position.set(hr(0.25) * 0.97 * s, 0.25, -0.01); ear.rotation.y = 0.25 * s; g.add(ear);
    const lobe = M(new THREE.SphereGeometry(0.06, 24, 18), sk, ear); lobe.scale.set(0.35, 1, 0.75);
    const rim = M(new THREE.TorusGeometry(0.052, 0.017, 12, 32, Math.PI * 1.55), sk, ear); rim.rotation.set(0, Math.PI / 2, Math.PI * 0.72); rim.position.x = 0.012 * s;
  }
  const n0 = V(0, eY + 0.03, surf(0, eY + 0.03) - 0.015), n1 = V(0, 0.185, surf(0, 0.185) + 0.1);
  sausage(n0, n1, 0.05, sk, g);
  const tip = M(new THREE.SphereGeometry(0.07, 32, 24), sk, g); tip.position.copy(n1); tip.scale.set(1, 0.92, 1);
  for (const s of [-1, 1]) { const w = M(new THREE.SphereGeometry(0.03, 16, 12), sk, g); w.position.set(0.04 * s, n1.y - 0.015, n1.z - 0.035); }
  if (lidTop > 0.33) for (const y of [0.47, 0.505]) { const c = M(new THREE.TorusGeometry(hr(y) * 0.98, 0.006, 8, 48, Math.PI * 0.32), sk, g); c.rotation.set(Math.PI / 2, 0, Math.PI * 0.34); c.position.y = y; c.scale.y = SZ; }
  // mouth: a dark opening behind the lips; the jaw (with the beard) swings down to show it
  const mY = 0.062;
  R.mouth = M(new THREE.SphereGeometry(0.05, 24, 16), clay('#2a0d08', { bumpScale: 0 }), g); R.mouth.scale.set(1, 0.15, 0.5); R.mouth.position.set(0, mY, surf(0, mY) - 0.02);
  const lip = M(new THREE.TorusGeometry(0.042, 0.0075, 10, 32, Math.PI * 0.62), clay('#4a1e14', { bumpScale: 0 }), g); lip.rotation.z = Math.PI * 0.19; lip.position.set(0, mY - 0.03, surf(0, mY) - 0.004); R.lip = lip;
  R.jaw = new THREE.Group(); R.jaw.position.set(0, 0.2, 0); g.add(R.jaw); // pivot near the ears
  if (bald) {
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const t = M(grooves(new THREE.SphereGeometry(0.06, 28, 20), 0.004, 10), hm, g); t.scale.set(0.55, 0.75, 1.3); const y = 0.43 - i * 0.045; t.position.set(hr(y) * 0.98 * s, y, -0.04 - i * 0.03); t.rotation.set(0.2, 0.5 * s, 0.25 * s); }
    const back = M(new THREE.TorusGeometry(0.215, 0.05, 16, 48, Math.PI * 0.9), hm, g); back.rotation.set(Math.PI / 2, 0, Math.PI * 1.05); back.position.y = 0.37; back.scale.z = 1.5;
  } else {
    const cap = M(grooves(new THREE.SphereGeometry(0.245, 56, 32, Math.PI / 2 + 0.9, Math.PI * 2 - 1.8, 0, Math.PI * 0.58), 0.006, 28), clay(hair, { side: THREE.DoubleSide }), g); cap.position.y = 0.39; cap.scale.set(1.0, 1.0, SZ * 1.02);
    for (const s of [-1, 1]) { const sb = M(new THREE.CapsuleGeometry(0.03, 0.09, 8, 16), hm, g); sb.position.set(hr(0.3) * 0.95 * s, 0.31, 0.05); }
  }
  if (beard) {
    const t = 0.03, pts = []; for (let y = 0.0; y <= 0.04; y += 0.01) pts.push([hr(y) + t, y]); pts.unshift([hr(0) * 0.6 + t, -0.02]);
    /* one sculpted piece: the jaw band and the mass under the chin are merged, then ONE strand pattern is cut into both */
    const bandG = lathe(pts, 144, Math.PI * 0.5 - 1.75, 3.5); bandG.applyMatrix4(new THREE.Matrix4().compose(V(0, -0.2, 0), new THREE.Quaternion(), V(1, 1, SZ * 1.04)));
    const massG = new THREE.SphereGeometry(0.15, 96, 64); massG.applyMatrix4(new THREE.Matrix4().compose(V(0, 0.03 - beardLen * 0.9 - 0.2, surf(0, 0.05) - 0.08), new THREE.Quaternion(), V(1.25, 0.8 + beardLen * 5, 0.85)));
    const bg = mergeGeometries([bandG, massG]); bg.computeVertexNormals(); const nb = bg.attributes.normal.array.slice(); /* smooth, indexed */
    /* strands are stored separately from the shape, so draping can move the shape and the strands are cut back in afterwards */
    const base = bg.attributes.position.array.slice(), n = base.length / 3, gx = new Float32Array(n), gz = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2], r = Math.hypot(x, z); if (r < 1e-4) continue;
      const k = 0.006 * Math.sin(Math.atan2(x, z) * 26 + y * 9 + Math.sin(y * 23) * 0.8); gx[i] = x / r * k; gz[i] = z / r * k; }
    const beardM = M(bg, clay(beard, { side: THREE.DoubleSide, bumpScale: 0.25 }), R.jaw); R.beardMeshes = [beardM]; R.beardStrands = { base, gx, gz, nb };
    { const p = bg.attributes.position; for (let i = 0; i < n; i++) p.setXYZ(i, base[i * 3] + gx[i], base[i * 3 + 1], base[i * 3 + 2] + gz[i]); bg.computeVertexNormals(); smoothSeams(bg); }
    for (const s of [-1, 1]) { sausage(V(hr(0.3) * 0.95 * s, 0.29, 0.0), V(hr(0.07) * 0.98 * s, 0.05, 0.06), 0.032, clay(beard), g);
      sausage(V(0.015 * s, n1.y - 0.07, n1.z - 0.06), V(0.1 * s, mY + 0.03, surf(0.1, mY + 0.03) + 0.004), 0.026, clay(beard), g); }
  }
  if (crown) { /* the band sits ON the hair: tapered to the skull at y 0.46-0.54, squashed front-to-back like the head (no floating gap) */
    const cg = new THREE.Group(); cg.position.y = 0.515; cg.scale.z = SZ * 1.03; g.add(cg); const gold = clay('#d6a640', { roughness: 0.38, side: THREE.DoubleSide });
    M(new THREE.CylinderGeometry(0.222, 0.245, 0.085, 64, 1, true), gold, cg);
    for (const [y, r] of [[0.0425, 0.222], [-0.0425, 0.245]]) { const rim = M(new THREE.TorusGeometry(r, 0.006, 8, 64), gold, cg); rim.rotation.x = Math.PI / 2; rim.position.y = y; }
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; const k = M(new THREE.ConeGeometry(0.026, 0.09, 16), clay('#d6a640', { roughness: 0.38 }), cg); k.position.set(Math.cos(a) * 0.217, 0.087, Math.sin(a) * 0.217);
      const gem = M(new THREE.SphereGeometry(0.014, 12, 10), clay('#8a1c2a', { roughness: 0.25, bumpScale: 0 }), cg); gem.position.set(Math.cos(a) * 0.24, 0, Math.sin(a) * 0.24); } }
  return g;
}

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

export function buildCharacter({ skin = '#c8784e', tunic, trim, mantle, sash, seated = false, ...h }) {
  const root = new THREE.Group(), R = { root };
  R.body = new THREE.Group(); root.add(R.body); // pivot at the feet: lean, sway, bob
  const tm = clay(tunic);
  const T = [[0, 0.04], [0.3, 0.04], [0.31, 0.1], [0.28, 0.35], [0.235, 0.6], [0.222, 0.72], [0.232, 0.86], [0.238, 1.02], [0.238, 1.14], [0.22, 1.23], [0.13, 1.29], [0.08, 1.31], [0, 1.31]]; /* cinched at the belt so arms can hang */
  if (!seated) {
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
    const skirt = M(folds(lathe([[0.3, 0.0], [0.285, 0.2], [0.26, 0.45], [0.24, 0.6], [0.2, 0.66], [0.1, 0.685], [0, 0.69]], 64), 0.014, 9, 0, 0.6), clay(tunic, { side: THREE.DoubleSide }), R.body); skirt.scale.set(1, 1, 0.75); skirt.position.set(0, 0.03, 0.36);
    const lapDrape = M(folds(lathe([[0, 0.0], [0.29, 0.0], [0.28, 0.1], [0.25, 0.14], [0, 0.15]], 56), 0.01, 8, 0, 0.15), tm, R.body); lapDrape.scale.set(1, 1, 1.3); lapDrape.position.set(0, 0.56, 0.12); /* stays behind the skirt top: poking through made a dark notch */
    R.feet = [-1, 1].map(sd => { const ft = M(new THREE.SphereGeometry(0.075, 24, 16), clay('#8a5a34'), root); ft.scale.set(0.85, 0.5, 1.5); ft.position.set(0.12 * sd, 0.038, 0.53); /* toes show past the hem, resting on the floor */ return ft; });
  }
  const neck = M(new THREE.CylinderGeometry(0.1, 0.12, 0.1, 28), clay(skin), R.body); neck.position.y = 1.33;
  const col = M(new THREE.TorusGeometry(0.12, 0.024, 14, 40), clay(trim), R.body); col.rotation.x = Math.PI / 2 + 0.25; col.position.set(0, 1.3, 0.015);
  const belt = M(new THREE.TorusGeometry(0.232, 0.028, 14, 56), clay(sash), R.body); belt.rotation.x = Math.PI / 2; belt.position.y = 0.72;
  const knot = M(new THREE.SphereGeometry(0.038, 16, 12), clay(sash), R.body); knot.position.set(0.07, 0.71, 0.222);
  for (const s of [-1, 1]) { const tail = M(new THREE.CapsuleGeometry(0.02, 0.17, 8, 12), clay(sash), R.body); tail.position.set(0.08 + s * 0.016, 0.59, 0.228); tail.rotation.z = 0.08 * s; }
  if (mantle) { const mp = [[0.31, 0.35], [0.28, 0.65], [0.265, 0.95], [0.255, 1.14], [0.225, 1.24], [0.14, 1.3]];
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
  R.head = buildHead({ skin, ...h }, R); R.head.position.y = 1.35; R.body.add(R.head);
  R.lidRest = h.lidTop || 0.36;

  // ---------- posing API (all angles in radians) ----------
  R.setBody = ({ lean = 0, sway = 0, twist = 0, bob = 0, breathe = 0 } = {}) => { R.body.rotation.set(lean, twist, sway); R.body.position.y = bob; R.body.scale.set(1, 1 + breathe * 0.012, 1); };
  R.setHead = ({ nod = 0, turn = 0, tilt = 0 } = {}) => R.head.rotation.set(nod, turn, tilt);
  // lid: + closes (1 = shut), - widens; squint raises the lower lid; brows: raise (up/down), angry (inner down), sad (inner up)
  R.setFace = ({ lid = 0, blink = 0, look = [0, 0], squint = 0, raise = 0, angry = 0, sad = 0, open = 0, browL = 0 } = {}) => {
    const close = Math.max(lid >= 0 ? lid * 0.75 : lid * 0.6, blink * 1.35); // expression lids stay readable; only a blink fully shuts
    R.eyes.forEach(({ aim, top, bot, s }) => {
      aim.rotation.set(-look[1] * 0.4, look[0] * 0.45, 0);
      top.rotation.set(0.1 + close + angry * 0.1 + sad * 0.12, 0, 0.12 * s + sad * 0.15 * s);
      bot.rotation.set(Math.PI - 0.1 - squint * 0.35 - blink * 0.2, 0, -0.12 * s);
    });
    R.brows.forEach(({ g, s, y0 }, i) => { const extra = i === 0 ? browL : 0; g.position.y = y0 + 0.03 * (raise + extra) - 0.018 * angry + 0.008 * sad; g.rotation.z = s * (-0.35 * angry + 0.35 * sad); });
    R.jaw.rotation.x = 0.16 * open; R.mouth.scale.set(1, 0.15 + 0.85 * open, 0.5); R.lip.position.y = 0.032 - 0.03 * open;
  };
  // arm: fwd raises forward, out raises sideways, twist rolls, bend folds the elbow; curl 0 open → 1 fist; point
  R.setArm = (side, { fwd = 0.1, out = 0.13, twist = 0, bend = 0.35, wrist = 0, curl = 0.35, point = false } = {}) => {
    const a = R.arms[side === 'L' ? 0 : 1]; a.sh.rotation.set(-fwd, twist * a.s, out * a.s); a.el.rotation.set(-bend, 0, 0); a.wr.rotation.set(-wrist, 0, 0); a.hand.set(curl, point);
  };
  // walk cycle: phase 0..1 per step pair; feet slide forward/back under the robe, robe swings
  R.walk = (phase, amt = 1) => {
    const w = phase * Math.PI * 2;
    R.feet.forEach((f, i) => { const p = w + i * Math.PI; f.position.z = 0.22 + Math.sin(p) * 0.13 * amt; f.position.y = 0.035 + Math.max(0, Math.cos(p)) * 0.035 * amt; });
    R.robe.rotation.set(Math.sin(w * 2) * 0.03 * amt, 0, Math.sin(w) * 0.04 * amt);
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
