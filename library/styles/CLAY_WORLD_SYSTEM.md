# The clay world: sets, scale, shots and interaction (S05–S14, dedicated pass)

**Method (2026-11-16):** a dedicated world pass over all ten clay videos.
1. **Shot census:** every shot, cut to cut, one mid-shot frame each (488 shots; 472 story shots + 16 end cards), each classified by shot type and annotated with set and interaction. Raw data: `video_analysis/world_survey/census.txt`, sheets `shots_01..11.jpg`, shot list `shots.json`.
2. **Scale:** a pixel ruler on full-resolution frames where characters stand or sit next to doors, tables and steps (`scale.txt`, `scale_ruler.jpg`).
3. **Interactions at 24 fps:** six action shots read frame by frame (`act_*.jpg`).
Classification and measurements are by eye on the frames; treat counts as ±a few shots and measurements as ±10 px.

This replaces the first-pass version of this file.

## 1. Shot grammar (472 story shots)
| Type | Count | Share | What it is |
|---|---|---|---|
| **Insert (INS)** | 149 | 32% | hands + object, feet, a prop, a detail (cup, ring, chalk, nail, key) |
| **Medium (MS)** | 146 | 31% | waist/chest up, one to three characters, usually doing something with their hands |
| **Face close-up (CU)** | 70 | 15% | face fills the frame; reactions and lines |
| **Full figure in the set (WS)** | 68 | 14% | whole body in the room: sitting at the table, walking through a door |
| **Establishing (EST)** | 39 | 8% | the location with small or no figures: the village, the hall, the courtyard, the house in the rain |

Per video, the insert share runs from about 20% (S09) to 47% (S06, S07). **Almost half of every film is hands, objects and faces; only 1 shot in 12 is a wide establishing view.** Most videos open on an insert of the story object (S05 butter, S09 ring, S10 chalk, S12 seed, S13 wine, S14 nail).

## 2. Scale (pixel ruler)
| Measure | Result | Frame |
|---|---|---|
| Door opening vs standing adult | door ≈ **1.3×** character height | S14#26 |
| Low table vs person seated on a floor cushion | table top ≈ **0.4–0.55×** seated height (elbow to mid-chest) | S06#30, S13#6 |
| Cup vs head | cup ≈ **¼ of head height**; held with both hands it covers the chin | S06#30, S13#3 |
| Table lantern | ≈ **1 head** tall | S13#6 |
| Step | ≈ **0.1×** character height | S09#12 |

Because characters are ~3–3.5 heads tall, everything is scaled to the **head**: props look slightly oversized next to the body so actions read. Doors are low (1.3×), tables are low, seats are cushions.

## 3. How sets are built
- **Dressed miniatures:** shelves of pots (S09 workshop), loaves (S05 bakery), scales, lanterns, dishes, a hunting bow on the wall (S13), clock and certificates (S14 office), tiled floors (S07, S10, S12).
- **Craft materials only:** clay, carved wood, woven fabric, paper; nothing flat or plastic.
- **Practical light inside the frame:** lanterns and candles on tables (S09, S13), a lamp on the bedside (S06), moonlit windows (S06, S08, S13). Night = deep blue room + one warm practical.
- **Colour sets the world:** warm amber for the story, flat bright pastel for the modern "you" section (S06 kitchen, S10 office, S12 street), grey sky for decline (S14).
- **Exteriors:** model villages and courtyards seen from above (S06#26, S07#4, S12#4), a lone house in the rain (S14#40).
- **Crowds:** many small figures lined up (S10 court, S12 children); 12 annotated crowd shots.
- **Foreground depth:** a blurred shoulder, door edge or prop in front of most medium shots.

## 4. How characters interact (annotated across the census)
| Interaction | Annotated shots | Typical staging |
|---|---|---|
| Holding an object | 75 | two hands around a cup at the chest; pot hugged to the belly; key on an open palm; tools in a fist |
| Seated | 46 | cross-legged on floor cushions at a low table; at desks; on stools, benches, rocks, deck chairs, couches |
| Hand on a surface | 23 | palm flat on the table, finger pressing soil, hand on a statue or a door |
| Doors and windows | 20 | walking through a doorway, a face framed by a window |
| Walking | 20 | mostly in WS/EST, rarely in close shots |
| Kneeling / bending | 13 | kneel to look at the floor or set something down |
| Lying | 6 | in bed under a blanket, head on a pillow |

## 5. Interaction timing at 24 fps (frame counts)
| Action | What happens, frame by frame | Frames | Source |
|---|---|---|---|
| **Walk through a door** | the door swings open over ~6 frames; he steps through in ~10; then a **hold**; a gesture rises in ~4 frames and **holds 14+** | open 6 · step 10 · gesture 4 · hold 14+ | S14#25 |
| **Raise a cup** | the cup lifts from the table in ~6 frames, eases into position, then **holds 20 frames** (wine runs down the side as the only motion) | lift 6 · hold 20 | S13#3 |
| **Reach up to a wall** | the arm reaches up over ~25 frames, takes the bow down over ~15, then the camera **cuts** to the empty wall and holds | reach 25 · take 15 · cut | S13#34 |
| **Kneel with an object** | he turns and lowers to the knees over ~14 frames, sets the pot down, then **holds** | kneel 14 · hold 10 | S12#16 |
| **Pick up and carry** | the lift happens **between** shots: the next shot already shows her held; carrying = walking with a held pose; feet shown in a separate insert | — | S06#12 |
| **Sit up in bed** | the pose changes, then holds with one hand on the stomach | ~10 · hold | S13#19 |

**Pattern:** each interaction is **one move, then a long hold**, and anything hard (lifting a person, the moment of contact) is **hidden by a cut**: the next shot starts in the new state.

## 6. Rules for our build
1. **Plan shots in their proportions:** about ⅓ inserts, ⅓ medium, ⅙ face close-ups, ⅙ full-figure; an establishing shot only when the location changes. Open on an insert of the story's object.
2. **Scale sets to the characters:** doors 1.3× height, low tables at mid-chest of a seated figure, cups a quarter of a head, a lantern one head.
3. **Dress every set** with hand-scale props and one practical light, in clay/wood/fabric/paper.
4. **Interactions:** one move (4–25 frames), then hold; cut around difficult contact (lifting, handing over) instead of animating it.
5. **Our kit needs, in order of use:** holding (prop attached to a hand, both-hands grip), seated (cross-legged on a cushion, on a chair or throne), hand flat on a surface, walk through a door, kneel. The collision system covers furniture and props.
6. What goes **in** a set comes from our research (`concepts/bible/world/JERUSALEM_c1000BC.md`); **how** it is built and shot comes from this file.

## 7. How far to trust this reference (Kerry, 2026-11-16)
The clay videos are AI-generated. They stay our main guide, with these filters:
- **Rely on:** shot grammar and editing, script formula and pacing, design rules seen across many characters/videos, set scale and staging. These are the creator's deliberate choices or are consistent library-wide.
- **Use with judgment:** motion timing (may partly reflect the video model), fine textures richer than real clay; tune by eye, not as law.
- **Ignore:** AI mistakes (gibberish screen text, wrong numbers on charts, visuals that don't match the narration, props that change between shots, wrong finger counts, melting objects) and anything seen only once. A rule must appear in several videos before we adopt it.
- **Our advantage:** code-built characters and sets stay consistent shot to shot and avoid these mistakes.
