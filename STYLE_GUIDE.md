# Innersetlog Visual & Character Specifications

## 1. Character Core Geometry & Palette
- **Head:** Oversized circle, fill `#F7EFE2` (Warm Off-White), stroke `#111111` (18px–22px weight).
- **Cel Shading:** Crescent shadow on the back-right of the head (`#DFD6C5`) to give 3D depth without gradients.
- **Face:** Solid black dot eyes (`#111111`), floating curved eyebrows (`6px–10px`), and a firm line mouth or gentle smile.
- **Limbs & Torso:** Heavy solid black strokes (`#111111`, 20px–26px width) with `stroke-linecap: round` and `stroke-linejoin: round`. Must use clean joint bends (no noodle-stretching).

## 2. Z-Index Layer Stacking Order
When rendering any scene, code must composite elements in this strict order:
1. **Background Layer:** The Flow-generated static room image (walls, windows, lighting).
2. **Midground Props:** Desks, chairs, equipment.
3. **The Stickman Character Rig:** Code-animated character (blinking, breathing, writing).
4. **Foreground Overlays:** Desk edges, laptops, or items sitting in front of hands.
5. **UI & Motion Graphics Overlays:** Claude's dynamic text, zoom boxes, pop-up research papers, and checkmarks.
