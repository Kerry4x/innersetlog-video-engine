# The clay world: sets, and how characters touch them (S05–S14)

Source: the same 707-frame survey of all ten clay videos (`video_analysis/clay_survey/grid_01..15.jpg`); frame ids below are video-frame (e.g. S13-0011). Qualitative, by eye; no counts claimed.

## How the sets are built
- **Miniature dioramas, fully dressed.** Every room is packed with handmade props at hand scale: shelves of pottery (S09-0008), bread and scales (S05), lanterns, cups and dishes (S13-0011), blueprints and a clock (S14-0012), tiled floors (S07, S10), carved wood walls (S10).
- **Everything is clay or a craft material** (clay, wood, fabric, paper, glass), with the same thumbprint surface as the characters; no flat CG surfaces.
- **Practical light is part of the set:** lanterns and lamps glow inside the frame (S13-0011, S09-0008), windows throw beams (S05-0009), night scenes go deep blue with warm points (S13-0023).
- **Mood = colour of the whole set:** warm amber for stories, cool blue for night or fear (S11-0025, S13-0063), bright flat pastel for the modern "you" section (S06-0082, S10-0041).
- **Exteriors are model villages:** small houses, roads and fields with a sky backdrop (S06-0005, S12-0010, S14-0009); crowds are many small characters lined up (S10-0017, S12-0013).
- **Depth:** a blurred prop or shoulder in the foreground of most medium shots; shallow focus everywhere.

## How characters interact with the world
| Interaction | What it looks like | Examples |
|---|---|---|
| **Sitting** | on cushions at low tables (cross-legged/kneeling), on chairs, on thrones; the body really bends at the hips, hands rest on the table or knees | S06-0050, S13-0011, S14-0015, S09-0024 |
| **Lying** | in bed under a real blanket, head on a pillow | S13-0023..0031 |
| **Holding** | cups with both hands at the chest, pots hugged to the belly, a key in an open palm, tools in a fist; props are slightly oversized so the action reads | S13-0013, S12-0029, S14-0053, S11-0032 |
| **Hands on surfaces** | flat on a table, pressing into soil, on a door frame; fingers spread, contact shadow under the hand | S06-0119, S12-0003, S14-0037 |
| **Object inserts** | a macro shot of just hands + object opens most stories | S09-0001, S10-0001, S13-0002, S14-0001 |
| **Walking** | through doors, along roads, up steps; mostly in wide or medium-wide shots | S06-0005, S12-0022, S14-0037 |
| **Kneeling / bending** | kneel to look at something on the floor | S10-0019, S10-0028 |
| **Grounding** | every character casts a soft contact shadow; feet sit on the floor, never float | all |

## What this means for our build
1. **Sets first, then actors.** Build each location as a dressed miniature with props at hand scale and practical lights.
2. **Our character kit needs: sitting (robe bends at the hips, knees), holding (prop parented to the hand), hands resting on surfaces.** The collision system now extends to props and furniture: hands rest ON tables, bodies sit ON seats.
3. **Shot list per scene:** one establishing wide of the set, medium shots for interaction, close-ups for faces, macro inserts for hands + objects.
4. Our world reference (`concepts/bible/world/JERUSALEM_c1000BC.md`) decides WHAT is in the set; this file decides HOW it is built and staged.
