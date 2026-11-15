#!/usr/bin/env python3
"""
Free niche saturation scan (no vidIQ credits): YouTube search + channel pages via yt-dlp.

For each topic pool:
  - relevance search (top N): views, channel
  - recency search (newest N): how many recent uploads exist (supply pressure)
  - each unique channel's subscriber count (channel /videos tab, flat)
Then per pool:
  demand      = median views of relevance results
  breakouts   = results whose channel has < 100k subs but the video has views >= 10x subs
  concentration = share of top results owned by the top 3 channels (low = open field)
  animated    = share of titles/channels that look animated (keyword heuristic)

    python3 library/_tools/niche_scan.py pools.json out.json
pools.json: {"pool name": ["query 1", "query 2", ...], ...}
NOTE: the recency half ("ytsearchdate") is not supported by the installed yt-dlp and
returns nothing; recency fields are 0. Use the small-channel flood signal instead.
"""
import json, re, subprocess, sys, statistics, time
from concurrent.futures import ThreadPoolExecutor

N_REL, N_NEW = 25, 25
ANIM = re.compile(r"animat|cartoon|2d|3d|story ?time|illustrated|explained|stick", re.I)


def ytsearch(prefix, q, n):
    cmd = ["yt-dlp", "--flat-playlist", "--print",
           "%(id)s\t%(view_count)s\t%(channel_id)s\t%(channel)s\t%(duration)s\t%(title)s",
           f"{prefix}{n}:{q}"]
    out = subprocess.run(cmd, capture_output=True, text=True, timeout=180).stdout
    rows = []
    for line in out.splitlines():
        p = line.split("\t")
        if len(p) < 6:
            continue
        vid, views, cid, ch, dur, title = p[:6]
        rows.append({"id": vid, "views": int(views) if views.isdigit() else None, "channel_id": cid,
                     "channel": ch, "duration": float(dur) if re.match(r"^[\d.]+$", dur) else None, "title": title})
    return rows


_subs = {}


def subs(cid):
    if cid in _subs:
        return _subs[cid]
    cmd = ["yt-dlp", "--flat-playlist", "-I", "1", "--print", "playlist:%(channel_follower_count)s",
           f"https://www.youtube.com/channel/{cid}/videos"]
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=90).stdout.strip().splitlines()
        v = int(out[-1]) if out and out[-1].isdigit() else None
    except Exception:
        v = None
    _subs[cid] = v
    return v


def scan(pools):
    result = {}
    for pool, queries in pools.items():
        rel, new = [], []
        for q in queries:
            rel += ytsearch("ytsearch", q, N_REL)
            new += ytsearch("ytsearchdate", q, N_NEW)
            time.sleep(1)
        seen = set()
        rel = [r for r in rel if not (r["id"] in seen or seen.add(r["id"]))]
        cids = {r["channel_id"] for r in rel + new if r["channel_id"] and r["channel_id"] != "NA"}
        with ThreadPoolExecutor(6) as ex:
            list(ex.map(subs, cids))
        for r in rel + new:
            r["subs"] = _subs.get(r["channel_id"])
        views = [r["views"] for r in rel if r["views"]]
        breakouts = [r for r in rel if r["views"] and r["subs"] and r["subs"] < 100_000 and r["views"] >= 10 * r["subs"]]
        by_ch = {}
        for r in rel:
            by_ch[r["channel"]] = by_ch.get(r["channel"], 0) + 1
        top3 = sum(sorted(by_ch.values(), reverse=True)[:3]) / max(1, len(rel))
        anim = sum(1 for r in rel if ANIM.search(r["title"] + " " + (r["channel"] or ""))) / max(1, len(rel))
        new_views = [r["views"] for r in new if r["views"] is not None]
        result[pool] = {
            "queries": queries,
            "n_results": len(rel),
            "median_views": int(statistics.median(views)) if views else 0,
            "p75_views": int(statistics.quantiles(views, n=4)[2]) if len(views) >= 4 else None,
            "distinct_channels": len(by_ch),
            "top3_concentration": round(top3, 2),
            "animated_share": round(anim, 2),
            "breakouts": len(breakouts),
            "breakout_examples": sorted(({"title": b["title"], "channel": b["channel"], "views": b["views"], "subs": b["subs"]} for b in breakouts), key=lambda b: -b["views"])[:5],
            "recent_uploads_median_views": int(statistics.median(new_views)) if new_views else 0,
            "recent_distinct_channels": len({r["channel"] for r in new}),
            "top_results": sorted(({"title": r["title"], "channel": r["channel"], "views": r["views"], "subs": r["subs"]} for r in rel if r["views"]), key=lambda r: -r["views"])[:8],
        }
        print(f"{pool:<34} median {result[pool]['median_views']:>10,}  breakouts {len(breakouts):>2}  channels {len(by_ch):>3}  top3 {top3:.2f}  anim {anim:.2f}", flush=True)
    return result


if __name__ == "__main__":
    pools = json.load(open(sys.argv[1]))
    json.dump(scan(pools), open(sys.argv[2], "w"), indent=2)
