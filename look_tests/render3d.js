// Render a three.js look-test page (three.js, software WebGL) to frames → MP4 + keyframe strip.
//   node look_tests/render3d.js [outDir] [page.html]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http'), { execFileSync } = require('child_process');
const OUT = path.resolve(process.argv[2] || 'video_analysis/look_tests/diorama');
const FPS = 24, ROOT = __dirname, PAGE = process.argv[3] || 'diorama.html', NAME = PAGE.replace('.html', '');

// ES modules need http, not file://
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8' }); fs.createReadStream(f).pipe(res);
}).listen(0);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.error('PAGE ERROR', e.message));
  await p.goto(`http://127.0.0.1:${server.address().port}/${PAGE}`);
  await p.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
  const DUR = await p.evaluate(() => window.DURATION || 6), STRIP = await p.evaluate(() => window.STRIP || [24, 72, 110, 140]);
  for (let i = 0; i < FPS * DUR; i++) {
    const data = await p.evaluate(t => window.drawFrame(t), i / FPS);
    fs.writeFileSync(path.join(OUT, `f${String(i).padStart(4, '0')}.jpg`), Buffer.from(data.split(',')[1], 'base64'));
    if (i % 24 === 0) console.log('frame', i);
  }
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-framerate', String(FPS), '-i', path.join(OUT, 'f%04d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', path.join(OUT, NAME + '.mp4')]);
  const ins = STRIP.flatMap(f => ['-i', path.join(OUT, `f${String(f).padStart(4, '0')}.jpg`)]);
  execFileSync('ffmpeg', ['-y', '-v', 'error', ...ins, '-filter_complex', STRIP.map((_, i) => `[${i}]`).join('') + `hstack=inputs=${STRIP.length},scale=${360 * STRIP.length}:-1`, path.join(OUT, 'strip.jpg')]);
  await b.close(); server.close(); console.log('done', OUT);
})();
