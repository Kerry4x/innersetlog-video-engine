// Automatic glitch check for a 3D frame: finds character parts that sit inside props, other characters,
// the floor or the walls. Run it on every frame of a shot (after poses and solve()).
//   import { qc } from './kit/qc.js';  const report = qc({ chars: [david.root, nathan.root], world: [throne, dais, ...], floorY: 0, walls })
// A point is "inside" a closed mesh when a ray from it crosses the surface an odd number of times (rays go up,
// so robes that are open at the hem still count). Depth = distance to the nearest surface along 6 axes.
import * as THREE from 'three';

const DIRS = [[0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]].map(d => new THREE.Vector3(...d));
const rc = new THREE.Raycaster(); rc.firstHitOnly = false;

function meshes(root, skip = []) { const out = []; root.traverse(o => { if (o.isMesh && o.visible && !o.userData.noQC && !o.material.transparent && o.geometry.attributes.position && !/Plane|Shape/.test(o.geometry.type) && !skip.some(c => isUnder(o, c))) out.push(o); }); return out; }
const isUnder = (o, c) => { for (let p = o; p; p = p.parent) if (p === c) return true; return false; };
export function label(o) { const names = []; for (let p = o; p; p = p.parent) if (p.name) names.push(p.name); return `${names.reverse().join('/') || 'scene'}:${o.geometry.type.replace('Geometry', '')}#${o.material.color?.getHexString?.() || ''}`; }

function samples(m, max = 160) { const p = m.geometry.attributes.position, step = Math.max(1, Math.floor(p.count / max)), v = [], w = new THREE.Vector3();
  for (let i = 0; i < p.count; i += step) v.push(w.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld).clone()); return v; }

function inside(P, target) { const side = target.material.side; target.material.side = THREE.DoubleSide; /* count every crossing */
  rc.set(P, DIRS[0]); const n = rc.intersectObject(target, false).length;
  let depth = Infinity; if (n % 2 === 1) for (const d of DIRS) { rc.set(P, d); const h = rc.intersectObject(target, false)[0]; if (h) depth = Math.min(depth, h.distance); }
  target.material.side = side; return n % 2 === 1 ? depth : 0; }

/* tol: penetration allowed for light contact (a hand resting on wood sinks a few mm in clay). */
export function qc({ chars, world = [], ignore = [], allow = [], floorY = null, floors = [], walls = [], tol = 0.006, pairs = true }) {
  chars.forEach(c => c.updateMatrixWorld(true)); world.forEach(w => w.updateMatrixWorld(true));
  const issues = [], cm = chars.map(c => meshes(c)), wm = world.flatMap(w => meshes(w, [...chars, ...ignore])), box = m => new THREE.Box3().setFromObject(m);
  const wb = wm.map(m => [m, box(m)]);
  chars.forEach((c, ci) => {
    const others = pairs ? chars.filter((_, j) => j !== ci).flatMap((_, j) => cm[j >= ci ? j + 1 : j]).map(m => [m, box(m)]) : [];
    for (const m of cm[ci]) { const b = box(m); const pts = samples(m);
      for (const [t, tb] of [...wb, ...others]) { if (!b.intersectsBox(tb)) continue; let n = 0, worst = 0;
        for (const P of pts) { if (!tb.containsPoint(P)) continue; const d = inside(P, t); if (d > tol) { n++; worst = Math.max(worst, d); } }
        if (n) issues.push({ part: label(m), into: label(t), points: n, depth: +worst.toFixed(3) }); }
      /* floor: nothing below the surface it stands on (floors: [{ y, minX, maxX, minZ, maxZ }]) */
      if (floorY !== null) { let worst = 0; for (const P of pts) { let y = floorY; for (const f of floors) if (P.x > f.minX && P.x < f.maxX && P.z > f.minZ && P.z < f.maxZ) y = Math.max(y, f.y); if (y - P.y > tol) worst = Math.max(worst, y - P.y); }
        if (worst) issues.push({ part: label(m), into: 'floor', depth: +worst.toFixed(3) }); }
      for (const w of walls) { let worst = 0; for (const P of pts) { const d = (P[w.axis] - w.at) * w.sign; if (d <= tol) continue;
        if (w.thick && d > w.thick + 0.02) continue; /* beyond a wall of known thickness = outside the room, not inside the wall */
        if (w.opening && P[w.opening.axis] > w.opening.min && P[w.opening.axis] < w.opening.max && P.y < w.opening.ymax) continue; /* passing through a doorway */
        worst = Math.max(worst, d); } if (worst) issues.push({ part: label(m), into: `wall ${w.axis}${w.sign > 0 ? '>' : '<'}${w.at}`, depth: +worst.toFixed(3) }); }
    }
  });
  /* allowances: designed soft contact (a cushion under a sitter), each with a limit and a reason; anything deeper or any new pair is still an issue */
  const ok = h => allow.find(r => new RegExp(r.part).test(h.part) && new RegExp(r.into).test(h.into) && h.depth <= r.max);
  return { issues: issues.filter(h => !ok(h)).sort((a, b) => b.depth - a.depth), allowed: issues.filter(ok).map(h => ({ ...h, why: ok(h).why })) };
}

/* contact check: is A actually touching B (gap below tol)? For hands on armrests, feet on floors, things held. */
export function gap(a, b) { a.updateMatrixWorld(true); b.updateMatrixWorld(true); let best = Infinity; const tm = meshes(b);
  for (const m of meshes(a)) for (const P of samples(m, 80)) for (const t of tm) for (const d of DIRS) { rc.set(P, d); rc.far = best; const h = rc.intersectObject(t, false)[0]; if (h) best = Math.min(best, h.distance); }
  rc.far = Infinity; return +best.toFixed(3); }
