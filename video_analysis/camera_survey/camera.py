# Camera-move survey of the 10 clay reference videos: per shot (boundaries from library/styles/world_survey/shots.json),
# estimate the frame-to-frame camera motion (zoom, pan, tilt, roll) from tracked background points (RANSAC similarity fit,
# moving characters drop out as outliers), then summarise each shot's move. Output: camera_shots.json
import cv2, json, numpy as np, re, sys
ROOT = '/home/user/innersetlog-video-engine/'
SRC = {'S05': 's_a5bd', 'S06': 's_de34', 'S07': 's_2bdf', **{f'S{n:02d}': f's{n:02d}' for n in range(8, 15)}}
census = json.load(open(ROOT + 'library/styles/world_survey/shots.json')); CUTS = json.load(open(ROOT + 'video_analysis/camera_survey/cuts.json'))
def ctype(v, t):
    for (vv, n, a, b) in census:
        if vv == v and a <= t < b: return n
    return -1
shots = [[v, ctype(v, (a + b) / 2), a, b] for v in CUTS for (a, b) in CUTS[v]['shots']]  # frame-level cuts; type from the census shot containing the midpoint
types = {}
for line in open(ROOT + 'library/styles/world_survey/census.txt'):
    m = re.match(r'(S\d\d): (.*)', line)
    if not m: continue
    for n, t in re.findall(r'(\d+) (INS|CU|MS|WS|EST|END)', re.sub(r'\[[^\]]*\]', '', m.group(2))): types[(m.group(1), int(n))] = t
W, H = 360, 640; C = np.array([W / 2, H / 2, 1.0])
out = []
for vid, src in SRC.items():
    cap = cv2.VideoCapture(ROOT + f'video_analysis/local_{src}/video.mp4'); fps = cap.get(cv2.CAP_PROP_FPS); frames = []
    while True:
        ok, f = cap.read()
        if not ok: break
        frames.append(cv2.cvtColor(cv2.resize(f, (W, H), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY))
    for (v, n, t0, t1) in [s for s in shots if s[0] == vid]:
        a, b = int(round(t0 * fps)), min(len(frames), int(round(t1 * fps)))
        per = []
        for i in range(a, b - 1):
            p0 = cv2.goodFeaturesToTrack(frames[i], 500, 0.01, 7)
            if p0 is None or len(p0) < 20: per.append(None); continue
            p1, st, _ = cv2.calcOpticalFlowPyrLK(frames[i], frames[i + 1], p0, None, winSize=(21, 21), maxLevel=3)
            g = st.ravel() == 1
            if g.sum() < 20: per.append(None); continue
            M, inl = cv2.estimateAffinePartial2D(p0[g], p1[g], method=cv2.RANSAC, ransacReprojThreshold=1.0)
            if M is None: per.append(None); continue
            s = float(np.hypot(M[0, 0], M[1, 0])); r = float(np.degrees(np.arctan2(M[1, 0], M[0, 0]))); c2 = M @ C
            per.append([s, r, float(c2[0] - C[0]), float(c2[1] - C[1]), float(inl.mean())])
        ok = [p for p in per if p and p[4] > 0.35]
        if not ok: out.append({'v': vid, 'n': n, 'type': types.get((vid, n), '?'), 't0': t0, 't1': t1, 'dur': round(t1 - t0, 2), 'ok': False}); continue
        P = np.array(ok); ls = np.log(P[:, 0]); dx, dy = P[:, 2], P[:, 3]
        zoom = float(np.exp(ls.sum())) - 1; pan = float(dx.sum() / W); tilt = float(dy.sum() / H); roll = float(P[:, 1].sum())
        speed = np.abs(ls) * 400 + np.hypot(dx / W, dy / H) * 100  # rough combined speed per frame
        moving = speed > 0.05; nf = len(P)
        q = max(1, nf // 4); ease = [float(speed[:q].mean()), float(speed[q:nf - q].mean() if nf > 2 * q else speed.mean()), float(speed[nf - q:].mean())]
        # held pairs inside the move -> does the camera move on 1s or 2s?
        run = speed[moving.argmax(): nf - moving[::-1].argmax()] if moving.any() else speed
        holds_inside = float((run < 0.02).mean()) if len(run) else 0
        jitter = float(np.std(dx - np.convolve(dx, np.ones(7) / 7, 'same')) / W * 100) if len(dx) >= 7 else 0.0
        out.append({'v': vid, 'n': n, 'type': types.get((vid, n), '?'), 't0': t0, 't1': t1, 'dur': round(t1 - t0, 2), 'ok': True, 'frames': nf,
                    'zoom_pct': round(zoom * 100, 2), 'pan_pct': round(pan * 100, 2), 'tilt_pct': round(tilt * 100, 2), 'roll_deg': round(roll, 2),
                    'moving_frac': round(float(moving.mean()), 2), 'ease': [round(e, 3) for e in ease], 'holds_inside': round(holds_inside, 2), 'jitter': round(jitter, 3),
                    'inlier': round(float(P[:, 4].mean()), 2)})
    print(vid, len([o for o in out if o['v'] == vid]), 'shots', flush=True)
json.dump(out, open(ROOT + 'video_analysis/camera_survey/camera_shots_v2.json', 'w'), indent=0)
print('done', len(out))
