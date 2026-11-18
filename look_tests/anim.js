// Render an animated shot from a page with window.POSE(t) + drawFrame(t), checking every new pose for glitches.
//   node look_tests/anim.js "throne.html?shot=ws&dm=angry&nm=tell&anim=verdict" outDir [fps=24]
// - a frame whose pose key equals the previous one is copied, not re-rendered (bodies move on 2s, so about half the frames are holds)
// - every new pose runs window.QC() (intersections, contact, feet) and window.GAZE(); the report is written to outDir/qc.json
// - frames are rendered at the page's supersampling (?ss=2 default) and saved as PNG; downscale + mux afterwards
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = __dirname, PAGE = process.argv[2], OUT = path.resolve(process.argv[3] || 'production/anim'), FPS = +(process.argv[4] || 24);
const s = http.createServer((q, r) => { const f = path.join(ROOT, q.url.split('?')[0]); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8' }); fs.createReadStream(f).pipe(r); }).listen(0, async () => {
  fs.mkdirSync(path.join(OUT, 'frames'), { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } }); p.on('pageerror', e => console.log('PAGE ERROR', e.message));
  await p.goto(`http://127.0.0.1:${s.address().port}/${PAGE}`); await p.waitForFunction(() => window.READY, null, { timeout: 300000 });
  const DUR = await p.evaluate(() => window.DURATION), AUDIO = await p.evaluate(() => window.AUDIO || null), n = Math.round(DUR * FPS);
  const RANGES = await p.evaluate(() => window.RANGES || null), ONLY = process.env.ONLY ? process.env.ONLY.split(',').map(Number) : null;
  const want = i => { if (!RANGES) return true; const t = i / FPS; return RANGES.some(([a, b], k) => (!ONLY || ONLY.includes(k)) && t >= a && t < b); }; /* only the frames of the chosen shots */
  const tag = ONLY ? '_' + ONLY.join('-') : '';
  const report = { page: PAGE, fps: FPS, frames: n, audio: AUDIO, unique: 0, issues: [], gaze: [] }; let lastKey = null, prevFile = null, t0 = Date.now();
  for (let i = 0; i < n; i++) {
    if (!want(i)) { lastKey = null; continue; }
    const f = path.join(OUT, 'frames', `f${String(i).padStart(4, '0')}.png`), key = await p.evaluate(t => window.POSE(t), i / FPS);
    if (key === lastKey && prevFile) { fs.copyFileSync(prevFile, f); prevFile = f; continue; }
    if (process.env.RESUME && fs.existsSync(f)) { lastKey = key; prevFile = f; continue; }
    lastKey = key; prevFile = f; report.unique++;
    const d = await p.evaluate(t => window.drawFrame(t), i / FPS); fs.writeFileSync(f, Buffer.from(d.split(',')[1], 'base64'));
    const r = await p.evaluate(() => ({ qc: window.QC ? window.QC() : null, gaze: window.GAZE ? window.GAZE() : null }));
    const iss = r.qc ? r.qc.hits.issues : []; if (iss.length) report.issues.push({ frame: i, t: +(i / FPS).toFixed(3), list: iss.slice(0, 6) });
    if (r.qc) for (const [k, v] of Object.entries(r.qc)) if (k !== 'hits') (report.contact = report.contact || []).push({ frame: i, [k]: v });
    report.gaze.push({ frame: i, g: r.gaze });
    console.log(`frame ${i} (${report.unique} unique, ${((Date.now() - t0) / 1000 / report.unique).toFixed(0)}s each)`, iss.length ? `ISSUES ${iss.length} worst ${iss[0].depth} ${iss[0].part} -> ${iss[0].into}` : 'clean');
  }
  fs.writeFileSync(path.join(OUT, `qc${tag}.json`), JSON.stringify(report, null, 1)); await b.close(); s.close();
  console.log('done', n, 'frames,', report.unique, 'rendered,', report.issues.length, 'frames with issues');
});
