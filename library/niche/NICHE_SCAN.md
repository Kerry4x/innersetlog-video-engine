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

---

# Scan 2 · Lesser-known recorded history + Bible / Christian content

Run 2026-11-15, same method. Raw data: [`scan2.json`](scan2.json), queries: [`pools2.json`](pools2.json).

| Pool | Median views | Breakouts | Channels | Top-3 conc. | **Animated share** | Read |
|---|---|---|---|---|---|---|
| **Forgotten true stories** | **698K** | **15** | 43 | 0.40 | **3%** | High demand, almost **nobody animates it**: documentaries, compilations, talking heads |
| Strange court cases (history) | 137K | 9 | 63 | **0.08** | 3% | Totally fragmented; a few 6–8-sub template channels starting to appear |
| Old newspaper stories | 76K | 7 | 52 | 0.26 | 1% | Noisy query; weak signal |
| Small human moments | 296K | 7 | 65 | 0.12 | 3% | Noisy query (music, science); weak signal |
| Bible stories animated | 232K | 6 | **16** | 0.48 | **97%** | **Crowded with animation** (BibleProject, many look AI-made); few channels share the space |
| **Bible stories narrated / explained** | **535K** | **12** | 45 | 0.22 | 28% | Strong; breakouts are the **dark / strange / lesser-known** side of the Bible |
| Christian & church history | 228K | **14** | 46 | 0.25 | 24% | Documentary-led; animated early-church video breaks out (637K / 53K) |
| Biblical archaeology | 747K | 3 | 34 | 0.23 | 6% | Owned by big documentary channels |
| Lost books / apocrypha | 622K | 8 | 41 | 0.18 | 51% | Hot, but already templated ("Every BANNED book… explained in N minutes" on several channels); drifts into conspiracy |
| Parables of Jesus | 192K | 9 | 37 | 0.24 | 41% | Mostly kids' content |

**Notable breakouts**
- *20 Strangest Historical Coincidences*: **5.6M / 28.3K** (Epicano) · *The Forgotten Story of the Biggest Lottery Winner Ever*: **1.6M / 10.7K**
- *The Story of Jonah* (animated): **1.2M / 13.7K** · *The Most Dangerous Man in the Bible: Benaiah*: **521K / 47.2K** (a lesser-known figure)
- *The Biblical Horrors We Ignore*: **2.1M / 74.8K** · *Every Terrifying Creature from the Bible*: **1.4M / 50.6K** · *The Untold Story of the Nephilim* (animated): **813K / 13.2K**
- *Church History: AD 33 to Present*: **4.1M / 34.5K**

**"Rick's clips":** a search found mostly Rick and Morty, plus a tutorial titled as teaching "Ricks Clip" AI animation shorts for free, i.e. that style is already being taught and copied.

## What scan 2 says

1. **The same signal on both sides: lesser-known, strange, true stories win.** History breakouts are forgotten stories and coincidences; Bible breakouts are the obscure, dark or strange parts (Benaiah, the Nephilim, biblical horrors), not the famous Sunday-school stories.
2. **Forgotten history is almost never animated (3%)** despite a 698K median, which is the clearest open lane in either scan.
3. **Animated Bible stories are crowded** (97% animated, few channels, many AI-made). The opening there is *which* stories (the obscure ones) and *how* they're told, not animation itself.
4. **Faith content has its own rules** *(note)*: an audience that cares about accuracy and respect, and an apocrypha corner that slides into conspiracy. Doable, but it needs care.

---

# Scan 3 · Life problems: plain self-help vs the Bible applied to life

Run 2026-11-15. Searched by **the problem people have**, not by a category label (per Kerry). Raw data: [`scan3.json`](scan3.json), queries: [`pools3.json`](pools3.json).

| Problem | Self-help median | Bible-angle median | Bible-angle channels | Bible-angle top-3 conc. | Bible-angle animated |
|---|---|---|---|---|---|
| Overthinking | 139K | 17K | 13 | 0.73 | 5% |
| Discipline | **610K** | 105K | 18 | 0.64 | 5% |
| Anxiety & worry | 271K | **166K** (7 breakouts) | 44 | 0.12 | 4% |
| Money & wealth | **576K** | 46K | 32 | 0.33 | 4% |
| Betrayal & letting go | 275K | **210K** (5 breakouts) | 44 | 0.14 | 2% |
| Purpose & meaning | **521K** | 155K | 38 | 0.26 | 14% (BibleProject) |
| "Bible as philosophy / wisdom" (label search) | — | **14K** | 40 | 0.49 | 10% |

**Who serves the Bible-angle side today:** pastors and church channels (Steven Furtick, Elevation, Joyce Meyer, David Jeremiah, Charles Stanley), guided prayer and "audio Bible" meditations with music, verse slideshows, and BibleProject (animated *book summaries*, not life application). **Almost no animated or story-driven content** applies the Bible to a specific modern problem (2–5%).

**Breakouts (small channel, big video):** *5 Things Jesus Said About Worry (Most People Ignore)*: **1.05M / 10.6K** · *The most beautiful message from Jesus*: **3.0M / 29K** · *Proverbs Explained: 40 Powerful Lessons*: **1.1M / 58.9K** · *What the Bible Says About People Who Feel Like They've Wasted Their Years*: **218K / 7.8K** · *Ecclesiastes' Greatest Lessons: Ancient Wisdom for Today's Life*: **271K / 4.1K**.

## What scan 3 says

1. **Self-help demand is huge** (discipline, money and purpose videos have a median of 500K–600K views).
2. **Labelling it "Bible wisdom" kills reach:** the label search has a median of just 14K. This confirms Kerry's point: lead with the problem, not the category.
3. **The Bible-applied-to-life lane is served almost entirely by sermons, prayers and verse slideshows**, rarely by storytelling or animation. Small channels that frame it as *a surprising, practical answer to a real problem* break out to 1–3M views.
4. **The opening:** take the self-help audience's exact problems ("Why you can't stop overthinking"), answer them with what the Bible actually says, and use storytelling (the Clayrified parable → "you" turn, proven in S06/S07) instead of a sermon.

---

# Spot check · "the hidden context behind a Bible verse"

Quick free search, 2026-11-15 (top 8 results per query; no subscriber pass):
- *Why the prodigal son's father ran*: one 330K video, then **a run of brand-new channels at 0–50 views with near-identical titles** ("Why the Father Ran", "the detail nobody explains", "That was a scandal"): template farming already underway.
- *Turn the other cheek, real meaning*: covered by many channels (Bishop Barron/Big Think 354K, Sam Shamoun 215K, Johnny Chang 157K, and more), mostly talking heads.
- *Eye of a needle*: covered, including myth-busting takes (Myron Golden 283K, The Hidden Scroll 38K).
- *Cultural context explained*: BibleProject (1.8M) and InspiringPhilosophy own it.

**Read:** the "what this verse really meant" angle is mid-demand and already templated. Not an open lane on its own.
