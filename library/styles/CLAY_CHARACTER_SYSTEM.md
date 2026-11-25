# The clay character system (Clayrified, S05–S14): what is constant across every character

Method: all 707 kept frames of the ten clay videos were reviewed as labelled grids (`video_analysis/clay_survey/grid_01..15.jpg`, rebuild with the script in this file's history). About 40 distinct characters: monks (S06, S07), farmer, baker, judge (S05), women (S06, S09), modern couple (S06), old man (S08), jeweller, king, guards, courtiers (S09), king/vizier/ministers in turbans (S10), Michelangelo and the city official (S11), children and the emperor (S12), the two friends and the office worker (S13), carpenter, boss, wife, apprentice (S14), and the gold/grey "metaphor" figure (S07). Proportions are estimated by eye from full-body frames, not measured with a tool.

## Constant (the design rules)
| Part | Rule | Seen in |
|---|---|---|
| **Proportions** | Adults are only **~3–3.5 heads tall**; children ~2.5. The head is the biggest single mass. Torso ≈ 1 head, legs ≈ 1–1.3 heads. | carpenter S14-0019, monks S06-0038, courtiers S10-0024, children S12-0029 |
| **Head** | Tall egg / bullet: high dome, widest at the cheeks, small rounded chin. Face takes the lower ~60%. | every character |
| **Eyes** | Big white eyeballs (diameter ≈ ⅓ of head width), set **at mid-height of the head, right against the nose bridge**, bulging forward. Small black pupils, often looking sideways. | all |
| **Lids** | Thick, soft rolls of skin-coloured clay **above and below** every eye (the lower roll reads as bags). Expression = how far the upper lid comes down. | all |
| **Nose** | The dominant feature: grows straight out of the brow between the eyes, runs down and forward, ends in a rounded bulb. Length ≈ ⅓ of the face. Ranges from long and hooked (monks, courtiers) to big and bulbous (old man S08, jeweller). | all |
| **Brows** | Thick sculpted sausages of hair colour, sitting right on top of the upper lid, angled for emotion. | all |
| **Mouth** | Small, simple line set low, far below the nose (long upper-lip area); opens as a small dark hole. | all |
| **Ears** | Medium C shapes at eye-to-nose height. | most |
| **Skin** | Terracotta family from peach to deep brown, matte, with fingerprints and tool marks. Older faces add forehead creases. | all |
| **Hair / beards** | Sculpted masses with cut grooves (curls, waves, strands); bald men keep grooved side tufts; mustaches are thick sausages; beards are one grooved mass. | S05 judge, S08 old man, S09 king, S11 Michelangelo |
| **Hands** | Large (palm about the size of the eye–nose cluster), 4 sausage fingers + thumb. Feet chunky. | S06, S08, S14 close-ups |
| **Neck / shoulders** | Short neck; shoulders often no wider than the head. | all |
| **Clothing** | Real garment construction in clay with fabric texture (knit, plaid, linen, brocade), folds, trims, sashes, collars. Identity comes from costume + headwear (chef hat, straw hat, turban, beret, crown, cap). | all |

## What varies per character
Head height (round ↔ tall egg), nose length and shape, skin tone, hair and facial hair, age marks, costume and headwear. Women and children: rounder heads, smaller noses, bigger eyes, same lids.

## Where our earlier study went wrong
- Bodies were ~4.5 heads tall and slim; theirs are ~3–3.5 and the head dominates.
- Eyes were too small and too high; theirs are big, mid-height and pressed against the nose.
- Built from 6 hand-picked frames instead of this survey.

## Second pass, 2026-11-24: side profiles, women, modern hair (all 542 shots re-read at mid-shot)
Kerry: "Why do the noses float from the side? ... the monk one had a girl so you have the resources to make them look good."
Sheets: one mid-shot frame of every shot, `scratchpad/faces` (rebuild: cuts.json shot midpoints). Key frames: S06_071, S06_085 (modern woman in profile), S06_015 (woman), S13_035, S14_039, S10_011, S09_035 (men in profile), S06_068/054, S09_035 (women from the front), S12_046, S13_042 (modern young men).

**Nose in profile (the "floating nose" fix).** In every profile the nose is ONE solid wedge. Its root sits between the eyes (the lids overlap its sides). The forehead line runs straight on into the bridge. It widens to a rounded bulb with small wings. The underside slopes back to the upper lip. It sticks out well past the eyeballs: about ⅓ of the face height, less for women. There is never a gap or a neck between nose and face.
- Our old nose was a thin capsule with a big ball on the end, so from the side it read as a ball on a stick.
- New: `noseStyle: 'wedge'` in the kit. It is built from horizontal slices that each run from inside the face out to the silhouette, so there is no gap from any angle.
- Women: `nose 0.45–0.6` plus `noseUp` (shorter, slightly upturned).
- The throne-room cast still uses the old nose until their render finishes. Switching them means re-rendering.

**Women.**
- A rounder, wider face; bigger, calmer eyes; thinner arched brows.
- A short, soft nose; a small mouth line, with lips only lightly tinted.
- Hair is the main identity: a part, then thick sculpted strands with coherent waves (S06 modern woman: a wavy bob to the shoulders; S06 village woman: sleek with a bun; S09: red rolled curls).

**Modern men.** Chunky strands swept from a side part, with tips lifting at the forehead (S12 red hoodie, S13 yellow hoodie). A smooth helmet with fine grooves reads as a toy.

**Hair rule.** Build hair from strands (`hairStyle: 'wavy' | 'swept'`: tapered, flattened clay ropes over a darker under-shell).
- Nothing in front of the ears comes below the brows.
- Strand angles take the short way round. One strand going the long way crossed the whole forehead; it was caught by measuring the lowest strand point, not by eye.

**Mouth.** A smile is the mouth line itself curving. A second curve under a straight slit reads as a worm on the chin.

**Glasses.** The arms run from the rim along the temple to the ear. A free-floating stub shows at three-quarter view.

**Sideburns.** A straight capsule beside the cheek reads as a headphone strap. Leave them off (a jaw-only short beard) or lay them flat on the face.

## Adapt, don't copy (Kerry, 2026-11-25)
"Some things are transferable over to 3d but not everything because they don't look right."
Not everything in the references carries over to our 3D clay figures. What does and doesn't:
- **Keep:** big eyes set into the face with thick lid rolls; low, thick brows; strand-built hair; clay surface; costume identity.
- **Don't copy:**
  - **The 3-head body.** In full 3D it reads stumpy. Modern cast: `legLen 0.2` (about 4 heads), a smaller head (`headScale ~0.85`), and a slightly broader chest with the shoulders tucked in.
  - **The giant nose.** Men 0.6–0.75, women about 0.46.
  - **The chinless egg jaw.** Without a beard it looks wrong. `chin: 1` sculpts a chin into the skull surface itself; a separate chin ball reads as a double chin.
- **Not buff (2026-11-25):** chest 0 (or negative for women), slimmer sleeves, shoulder balls tucked in.
- **Faces with depth:**
  - The skull profile is a smooth spline. Straight segments showed as facets.
  - `muzzle` brings the whole lower face forward and `chin` gives a rounded chin. Both are part of the skull surface, and `surf()` includes them, so every feature follows.
  - A narrow egg bottom reads as a pointy chin; the jaw stays full.
- **Bodies (2026-11-25):**
  - A soft waist and sloping shoulders, with the torso oval front to back (`scale.z 0.8`).
  - The arms grow out of the shoulder slope.
  - Sleeves are lathes of matching width with a rounded elbow. A capsule's UVs streak the knit; the lathe points must go bottom-up or the surface renders dark.
  - Knit bump map on sweaters, a ribbed hem, and slim lower lids (thick ones read as tired bags).
