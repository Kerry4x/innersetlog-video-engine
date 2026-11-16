// Clay kit: the reusable, locked parts of the look (materials, sculpting noise, character builder).
// Every random choice is seeded, so the same code always produces the same characters and frames.
import * as THREE from 'three';

export function createKit(seed0 = 12345) {
  let seed = seed0;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const hash = (x, y, z) => { const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return h - Math.floor(h); };
  const sm = t => t * t * (3 - 2 * t);
  function vnoise(x, y, z) {
    const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z), fx = sm(x - X), fy = sm(y - Y), fz = sm(z - Z); let r = 0;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) r += hash(X + i, Y + j, Z + k) * (i ? fx : 1 - fx) * (j ? fy : 1 - fy) * (k ? fz : 1 - fz);
    return r;
  }
  const fbm = (x, y, z) => vnoise(x, y, z) * 0.65 + vnoise(x * 2.3 + 5, y * 2.3, z * 2.3) * 0.35;
  let lumpSeed = 0;
  // hand-pressed unevenness: push vertices in/out from the centre ('sphere') or the vertical axis ('radial')
  function lumpy(geo, amp, freq, mode = 'sphere') {
    const s = (lumpSeed += 3.7), p = geo.attributes.position, v = new THREE.Vector3(), d = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i); mode === 'sphere' ? d.copy(v) : d.set(v.x, 0, v.z);
      const L = d.length(); if (L < 1e-5) continue; d.divideScalar(L);
      v.addScaledVector(d, (fbm(v.x * freq + s, v.y * freq, v.z * freq) - 0.5) * 2 * amp); p.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals(); return geo;
  }
  // thumb smudges + fine grain, used as a bump map on every clay surface
  const bump = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    g.fillStyle = '#808080'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 700; i++) {
      const x = rand() * 512, y = rand() * 512, r = 6 + rand() * 26, light = rand() > 0.5;
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, light ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'); gr.addColorStop(1, 'rgba(128,128,128,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r, r * (0.5 + rand() * 0.5), rand() * 3.14, 0, 6.29); g.fill();
    }
    for (let i = 0; i < 6000; i++) { const v = rand() > 0.5 ? 255 : 0; g.fillStyle = `rgba(${v},${v},${v},0.06)`; g.fillRect(rand() * 512, rand() * 512, 1.5, 1.5); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  })();
  const clay = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.78, sheen: 0.35, sheenRoughness: 0.7, sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.35), bumpMap: bump, bumpScale: 2.2, ...o });
  // locked palette
  const C = {
    skin: clay('#d39a72'), skinDark: clay('#a8714c'), kingRobe: clay('#5b3591'), sash: clay('#c9a13e'), prophetRobe: clay('#8a6544'),
    hairDark: clay('#3b2618'), hairGray: clay('#d8d2c6'), eyeWhite: clay('#f7f3ea', { bumpScale: 0.3, roughness: 0.4 }),
    pupil: clay('#16100c', { bumpScale: 0, roughness: 0.25, sheen: 0 }), mouth: clay('#240a0a', { bumpScale: 0.3, sheen: 0 }),
    gold: clay('#d7a63f', { metalness: 0.25, roughness: 0.5 }), throne: clay('#7a2a22'), wood: clay('#5a3b25'), wall: clay('#a5835f'),
    stoneLight: clay('#d9c3a0'), stone: clay('#c4a67e'), roof: clay('#b98d62'), cypress: clay('#3f5a32'), olive: clay('#7d8a52'), sand: clay('#c9a878'),
  };
  const mesh = (geo, mat, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = true; return m; };
  const blob = (r, mat, amp = 0.012, seg = 32) => mesh(lumpy(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), amp, 9), mat);

  // ---------- character builder (one design language for every person) ----------
  function character({ robeMat, robeH, robeR, hair, beard, crown, skin = C.skin }) {
    const g = new THREE.Group(), P = {};
    const pts = [[0, 0], [robeR, 0], [robeR * 1.03, robeH * 0.15], [robeR * 0.86, robeH * 0.6], [robeR * 0.62, robeH * 0.9], [robeR * 0.3, robeH], [0, robeH]].map(([x, y]) => new THREE.Vector2(x, y));
    P.body = mesh(lumpy(new THREE.LatheGeometry(pts, 48), 0.022, 3.2, 'radial'), robeMat); g.add(P.body);
    const hr = 0.27; P.head = new THREE.Group(); P.head.position.y = robeH + hr * 0.82; g.add(P.head);
    P.head.add(blob(hr, skin, 0.008, 48));
    P.nose = blob(0.06, skin, 0.006, 20); P.nose.scale.set(0.9, 0.85, 1); P.nose.position.set(0, -0.03, 0.27); P.head.add(P.nose);
    for (const s of [-1, 1]) { const ear = blob(0.06, skin, 0.005, 16); ear.scale.set(0.45, 1, 0.8); ear.position.set(0.26 * s, 0, -0.01); P.head.add(ear); }
    P.eyes = [-1, 1].map(s => {
      const e = new THREE.Group(); e.position.set(0.095 * s, 0.045, 0.215); P.head.add(e);
      const white = mesh(new THREE.SphereGeometry(0.066, 24, 18), C.eyeWhite, false); e.add(white);
      const pupil = mesh(new THREE.SphereGeometry(0.032, 16, 12), C.pupil, false); pupil.scale.z = 0.5; pupil.position.z = 0.058; e.add(pupil);
      const lid = mesh(new THREE.SphereGeometry(0.072, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), skin, false); e.add(lid);
      return { e, white, pupil, lid };
    });
    P.brows = [-1, 1].map(s => { const b = mesh(lumpy(new THREE.CapsuleGeometry(0.02, 0.085, 4, 8), 0.004, 20), hair); b.rotation.z = Math.PI / 2; b.position.set(0.1 * s, 0.14, 0.235); P.head.add(b); return b; });
    P.mouth = mesh(new THREE.SphereGeometry(0.07, 24, 12), C.mouth, false); P.mouth.scale.set(1, 0.14, 0.4); P.mouth.position.set(0, -0.125, 0.235); P.mouth.rotation.x = -0.35; P.head.add(P.mouth);
    for (let i = 0; i < 9; i++) { const a = Math.PI * (1.05 + i / 8 * 0.9); const h = blob(0.1 + rand() * 0.03, hair, 0.01, 16); h.position.set(Math.cos(a) * 0.22, 0.06 + rand() * 0.06, Math.sin(a) * 0.22 - 0.03); P.head.add(h); }
    if (beard) beard.forEach(([x, y, z, r]) => { const b = blob(r, hair, 0.012, 18); b.position.set(x, y, z); P.head.add(b); });
    if (crown) {
      const band = mesh(lumpy(new THREE.CylinderGeometry(0.2, 0.19, 0.11, 32, 4, true), 0.008, 10, 'radial'), C.gold); band.position.y = 0.24; P.head.add(band);
      for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; const sp = blob(0.04, C.gold, 0.004, 12); sp.scale.y = 1.6; sp.position.set(Math.cos(a) * 0.195, 0.33, Math.sin(a) * 0.195); P.head.add(sp); }
    }
    P.arms = [-1, 1].map(s => {
      const sh = new THREE.Group(); sh.position.set(robeR * 0.55 * s, robeH * 0.86, 0.02); g.add(sh);
      const sleeve = mesh(lumpy(new THREE.CapsuleGeometry(0.075, 0.34, 6, 16), 0.01, 7), robeMat); sleeve.position.y = -0.22; sh.add(sleeve);
      const hand = blob(0.07, skin, 0.006, 16); hand.position.y = -0.46; sh.add(hand);
      return { sh, hand };
    });
    // expression presets (0..1 blends); the acting is mostly eyelids
    P.express = ({ lid = 0.55, shock = 0 }) => {
      P.eyes.forEach(({ white, pupil, lid: l }) => { l.rotation.x = THREE.MathUtils.lerp(lid, -0.9, shock); white.scale.setScalar(1 + 0.12 * shock); pupil.scale.set(1 - 0.3 * shock, 1 - 0.3 * shock, 0.5); });
      P.brows.forEach((b, i) => { b.position.y = 0.14 + 0.05 * shock; b.rotation.z = Math.PI / 2 + (i ? 1 : -1) * 0.3 * shock; });
      P.mouth.scale.set(THREE.MathUtils.lerp(1, 0.7, shock), THREE.MathUtils.lerp(0.14, 0.75, shock), 0.4); P.mouth.position.y = -0.125 - 0.02 * shock;
    };
    return { g, P };
  }

  // stop-motion helpers: poses step at 12/s, plus a tiny seeded "boil"
  const stepTime = t => Math.floor(t * 12) / 12;
  const boil = (t, k) => hash(Math.floor(t * 12), k, 7.3) - 0.5;
  return { rand, hash, fbm, lumpy, bump, clay, C, mesh, blob, character, stepTime, boil };
}
