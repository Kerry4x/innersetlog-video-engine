# Finish an animated shot rendered by look_tests/anim.js: Lanczos downscale of the 2x frames to 1080x1920,
# then encode with the matching slice of the voiceover.
#   python3 production/finish_anim.py production/david/anim_test assets/voice/david_vo.mp3 out.mp4
import json, os, sys, subprocess, glob
from PIL import Image
D, VO, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
rep = json.load(open(os.path.join(D, 'qc.json'))); a0, a1 = rep['audio']; fps = rep['fps']
tmp = os.path.join(D, 'small'); os.makedirs(tmp, exist_ok=True); last = None
for f in sorted(glob.glob(os.path.join(D, 'frames', 'f*.png'))):
    o = os.path.join(tmp, os.path.basename(f)); st = os.stat(f)
    if last and open(f, 'rb').read() == last[1]: os.link(last[0], o) if not os.path.exists(o) else None; continue
    im = Image.open(f).convert('RGB'); im = im.resize((1080, 1920), Image.LANCZOS) if im.size != (1080, 1920) else im; im.save(o, compress_level=1); last = (o, open(f, 'rb').read())
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(fps), '-i', os.path.join(tmp, 'f%04d.png'), '-ss', str(a0), '-t', str(a1 - a0), '-i', VO,
                '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', OUT], check=True)
subprocess.run(['rm', '-rf', tmp]); print('ok', OUT, rep['frames'], 'frames,', rep['unique'], 'rendered,', len(rep['issues']), 'with issues')
