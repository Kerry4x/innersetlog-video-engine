# Innersetlog Master Character & Rig Specification (`docs/CHARACTER_RIG.md`)

This document is the absolute source of truth for Claude Code when rendering, rigging, and animating the **Innersetlog** stickman character. No programmatic guessing or random layout math is permitted.

---

## 1. Core Geometry & Color Palette
- **Head Shape:** Perfect circle.
- **Head Dimensions:** Oversized relative to body, maintaining roughly 1/3 of the character's total standing height.
- **Head Fill Color:** `#F7EFE2` (Warm Off-White). Never use pure white (`#FFFFFF`).
- **Head Outline Stroke:** `#111111` with a heavy weight of `18px` to `22px` (scaled dynamically with zoom/FOV).
- **Cel-Shading Shadow:** A solid offset crescent on the back-right edge of the head filled with `#DFD6C5` to create 3D depth without gradients.
- **Limbs & Torso Stroke:** `#111111` with a weight of `20px` to `26px`, utilizing `stroke-linecap: round` and `stroke-linejoin: round`. 

---

## 2. Skeletal Anchor Points & Joint Hierarchies
To prevent floating props or disjointed limbs, all stickman poses must anchor to these standard relative coordinates:
- **Root / Pelvis:** `(0, 0)` baseline anchor.
- **Spine Top (Neck Connection):** `(0, 165)` relative to pelvis.
- **Shoulders:** Fixed offset at `(-40, 140)` (Left) and `(40, 140)` (Right).
- **Elbow Joints:** Must use 2-bone Inverse Kinematics (IK) with a slight natural organic curve/bow outward (never a rigid straight line).
- **Wrists / Hands:** Terminated by solid black circles (`#111111`) with a radius matching `0.58 * limb_stroke_width`.

---

## 3. Parametric Facial Expression States
Expressions are driven by exact coordinate offsets relative to the head center `(hC.x, hC.y)`:
- **State: `content` (Default Calm / Smile)**
  - *Eyes:* Two solid black circles radius `14.5px` at `(fx - 42, fy + 6)` and `(fx + 42, fy - 3)`.
  - *Eyebrows:* Floating curved lines above eyes. Left: quadratic curve from `(fx - 62, fy - 22)` to `(fx - 26, fy - 30)`. Right: curve from `(fx + 24, fy - 40)` to `(fx + 62, fy - 32)`.
  - *Mouth:* Gentle upward smile curve spanning `(fx - 16, fy + 58)` to `(fx + 50, fy + 36)`.
- **State: `focused` (Razor Focused / Working)**
  - *Eyes:* Same radius `14.5px`.
  - *Eyebrows:* Low, flat horizontal determination lines.
  - *Mouth:* Firm, quiet horizontal line spanning `(fx - 32, fy + 52)` to `(fx + 38, fy + 48)`.
- **State: `tired` (2:00 AM Exhausted)**
  - *Eyes:* Half-closed with heavy horizontal eyelid bars covering the top half of the circles.
  - *Mouth:* Short, flat horizontal line.

---

## 4. Item Attachment & Z-Index Rules
When props (notebooks, pens, smartphones, research papers) are held in hands:
- The hand circle coordinate `(tx, ty)` dictates the anchor point of the prop.
- Props must rotate synchronously with the wrist angle vector.
- **Z-Index Layer Stack (Strict):**
  1. Background Plates (Flow room background)
  2. Midground Furniture (Desks, chairs)
  3. Character Torso & Back Limbs
  4. Character Head
  5. Foreground Limbs & Hand Props (Notebooks, pens)
  6. UI Overlays (Thought bubbles, pop-up text, research papers)
