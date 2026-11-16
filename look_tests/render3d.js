// Render diorama.html (three.js, software WebGL) to frames → MP4 + keyframe strip.
//   node look_tests/render3d.js [outDir] [page.html]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http'), { execFileSync } = require('child_process');
const OUT = path.resolve(process.argv[2] || 'video_analysis/look_tests/diorama');
const FPS = 24, DUR = 6, ROOT = __dirname, PAGE = process.argv[3] || 'diorama.html', NAME = PAGE.replace('.html', '');

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
  for (let i = 0; i < FPS * DUR; i++) {
    const data = await p.evaluate(t => window.drawFrame(t), i / FPS);
    fs.writeFileSync(path.join(OUT, `f${String(i).padStart(4, '0')}.jpg`), Buffer.from(data.split(',')[1], 'base64'));
    if (i % 24 === 0) console.log('frame', i);
  }
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-framerate', String(FPS), '-i', path.join(OUT, 'f%04d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', path.join(OUT, NAME + '.mp4')]);
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', path.join(OUT, 'f0024.jpg'), '-i', path.join(OUT, 'f0072.jpg'), '-i', path.join(OUT, 'f0110.jpg'), '-i', path.join(OUT, 'f0140.jpg'),
    '-filter_complex', '[0][1][2][3]hstack=inputs=4,scale=1440:-1', path.join(OUT, 'strip.jpg')]);
  await b.close(); server.close(); console.log('done', OUT);
})();
