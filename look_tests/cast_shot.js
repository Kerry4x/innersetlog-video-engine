// Render modern_cast.html views: node look_tests/cast_shot.js out.png "who=0&view=side&cam=head&ss=1" ...pairs
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = __dirname, A = process.argv.slice(2);
const s = http.createServer((q, r) => { const f = path.join(ROOT, q.url.split('?')[0]); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8' }); fs.createReadStream(f).pipe(r); }).listen(0, async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (let i = 0; i < A.length; i += 2) { const p = await b.newPage({ viewport: { width: 1080, height: 1920 } }); p.on('pageerror', e => console.log('PAGE ERROR', e.message));
    await p.goto(`http://127.0.0.1:${s.address().port}/${process.env.PAGE || 'modern_cast.html'}?${A[i + 1]}`); await p.waitForFunction(() => window.READY, null, { timeout: 300000 });
    const d = await p.evaluate(() => window.drawFrame(0)); fs.writeFileSync(A[i], Buffer.from(d.split(',')[1], 'base64')); await p.close(); console.log('wrote', A[i]); }
  await b.close(); s.close(); });
