// Check pass for a long timeline: every pose on 2s in every range gets the glitch checks (no render);
// the first, middle and last frame of each range are rendered for review.
//   node look_tests/check.js "throne.html?anim=full&ss=1" outDir
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = __dirname, PAGE = process.argv[2], OUT = path.resolve(process.argv[3] || 'production/check');
const s = http.createServer((q, r) => { const f = path.join(ROOT, q.url.split('?')[0]); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8' }); fs.createReadStream(f).pipe(r); }).listen(0, async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } }); p.on('pageerror', e => console.log('PAGE ERROR', e.message));
  await p.goto(`http://127.0.0.1:${s.address().port}/${PAGE}`); await p.waitForFunction(() => window.READY, null, { timeout: 300000 });
  const R = await p.evaluate(() => window.RANGES || [[0, window.DURATION]]), E = await p.evaluate(() => window.EDIT || []), rep = [];
  for (let k = 0; k < R.length; k++) { const [t0, t1] = R[k]; const name = E[k] ? E[k][2] : ''; let worst = null, gz = [], n = 0;
    for (let t = t0 + 0.02; t < t1; t += 1 / 12) { const r = await p.evaluate(t => { window.PREP(t); return { qc: window.QC().hits.issues.slice(0, 3), gaze: window.GAZE().filter(g => g[0] !== 'point' && !(window.GAZE_SKIP || []).includes(g[0]) && g[2] > 12) }; }, t); n++;
      if (r.qc.length && (!worst || r.qc[0].depth > worst.d)) worst = { t: +t.toFixed(2), d: r.qc[0].depth, what: r.qc[0].part + ' -> ' + r.qc[0].into };
      if (r.gaze.length) gz.push(+t.toFixed(2)); }
    for (const [tag, t] of [['a', t0 + 0.04], ['m', (t0 + t1) / 2], ['z', t1 - 0.05]]) { const d = await p.evaluate(t => window.drawFrame(t), t); fs.writeFileSync(path.join(OUT, `s${String(k).padStart(2, '0')}_${tag}.png`), Buffer.from(d.split(',')[1], 'base64')); }
    const line = { k, t0, t1, cam: name, poses: n, issue: worst, gazeOff: gz.length ? [gz[0], gz[gz.length - 1], gz.length] : null }; rep.push(line);
    console.log(`#${k} ${t0}-${t1} ${name}: ${n} poses, ${worst ? `ISSUE ${worst.d} at ${worst.t} ${worst.what}` : 'clean'}${gz.length ? ` gaze off x${gz.length}` : ''}`); }
  fs.writeFileSync(path.join(OUT, 'check.json'), JSON.stringify(rep, null, 1)); await b.close(); s.close(); console.log('done');
});
