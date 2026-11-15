# Niche saturation scan · 12 topic pools (free, no vidIQ credits)

Run 2026-11-15 with `library/_tools/niche_scan.py` (yt-dlp YouTube search + channel pages). Raw data: [`scan.json`](scan.json), queries: [`pools.json`](pools.json).

**What each number means**
- **Median views:** median of the top ~25 relevance results per query. This is demand, but heavily skewed by giants and kids' content.
- **Breakouts:** results from channels under 100k subscribers whose video has **≥10× the channel's subscriber count** in views. These are small channels winning with a topic, i.e. *open space*.
- **Top-3 concentration:** share of all results owned by the 3 biggest channels in that pool. High means a few incumbents own the topic.
- **Limits:** search results include noise (kids' cartoons, music videos, film shorts). The recency half of the scan failed (unsupported search mode), so there's no "how many uploaded this month" figure. Treat this as a directional scan, not a verdict.

## Results

| Pool | Median views | Breakouts | Distinct channels | Top-3 concentration | Read |
|---|---|---|---|---|---|
| **Folk tales, fables & parables** | 148K | **25** (most) | 46 | 0.27 | **Open & proven:** small channels break out across many sub-genres |
| **Dark / original fairy tales** | 111K | **19** | 42 | **0.16** | **Open:** no one owns it |
| **True survival stories** | 37K | **20** | 63 | **0.12** | Open, but the T1 tutorial is teaching people this exact niche now |
| Never want to meet (creatures) | 584K | 16 | 61 | 0.13 | Demand is real, but Depth Theory's template will be copied |
| What would it feel like | 78K | 13 | 68 | 0.08 | Fragmented, noisy results; idea exists but isn't a clear lane |
| Myths & legends | **1.07M** | 7 | 38 | 0.38 | Huge demand, but TED-Ed owns the top; 2nd-person "What if you were…" myth videos are already appearing (e.g. 719K views on a 17K channel) |
| Unsolved mysteries | 438K | 7 | 38 | 0.19 | Dominated by documentary-style giants; animated is a minority |
| Would you survive (history) | 61K | 7 | 57 | 0.21 | **Flooded:** many breakouts are 2–4-subscriber brand-new channels with ~100–400 views (template farms) |
| Life of a ___ (history) | 23 (!) | 1 | 26 | 0.69 | **Flooded + owned:** a median of 23 views means dozens of brand-new channels posting the same titles; Simple History owns the top |
| Bizarre history events | 4.26M | 1 | 12 | **0.77** | Owned by OverSimplified/Kurzgesagt; very hard to enter |
| Thought experiments & paradoxes | 413K | 4 | 20 | 0.66 | Owned by Vsauce/Kurzgesagt/TED-Ed |
| Ancient tech & lost knowledge | 67 (!) | 7 | 44 | 0.11 | **Flooded** by tiny template channels |

## Notable breakouts (small channel, big video)

- Folk tales: *How Tiger Got His Stripes*: **3.6M views / 28.6K subs** (Story Cove) · African folktale comedies: **685K / 15.5K**, **662K / 22.5K** · *8 Skinwalker Stories Animated*: **660K / 13.7K**
- Dark fairy tales: Disney movies' dark origins explained: **2.3M / 86.5K**
- True survival: *They Were Left On An Island For 15 Years: True Survival Story*: **3.1M / 9.2K** (Atlas One)
- Creatures: *Why You'd Never Want To Meet A Sperm Whale*: **8.5M / 28.2K** (Depth Theory; next uploads in the same format: 31K, 210K, 35K)
- Myths: *What If You Were the Only Man on an Island of 100 Amazons?*: **719K / 17.4K**

## What this says

1. **The templates we analyzed are already being farmed.** "Would you survive ___" and "Life of a ___" are full of brand-new 2–8-subscriber channels posting near-identical titles and getting double- or triple-digit views. That's the copy wave Kerry described, in the data.
2. **Big-concept explainer lanes are owned** (bizarre history, paradoxes, mythology top results): too many incumbents to beat on search.
3. **Folklore is the widest open, proven lane:** the most breakouts, low concentration, and breakouts in *different* sub-genres (kids' fables, African folktale comedy, Navajo-inspired horror, Clayrified's parables). Demand exists in many directions at once, and no single channel or template owns "world folklore".
4. **Regional folklore is an underserved angle** *(inference from the breakouts)*: African folktale comedy, Filipino mysteries and Skinwalker horror all break out on small channels. A channel that covers **the world's folklore systematically, region by region**, has a supply of tens of thousands of stories and no dominant owner.
