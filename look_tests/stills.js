// Render throne-room stills at 2x supersampling: node look_tests/stills.js key1 key2 ... (key = shot_dm_nm)
// Writes production/david/stills/<key>_2x.png (2160x3840); downscale with Lanczos afterwards.
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = __dirname, OUT = path.join(__dirname, '..', 'production/david/stills'), KEYS = process.argv.slice(2);
const s = http.createServer((q, r) => { const f = path.join(ROOT, q.url.split('?')[0]); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8' }); fs.createReadStream(f).pipe(r); }).listen(0, async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const k of KEYS) {
    const [shot, dm, nm] = k.split('_'); const t0 = Date.now();
    const p = await b.newPage({ viewport: { width: 1080, height: 1920 } }); p.on('pageerror', e => console.log('PAGE ERROR', k, e.message));
    await p.goto(`http://127.0.0.1:${s.address().port}/throne.html?shot=${shot}&dm=${dm}&nm=${nm}${process.env.Q || ''}`); await p.waitForFunction(() => window.READY, null, { timeout: 300000 });
    const d = await p.evaluate(() => window.drawFrame(0)); fs.writeFileSync(path.join(OUT, `${k}_2x.png`), Buffer.from(d.split(',')[1], 'base64'));
    const rep = await p.evaluate(() => ({ qc: window.QC ? window.QC() : null, gaze: window.GAZE ? window.GAZE().filter(g => !(window.GAZE_SKIP || []).includes(g[0])) : null })); fs.writeFileSync(path.join(OUT, `${k}_qc.json`), JSON.stringify(rep, null, 1));
    const iss = rep.qc ? rep.qc.hits.issues : [], gz = (rep.gaze || []).filter(g => g[0] !== 'point' && g[2] > 12); await p.close();
    console.log(k, ((Date.now() - t0) / 1000).toFixed(0) + 's', `issues ${iss.length}${iss.length ? ' worst ' + iss[0].depth + ' ' + iss[0].part + ' -> ' + iss[0].into : ''}`, gz.length ? 'GAZE OFF ' + JSON.stringify(gz) : 'gaze ok');
  }
  await b.close(); s.close(); console.log('done');
});
