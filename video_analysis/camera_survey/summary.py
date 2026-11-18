import json, collections, numpy as np, sys
D=[d for d in json.load(open('video_analysis/camera_survey/camera_shots_v2.json')) if d['type']!='END']
ok=[d for d in D if d['ok']]; print('shots', len(D), 'measured', len(ok))
def kind(d):
    z,p,t=d['zoom_pct'],d['pan_pct'],d['tilt_pct']; k=[]
    if z>=1.5: k.append('push-in')
    if z<=-1.5: k.append('pull-out')
    if abs(p)>=2: k.append('pan')
    if abs(t)>=2: k.append('tilt')
    return '+'.join(k) or ('drift' if abs(z)>=0.6 or max(abs(p),abs(t))>=0.8 else 'static')
for d in ok: d['kind']=kind(d)
c=collections.Counter(d['kind'] for d in ok); print('kinds', c.most_common(12))
lock=[d for d in ok if d['kind']=='static']; mov=[d for d in ok if d['kind'] not in ('static','drift')]; dr=[d for d in ok if d['kind']=='drift']
T=sum(d['dur'] for d in ok); print('locked %.0f%% of shots / %.0f%% of time; subtle drift %.0f%% / %.0f%%; clear move %.0f%% / %.0f%%'%(100*len(lock)/len(ok),100*sum(d['dur'] for d in lock)/T,100*len(dr)/len(ok),100*sum(d['dur'] for d in dr)/T,100*len(mov)/len(ok),100*sum(d['dur'] for d in mov)/T))
q=lambda a: [round(float(np.percentile(a,p)),2) for p in (10,50,90)] if len(a) else []
print('shot length p10/50/90', q([d['dur'] for d in ok]), 'locked', q([d['dur'] for d in lock]), 'moving', q([d['dur'] for d in mov]))
for k in ['push-in','pull-out','pan','tilt']:
    s=[d for d in mov if k in d['kind']]; key={'push-in':'zoom_pct','pull-out':'zoom_pct','pan':'pan_pct','tilt':'tilt_pct'}[k]
    print(k, len(s), 'amount %', q([abs(d[key]) for d in s]), 'rate %/s', q([abs(d[key])/d['dur'] for d in s]), 'dur', q([d['dur'] for d in s]))
print('drift amounts: zoom', q([d['zoom_pct'] for d in dr]), 'pan', q([d['pan_pct'] for d in dr]))
print('moving frac', q([d['moving_frac'] for d in mov]), 'holds inside', q([d['holds_inside'] for d in mov]), 'jitter mov', q([d['jitter'] for d in mov]))
e=[d['ease'] for d in mov if d['ease'][1]>0.01]; print('ease start/mid', q([a/b for a,b,c in e]), 'end/mid', q([c/b for a,b,c in e]))
print('by type: n locked% drift% move%')
for t in ['INS','CU','MS','WS','EST']:
    s=[d for d in ok if d['type']==t]; 
    if s: print(t, len(s), '%.0f'%(100*sum(d['kind']=='static' for d in s)/len(s)), '%.0f'%(100*sum(d['kind']=='drift' for d in s)/len(s)), '%.0f'%(100*sum(d['kind'] not in ('static','drift') for d in s)/len(s)))
print('per video: shots, cuts/10s, median len, locked%, moving%')
for v in sorted(set(d['v'] for d in ok)):
    s=[d for d in ok if d['v']==v]; dur=sum(d['dur'] for d in s)
    print(v, len(s), '%.1f'%(10*len(s)/dur), '%.2f'%np.median([d['dur'] for d in s]), '%.0f'%(100*sum(d['kind']=='static' for d in s)/len(s)), '%.0f'%(100*sum(d['kind'] not in ('static','drift') for d in s)/len(s)))
json.dump(ok, open('video_analysis/camera_survey/camera_shots_v2_classified.json','w'), indent=0)
