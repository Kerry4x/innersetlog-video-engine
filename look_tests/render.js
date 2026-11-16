// Render every look in scene.html to frames → MP4, plus a keyframe contact sheet.
//   node look_tests/render.js [outDir]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const OUT = path.resolve(process.argv[2] || 'video_analysis/look_tests');
const FPS = 24, DUR = 6;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto('file://' + path.resolve(__dirname, 'scene.html'));
  const looks = await p.evaluate(() => window.LOOKS);
  for (const look of looks) {
    const dir = path.join(OUT, look); fs.mkdirSync(dir, { recursive: true });
    for (let i = 0; i < FPS * DUR; i++) {
      const data = await p.evaluate(([l, t]) => { window.drawFrame(l, t); return document.getElementById('c').toDataURL('image/jpeg', 0.9); }, [look, i / FPS]);
      fs.writeFileSync(path.join(dir, `f${String(i).padStart(4, '0')}.jpg`), Buffer.from(data.split(',')[1], 'base64'));
    }
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-framerate', String(FPS), '-i', path.join(dir, 'f%04d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', path.join(OUT, `${look}.mp4`)]);
    console.log('rendered', look);
  }
  // side-by-side comparison video (each 360x640)
  const inputs = looks.flatMap(l => ['-i', path.join(OUT, `${l}.mp4`)]);
  const filter = looks.map((_, i) => `[${i}:v]scale=360:640[v${i}]`).join(';') + ';' + looks.map((_, i) => `[v${i}]`).join('') + `hstack=inputs=${looks.length}[out]`;
  execFileSync('ffmpeg', ['-y', '-v', 'error', ...inputs, '-filter_complex', filter, '-map', '[out]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22', path.join(OUT, 'comparison.mp4')]);
  // contact sheet: rows = looks, columns = t 1.0 / 3.0 / 5.5
  await p.setViewportSize({ width: 3 * 360 + 260, height: looks.length * 640 });
  const cells = looks.map(l => `<div style="display:flex;align-items:center"><div style="width:260px;color:#fff;font:28px sans-serif;padding-left:16px">${l}</div>` +
    ['0024', '0072', '0132'].map(f => `<img src="file://${path.join(OUT, l, 'f' + f + '.jpg')}" style="width:360px;height:640px">`).join('') + '</div>').join('');
  fs.writeFileSync(path.join(OUT, 'sheet.html'), `<body style="margin:0;background:#222">${cells}</body>`);
  await p.goto('file://' + path.join(OUT, 'sheet.html')); await p.waitForTimeout(500);
  await p.screenshot({ path: path.join(OUT, 'sheet.png'), fullPage: true });
  await b.close(); console.log('done', OUT);
})();
