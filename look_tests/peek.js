// Quick check: render a few single frames of a page to video_analysis/peek/<name>_<t>.jpg and a strip.
//   node look_tests/peek.js page.html 0.5 2.9 ...
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = __dirname, PAGE = process.argv[2], TIMES = process.argv.slice(3).map(Number), OUT = path.resolve('video_analysis/peek'), NAME = PAGE.replace('.html', '');
const s = http.createServer((q, r) => { const f = path.join(ROOT, q.url.split('?')[0]); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8' }); fs.createReadStream(f).pipe(r); }).listen(0, async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.log('PAGE ERROR', e.message)); p.on('console', m => m.type() === 'error' && console.log('CONSOLE', m.text()));
  await p.goto(`http://127.0.0.1:${s.address().port}/${PAGE}`); if (process.env.CAM) await p.evaluate(c => window.CAM = JSON.parse(c), process.env.CAM); if (process.env.NOSOLVE) await p.evaluate(() => window.NOSOLVE = true); await p.waitForFunction(() => window.READY, null, { timeout: 120000 });
  const files = [];
  for (const t of TIMES) { const d = await p.evaluate(t => window.drawFrame(t), t); const ext = d.startsWith('data:image/png') ? 'png' : 'jpg'; const f = path.join(OUT, `${NAME}_${t}.${ext}`); fs.writeFileSync(f, Buffer.from(d.split(',')[1], 'base64')); files.push(f); }
  execFileSync('ffmpeg', ['-y', '-v', 'error', ...files.flatMap(f => ['-i', f]), '-filter_complex', files.map((_, i) => `[${i}]`).join('') + (files.length > 1 ? `hstack=inputs=${files.length},` : `null,`) + `scale=${300 * files.length}:-1`, path.join(OUT, `${NAME}_strip.jpg`)]);
  const clip = await p.evaluate(() => window.CLIP || []); if (clip.length) console.log('clip', JSON.stringify(clip.map(r => r.map(v => +v.toFixed(3))))); await b.close(); s.close(); console.log('ok');
});
