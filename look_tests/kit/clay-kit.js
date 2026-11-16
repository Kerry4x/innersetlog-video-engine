// Clay kit v2: the reusable, locked parts of the look.
// Materials (mottled clay with thumbprints and tool marks), sculpting helpers (lumps, drapery folds,
// grooved hair), the character builder (fingers, rolled eyelids, blinks), and prop builders.
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

  // ---------- sculpting ----------
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
  // drapery: vertical folds around a lathe (deeper near the hem), slightly irregular like pressed cloth
  function folds(geo, amp, n, H) {
    const s = (lumpSeed += 2.1), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(x, z); if (r < 1e-5) continue;
      const a = Math.atan2(x, z), k = amp * (0.25 + 0.75 * Math.pow(Math.max(0, 1 - y / H), 0.7)) * Math.sin(a * n + 3 * fbm(x * 2 + s, y * 1.2, z * 2));
      const f = (r + k) / r; p.setX(i, x * f); p.setZ(i, z * f);
    }
    geo.computeVertexNormals(); return geo;
  }
  // grooves for sculpted hair/beards: strands running down (around the y axis)
  function grooves(geo, amp, n) {
    const p = geo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i); const L = v.length(); if (L < 1e-5) continue;
      const a = Math.atan2(v.x, v.z), k = amp * Math.sin(a * n + 2 * fbm(v.x * 6, v.y * 3, v.z * 6)); v.multiplyScalar((L + k) / L); p.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals(); return geo;
  }

  function K_grooveTorus(geo) { // strands across a torus tube (for fringes)
    const p = geo.attributes.position, uv = geo.attributes.uv, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const k = 1 + 0.06 * Math.sin(uv.getX(i) * 140) * (0.6 + 0.4 * fbm(v.x * 9, v.y * 9, v.z * 9)); const r = Math.hypot(v.x, v.y);
      p.setXYZ(i, v.x, v.y, v.z * k); }
    geo.computeVertexNormals(); return geo;
  }
  // ---------- surface: thumbprints, tool marks, smudges, grain (bump map) ----------
  const bump = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d');
    g.fillStyle = '#808080'; g.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 900; i++) { // soft smudges
      const x = rand() * 1024, y = rand() * 1024, r = 10 + rand() * 50, light = rand() > 0.5;
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, light ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'); gr.addColorStop(1, 'rgba(128,128,128,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r, r * (0.5 + rand() * 0.5), rand() * 3.14, 0, 6.29); g.fill();
    }
    g.lineCap = 'round';
    for (let i = 0; i < 60; i++) { // thumbprints: concentric ridges
      const x = rand() * 1024, y = rand() * 1024, rot = rand() * 3.14, R = 18 + rand() * 22;
      for (let k = 1; k < 9; k++) { g.strokeStyle = k % 2 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y, R * k / 8, R * k / 8 * 0.7, rot, 0.3, 5.9); g.stroke(); }
    }
    for (let i = 0; i < 120; i++) { // tool drags
      const x = rand() * 1024, y = rand() * 1024, a = rand() * 6.28, len = 30 + rand() * 90;
      g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 2 + rand() * 3; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.4) * len / 2, y + Math.sin(a + 0.4) * len / 2, x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + 3, y + 3); g.lineTo(x + 3 + Math.cos(a) * len, y + 3 + Math.sin(a) * len); g.stroke();
    }
    for (let i = 0; i < 14000; i++) { const v = rand() > 0.5 ? 255 : 0; g.fillStyle = `rgba(${v},${v},${v},0.07)`; g.fillRect(rand() * 1024, rand() * 1024, 2, 2); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  })();
  // mottled colour in the shader (world-space noise), so no two areas of clay are the exact same colour
  const MOTTLE_GLSL = `
    varying vec3 vKWP;
    float kh(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float kn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(kh(i), kh(i + vec3(1,0,0)), f.x), mix(kh(i + vec3(0,1,0)), kh(i + vec3(1,1,0)), f.x), f.y),
                 mix(mix(kh(i + vec3(0,0,1)), kh(i + vec3(1,0,1)), f.x), mix(kh(i + vec3(0,1,1)), kh(i + vec3(1,1,1)), f.x), f.y), f.z); }`;
  function clay(color, o = {}) {
    const { mottle = 0.14, mfreq = 7, ...rest } = o;
    const m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.7, sheen: 0.12, sheenRoughness: 0.85, sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.3), bumpMap: bump, bumpScale: 2.6, ...rest });
    if (mottle > 0) {
      m.onBeforeCompile = sh => {
        sh.vertexShader = 'varying vec3 vKWP;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
          vec4 kwp = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            kwp = instanceMatrix * kwp;
          #endif
          vKWP = (modelMatrix * kwp).xyz;`);
        sh.fragmentShader = MOTTLE_GLSL + '\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
          float kmo = 0.6 * kn(vKWP * ${mfreq.toFixed(2)}) + 0.4 * kn(vKWP * ${(mfreq * 3.3).toFixed(2)} + 7.0);
          diffuseColor.rgb *= 1.0 + ${mottle.toFixed(3)} * (kmo - 0.5) * 2.0;`);
      };
      m.customProgramCacheKey = () => `clay-${mottle}-${mfreq}`;
    }
    return m;
  }
  // locked palette
  const C = {
    skin: clay('#d39a72', { mottle: 0.08, mfreq: 12 }), skinDark: clay('#a8714c'), kingRobe: clay('#5b3591'), sash: clay('#c9a13e'), prophetRobe: clay('#8a6544'),
    hairDark: clay('#3b2618'), hairGray: clay('#d8d2c6', { mottle: 0.06 }), eyeWhite: clay('#f5f1e6', { bumpScale: 0.4, roughness: 0.35, mottle: 0.02 }),
    pupil: clay('#140e0a', { bumpScale: 0, roughness: 0.2, sheen: 0, mottle: 0 }), mouth: clay('#2a0c0c', { bumpScale: 0.3, sheen: 0, mottle: 0 }),
    gold: clay('#d7a63f', { metalness: 0.25, roughness: 0.5 }), throne: clay('#7a2a22'), wood: clay('#5a3b25', { mottle: 0.2 }), wall: clay('#a5835f'),
    stoneLight: clay('#d9c3a0'), stone: clay('#c4a67e'), roof: clay('#b98d62'), cypress: clay('#3f5a32'), olive: clay('#7d8a52'), sand: clay('#c9a878'),
    terra: clay('#b0643c', { mottle: 0.18 }), terraDark: clay('#7e4128'), straw: clay('#c9a45a', { mottle: 0.2 }), bread: clay('#c88a4a'), fig: clay('#5a2f4a'), linen: clay('#e6dcc6', { mottle: 0.06 }),
  };
  const mesh = (geo, mat, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = true; return m; };
  const blob = (r, mat, amp = 0.012, seg = 32) => mesh(lumpy(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), amp, 9), mat);
  const lathe = (pts, mat, { seg = 40, lump = 0.006, fold = 0, nFold = 9 } = {}) => {
    let g = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
    if (fold) g = folds(g, fold, nFold, Math.max(...pts.map(p => p[1])));
    return mesh(lumpy(g, lump, 6, 'radial'), mat);
  };

  // ---------- character builder (one design language for every person) ----------
  // hair: [thetaStart, thetaLength] of a grooved shell around the back of the head (fringe for bald men)
  // beardMass: {y, r, sx, sy, sz} sculpted beard; legacy `beard` (list of blobs) still works
  function character({ robeMat, robeH, robeR, hair, hairBand = [0.0, 0.62], beard, beardMass, crown, mustache = false, skin = C.skin, mantle = null }) {
    const g = new THREE.Group(), P = {};
    const pts = [[0, 0], [robeR, 0], [robeR * 1.03, robeH * 0.15], [robeR * 0.86, robeH * 0.6], [robeR * 0.62, robeH * 0.9], [robeR * 0.3, robeH], [0, robeH]];
    P.body = lathe(pts, robeMat, { seg: 64, lump: 0.012, fold: 0.022, nFold: 11 }); g.add(P.body);
    // belt
    const belt = mesh(lumpy(new THREE.TorusGeometry(robeR * 0.93 + 0.012, 0.03, 12, 64), 0.004, 10), C.wood); belt.rotation.x = Math.PI / 2; belt.position.y = robeH * 0.55; belt.scale.set(1, 1, 1); g.add(belt);
    if (mantle) { // a wool mantle wrapped over the back and one shoulder, with folds
      const mp = [[robeR * 1.02, robeH * 0.28], [robeR * 0.95, robeH * 0.62], [robeR * 0.72, robeH * 0.92], [robeR * 0.42, robeH * 1.02]].map(([x, y]) => new THREE.Vector2(x * 1.07, y));
      let mg = new THREE.LatheGeometry(mp, 56, Math.PI * 0.15, Math.PI * 1.45); mg = folds(mg, 0.03, 9, robeH);
      P.mantle = mesh(lumpy(mg, 0.012, 3.5, 'radial'), mantle); P.mantle.material.side = THREE.DoubleSide; g.add(P.mantle);
    }
    const hr = 0.27; P.head = new THREE.Group(); P.head.position.y = robeH + hr * 0.82; g.add(P.head);
    const neck = mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.16, 20), skin); neck.position.y = -hr * 0.85; P.head.add(neck);
    P.head.add(blob(hr, skin, 0.008, 56));
    P.nose = blob(0.062, skin, 0.006, 24); P.nose.scale.set(0.9, 0.9, 1.05); P.nose.position.set(0, -0.03, 0.272); P.head.add(P.nose);
    for (const s of [-1, 1]) { // nostrils + cheeks give the face structure
      const cheek = blob(0.075, skin, 0.004, 20); cheek.scale.set(1, 0.75, 0.6); cheek.position.set(0.12 * s, -0.075, 0.19); P.head.add(cheek);
      const ear = blob(0.06, skin, 0.005, 16); ear.scale.set(0.45, 1, 0.8); ear.position.set(0.26 * s, 0, -0.01); P.head.add(ear);
    }
    P.eyes = [-1, 1].map(s => {
      const e = new THREE.Group(); e.position.set(0.095 * s, 0.045, 0.212); P.head.add(e);
      const white = mesh(new THREE.SphereGeometry(0.064, 28, 20), C.eyeWhite, false); e.add(white);
      const pupil = mesh(new THREE.SphereGeometry(0.03, 18, 14), C.pupil, false); pupil.scale.z = 0.45; pupil.position.z = 0.058; e.add(pupil);
      const glint = mesh(new THREE.SphereGeometry(0.007, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }), false); glint.position.set(0.012, 0.012, 0.072); e.add(glint);
      // upper lid: a cap with a thick rolled edge (no razor-thin shell slicing the eye)
      const lid = new THREE.Group(); e.add(lid);
      lid.add(mesh(new THREE.SphereGeometry(0.071, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), skin, false));
      const rim = mesh(new THREE.TorusGeometry(0.071, 0.013, 10, 40), skin, false); rim.rotation.x = Math.PI / 2; lid.add(rim);
      // lower lid: a soft roll under the eye
      const low = mesh(new THREE.TorusGeometry(0.066, 0.011, 8, 32, Math.PI * 0.9), skin, false); low.rotation.set(Math.PI / 2 + 1.0, 0, Math.PI * 0.05); low.position.y = -0.005; e.add(low);
      return { e, white, pupil, lid, glint };
    });
    P.brows = [-1, 1].map(s => { const b = mesh(lumpy(new THREE.CapsuleGeometry(0.021, 0.09, 4, 10), 0.005, 18), hair); b.rotation.z = Math.PI / 2; b.position.set(0.1 * s, 0.145, 0.235); P.head.add(b); return b; });
    P.mouth = mesh(new THREE.SphereGeometry(0.07, 24, 12), C.mouth, false); P.mouth.scale.set(1, 0.14, 0.4); P.mouth.position.set(0, -0.128, 0.238); P.mouth.rotation.x = -0.35; P.head.add(P.mouth);
    const lip = mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 28, Math.PI), skin, false); lip.rotation.set(-0.35, 0, Math.PI); lip.scale.set(1, 0.5, 1); lip.position.set(0, -0.14, 0.236); P.head.add(lip); P.lip = lip;
    // sculpted hair: a grooved shell around the back of the head, or a horseshoe fringe for bald men
    {
      const [t0, tl] = hairBand;
      if (t0 > 0.2) {
        let fg = new THREE.TorusGeometry(hr * 0.98, 0.07, 16, 64, Math.PI * 1.25); fg = K_grooveTorus(fg);
        const f = mesh(lumpy(fg, 0.012, 9), hair); f.rotation.set(Math.PI / 2, 0, Math.PI * 0.125 + Math.PI); f.scale.set(1, 1, 1.5); f.position.set(0, 0.02, -0.02); P.head.add(f);
      } else {
        let hg = new THREE.SphereGeometry(hr * 1.07, 48, 28, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, Math.PI * t0, Math.PI * tl);
        hg = grooves(hg, 0.008, 34); const hm = mesh(lumpy(hg, 0.012, 7), hair); hm.material.side = THREE.DoubleSide; P.head.add(hm);
      }
    }
    if (beardMass) { const { y = -0.24, r = 0.17, sx = 1.15, sy = 0.9, sz = 0.75, z = 0.12 } = beardMass;
      const bg = grooves(new THREE.SphereGeometry(r, 40, 30), 0.01, 26); const b = mesh(lumpy(bg, 0.014, 8), hair); b.scale.set(sx, sy, sz); b.position.set(0, y, z); P.head.add(b); P.beard = b; }
    if (beard) beard.forEach(([x, y, z, r]) => { const b = blob(r, hair, 0.012, 18); b.position.set(x, y, z); P.head.add(b); });
    if (crown) {
      const band = mesh(lumpy(new THREE.CylinderGeometry(0.205, 0.195, 0.11, 40, 4, true), 0.008, 10, 'radial'), C.gold); band.material.side = THREE.DoubleSide; band.position.y = 0.24; P.head.add(band);
      for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; const sp = mesh(lumpy(new THREE.ConeGeometry(0.035, 0.11, 10), 0.004, 14), C.gold); sp.position.set(Math.cos(a) * 0.2, 0.34, Math.sin(a) * 0.2); P.head.add(sp);
        const gem = blob(0.016, clay('#8a1c2a', { roughness: 0.3, mottle: 0 }), 0.002, 10); gem.position.set(Math.cos(a) * 0.207, 0.24, Math.sin(a) * 0.207); P.head.add(gem); }
    }
    // arms: shoulder → upper arm → elbow → forearm → hand with four fingers and a thumb
    P.arms = [-1, 1].map(s => {
      const sh = new THREE.Group(); sh.position.set(robeR * 0.55 * s, robeH * 0.86, 0.02); g.add(sh);
      const upper = mesh(lumpy(new THREE.CapsuleGeometry(0.078, 0.14, 8, 18), 0.008, 7), robeMat); upper.position.y = -0.11; sh.add(upper);
      const el = new THREE.Group(); el.position.y = -0.24; sh.add(el);
      const sleeve = lathe([[0, -0.17], [0.06, -0.19], [0.092, -0.2], [0.088, -0.12], [0.075, 0.02], [0, 0.04]], robeMat, { seg: 40, lump: 0.004, fold: 0.004, nFold: 7 }); el.add(sleeve);
      const hand = new THREE.Group(); hand.position.y = -0.22; el.add(hand);
      const palm = blob(0.058, skin, 0.005, 20); palm.scale.set(0.55, 1.0, 0.95); hand.add(palm);
      // fingers in a row front-to-back; curl bends them toward the palm (the body side)
      const fingers = [0.033, 0.011, -0.011, -0.033].map((z, i) => {
        const f = new THREE.Group(); f.position.set(0, -0.045, z); hand.add(f);
        const seg1 = mesh(new THREE.CapsuleGeometry(0.0155, 0.034 + (i === 1 ? 0.006 : 0), 4, 10), skin); seg1.position.y = -0.025; f.add(seg1);
        const knuckle = new THREE.Group(); knuckle.position.y = -0.05; f.add(knuckle);
        const seg2 = mesh(new THREE.CapsuleGeometry(0.0145, 0.026, 4, 10), skin); seg2.position.y = -0.018; knuckle.add(seg2);
        return { f, knuckle };
      });
      const thumbG = new THREE.Group(); thumbG.position.set(-0.018 * s, -0.005, 0.045); hand.add(thumbG);
      const thumb = mesh(new THREE.CapsuleGeometry(0.017, 0.035, 4, 10), skin); thumb.position.y = -0.025; thumbG.add(thumb);
      const curlTo = (fi, c) => { fingers[fi].f.rotation.z = -s * c * 1.1; fingers[fi].knuckle.rotation.z = -s * c * 1.3; };
      // pose in radians: forward (x), out to the side (z, mirrored), twist (y), elbow bend; curl 0 = open, 1 = fist
      const pose = ({ fwd = 0, out = 0.12, twist = 0, bend = 0.15, point = false, curl = 0.35, shrug = 0 }) => {
        sh.rotation.set(-fwd, twist * s, out * s); el.rotation.set(-bend, 0, 0); sh.position.y = robeH * 0.86 + 0.03 * shrug;
        fingers.forEach((_, i) => curlTo(i, point ? (i === 0 ? 0 : 0.95) : curl));
        thumbG.rotation.set(0.3 + 0.6 * (point ? 0.8 : curl), 0, -s * (0.4 + 0.5 * (point ? 0.8 : curl)));
      };
      pose({}); return { sh, el, hand, pose };
    });
    // face: lids are the main acting tool; brows give anger/sorrow; pupils give where they look
    P.express = ({ lid = 0.55, shock = 0, anger = 0, sad = 0, open = 0, lookX = 0, lookY = 0, blink = 0, smile = 0 }) => {
      const L = THREE.MathUtils.lerp;
      P.eyes.forEach(({ white, pupil, lid: l, glint }) => {
        l.rotation.x = L(L(L(lid, 0.3, anger), -0.75, shock) + 0.5 * sad, 1.55, blink);
        white.scale.setScalar(1 + 0.1 * shock); pupil.scale.set(1 - 0.3 * shock, 1 - 0.3 * shock, 0.45);
        pupil.position.set(0.02 * lookX, 0.018 * lookY - 0.01 * sad, 0.058 - 0.004 * Math.abs(lookX)); glint.position.set(0.012 + 0.02 * lookX, 0.012 + 0.018 * lookY, 0.072);
      });
      P.brows.forEach((b, i) => {
        const side = i ? 1 : -1; // i=0 is the left brow
        b.position.y = 0.145 + 0.05 * shock - 0.028 * anger + 0.012 * sad - 0.01 * blink;
        b.rotation.z = Math.PI / 2 + side * (0.36 * anger - 0.3 * sad + 0.1 * shock);
      });
      const o = Math.max(open, shock * 0.8);
      P.mouth.scale.set(L(1, 0.75, o) + 0.22 * anger - 0.2 * sad + 0.2 * smile, L(0.14, 0.75, o) + 0.1 * anger, 0.4); P.mouth.position.y = -0.128 - 0.02 * o;
      P.lip.position.y = -0.14 - 0.035 * o; P.lip.scale.set(1 + 0.2 * smile - 0.15 * sad, 0.5, 1);
    };
    // lip flap on 2s while speaking
    P.talk = (t, amt = 1) => 0.12 + 0.5 * amt * Math.abs(Math.sin(Math.floor(t * 12) * 2.3 + hash(Math.floor(t * 12), 3, 1) * 3));
    if (mustache) for (const sx of [-1, 1]) { const mg = grooves(new THREE.SphereGeometry(0.05, 24, 16), 0.004, 14); const m = mesh(lumpy(mg, 0.005, 14), hair); m.scale.set(1.35, 0.55, 0.75); m.position.set(0.052 * sx, -0.083, 0.258); m.rotation.z = 0.28 * sx; P.head.add(m); }
    return { g, P };
  }

  // ---------- props (set dressing, all clay) ----------
  const props = {
    jar(h = 0.6, mat = C.terra) { const r = h * 0.3; return lathe([[0, 0], [r * 0.45, 0], [r * 0.95, h * 0.25], [r, h * 0.5], [r * 0.7, h * 0.78], [r * 0.38, h * 0.88], [r * 0.45, h], [r * 0.32, h], [0, h * 0.86]], mat, { seg: 36, lump: 0.006 }); },
    bowl(r = 0.12, mat = C.terra) { const m = lathe([[0, 0], [r * 0.5, 0], [r, r * 0.5], [r * 0.92, r * 0.55], [0, r * 0.12]], mat, { seg: 32, lump: 0.004 }); m.material.side = THREE.DoubleSide; return m; },
    lamp() { // a pinched clay oil lamp with a flame (add a light yourself)
      const g = new THREE.Group(); const body = lathe([[0, 0], [0.05, 0], [0.075, 0.025], [0.06, 0.035], [0, 0.03]], C.terra, { seg: 24, lump: 0.003 }); g.add(body);
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 10), new THREE.MeshBasicMaterial({ color: '#ffd27a' })); flame.scale.set(0.8, 1.8, 0.8); flame.position.set(0.06, 0.06, 0); g.add(flame);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), new THREE.MeshBasicMaterial({ color: '#ffb050', transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false })); glow.position.copy(flame.position); g.add(glow);
      g.userData.flame = flame; g.userData.glow = glow; return g;
    },
    basket(r = 0.18, h = 0.14) { const g = new THREE.Group(); const b = lathe([[0, 0], [r * 0.8, 0], [r, h], [r * 0.95, h], [0, h * 0.2]], C.straw, { seg: 40, lump: 0.004, fold: 0.006, nFold: 20 }); b.material.side = THREE.DoubleSide; g.add(b);
      for (let i = 0; i < 7; i++) { const f = blob(0.035, C.fig, 0.004, 12); const a = rand() * 6.28, rr = rand() * r * 0.55; f.position.set(Math.cos(a) * rr, h * 0.85 + rand() * 0.03, Math.sin(a) * rr); g.add(f); } return g; },
    bread() { const b = blob(0.07, C.bread, 0.01, 20); b.scale.set(1.2, 0.45, 1); return b; },
    cushion(w = 0.5, mat = C.throne) { return mesh(lumpy(new THREE.SphereGeometry(w / 2, 28, 18).scale(1, 0.35, 0.8), 0.012, 5), mat); },
  };

  // ---------- timing helpers ----------
  const stepTime = t => Math.floor(t * 12) / 12;         // poses step at 12/s (on 2s)
  const boil = (t, k) => hash(Math.floor(t * 12), k, 7.3) - 0.5; // tiny between-pose shift
  const blinkAt = (t, k) => { const P = 2.4 + hash(k, 1, 1) * 1.6, ph = (stepTime(t) + hash(k, 2, 2) * P) % P; return ph < 0.17 ? Math.sin(ph / 0.17 * Math.PI) : 0; };
  const back = x => { x = Math.max(0, Math.min(1, x)); const c = 1.6; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }; // overshoot
  return { rand, hash, fbm, lumpy, folds, grooves, bump, clay, C, mesh, blob, lathe, character, props, stepTime, boil, blinkAt, back };
}
