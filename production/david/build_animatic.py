# David & Nathan animatic: shot list + stills + word-timed captions + the voiceover, at full 1080x1920.
# Stills: production/david/stills/<key>_2x.png (2160x3840 supersampled renders), downscaled here with Lanczos.
import json, os, subprocess, textwrap, sys
from PIL import Image, ImageDraw, ImageFont
R = 'production/david/'; shots = json.load(open(R + 'shotlist.json')); W = json.load(open('assets/voice/david_vo_words.json'))
OUT = '/tmp/david_frames'; os.makedirs(OUT, exist_ok=True)
FW, FH, FPS = 1080, 1920, 24; VER = sys.argv[1] if len(sys.argv) > 1 else 'v2'
fb = ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf', 80)
fs = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 40)
chunks, cur = [], []
for w in W:
    cur.append(w)
    if w[2].strip()[-1:] in '.,?!' or len(cur) >= 4: chunks.append(cur); cur = []
if cur: chunks.append(cur)
caps = [(c[0][0], c[-1][1], ' '.join(x[2].strip() for x in c)) for c in chunks]
cache = {}
def still(key, label):
    if key and os.path.exists(R + f'stills/{key}_2x.png'):
        if key not in cache: cache[key] = Image.open(R + f'stills/{key}_2x.png').convert('RGB').resize((FW, FH), Image.LANCZOS)
        return cache[key].copy()
    im = Image.new('RGB', (FW, FH), '#2a1d15'); d = ImageDraw.Draw(im); d.rectangle([60, 660, FW - 60, 1260], outline='#c9a27a', width=5); y = 720
    for ln in ['NOT BUILT YET', ''] + textwrap.wrap(label, 34): d.text((100, y), ln, fill='#f0dcc0', font=fs); y += 62
    return im
n = int(shots[-1][1] * FPS); last = None
for i in range(n):
    t = i / FPS; s = ([s for s in shots if s[0] <= t < s[1]] or [shots[-1]])[0]
    c = [c for c in caps if c[0] - 0.05 <= t <= c[1] + 0.15]; txt = c[-1][2] if c else ''
    k = (s[2], s[3], txt); f = f'{OUT}/f{i:05d}.png'
    if k == last: os.link(f'{OUT}/f{i-1:05d}.png', f) if not os.path.exists(f) else None; continue
    last = k; im = still(s[2], s[3]); d = ImageDraw.Draw(im); d.text((20, 20), s[3][:46], fill='#ffe07a', font=fs, stroke_width=3, stroke_fill='#1a100a')
    if txt:
        parts = textwrap.wrap(txt, 18) if d.textlength(txt, font=fb) > FW - 80 else [txt]; y = 1520
        for p in parts: tw = d.textlength(p, font=fb); d.text(((FW - tw) / 2, y), p, font=fb, fill='#fbefd9', stroke_width=8, stroke_fill='#1a100a'); y += 96
    if os.path.exists(f): os.remove(f)
    im.save(f, compress_level=1)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(FPS), '-i', f'{OUT}/f%05d.png', '-i', 'assets/voice/david_vo.mp3', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', R + f'david_animatic_{VER}.mp4'], check=True)
subprocess.run(['rm', '-rf', OUT]); print('ok', n)
