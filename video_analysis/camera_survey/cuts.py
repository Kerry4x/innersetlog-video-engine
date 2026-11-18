# Frame-level cut detection for the 10 clay videos (the earlier census merged some shots).
# A cut = a spike in frame difference AND a jump in colour histogram, well above the local motion level.
import cv2, json, numpy as np
ROOT = '/home/user/innersetlog-video-engine/'
SRC = {'S05': 's_a5bd', 'S06': 's_de34', 'S07': 's_2bdf', **{f'S{n:02d}': f's{n:02d}' for n in range(8, 15)}}
res = {}
for vid, src in SRC.items():
    cap = cv2.VideoCapture(ROOT + f'video_analysis/local_{src}/video.mp4'); fps = cap.get(cv2.CAP_PROP_FPS); small, hist = [], []
    while True:
        ok, f = cap.read()
        if not ok: break
        s = cv2.resize(f, (72, 128), interpolation=cv2.INTER_AREA); small.append(cv2.cvtColor(s, cv2.COLOR_BGR2GRAY).astype(np.float32))
        hv = cv2.cvtColor(s, cv2.COLOR_BGR2HSV); h = cv2.calcHist([hv], [0, 1], None, [24, 16], [0, 180, 0, 256]); cv2.normalize(h, h); hist.append(h)
    n = len(small); d = np.array([np.abs(small[i + 1] - small[i]).mean() for i in range(n - 1)]); hd = np.array([cv2.compareHist(hist[i], hist[i + 1], cv2.HISTCMP_BHATTACHARYYA) for i in range(n - 1)])
    cuts = []
    for i in range(n - 1):
        lo = np.median(d[max(0, i - 12):i + 12]); 
        if d[i] > max(14, 3.5 * lo) and hd[i] > 0.22 and (not cuts or i - cuts[-1] > 3): cuts.append(i)
    b = [0] + [c + 1 for c in cuts] + [n]; res[vid] = {'fps': fps, 'frames': n, 'shots': [[round(b[k] / fps, 3), round(b[k + 1] / fps, 3)] for k in range(len(b) - 1)]}
    print(vid, 'cuts', len(cuts), 'shots', len(b) - 1, 'median %.2fs' % np.median(np.diff(b) / fps))
json.dump(res, open(ROOT + 'video_analysis/camera_survey/cuts.json', 'w'))
