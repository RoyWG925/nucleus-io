# Design System: The Toy-Box Dimension

## 1. Overview & Creative North Star
### Creative North Star: "The Gamified Isometric Diorama"
This design system moves beyond flat UI into a tactile, 3D interactive playground. It is inspired by the whimsical, high-contrast world of indie game design—specifically the "toy world" aesthetic where elements feel like physical objects placed on a dark, illuminated stage. 

To break the "template" look, we reject traditional 2D grids in favor of **forced perspective and glowing depth**. The UI is not a document; it is an environment. We use intentional asymmetry, "hand-drawn" callouts, and vibrant neon light-sources to guide the user’s eye through a deep, multi-layered cosmic landscape.

---

## 2. Colors & Atmospheric Lighting
The palette is built on a "Void and Glow" philosophy. The base is a deep, obsidian purple, while the interactive elements "emit" light through high-saturation neons.

### Surface Hierarchy & Nesting
*   **The Foundation:** Use `background` (#18101f) for the primary "void."
*   **The Grid:** The background should be overlaid with a 3D isometric grid pattern using `outline-variant` (#5b403e) at 30% opacity.
*   **The "No-Line" Rule:** Sectioning is never achieved with a 1px border. Use `surface-container-low` (#201828) for large zones and `surface-container-high` (#2f2737) for interactive modules.
*   **Glass & Gradient Rule:** Floating panels must use `surface-container-highest` (#3a3142) with a `backdrop-filter: blur(12px)` and a 60% opacity to mimic frosted acrylic.
*   **Signature Textures:** Interactive states should utilize a linear gradient from `primary` (#ffb3ae) to `primary-container` (#ff5352) to simulate a 3D light-wash.

---

## 3. Typography: Playful Authority
The typography bridges the gap between a high-end editorial and a quirky game interface.

*   **Display & Headlines (Epilogue):** This is our "Hero" typeface. Use `display-lg` and `headline-lg` with tight letter-spacing to create a bold, structural feel. It acts as the "architecture" of the page.
*   **Body & Titles (Plus Jakarta Sans):** A high-readability sans-serif that provides a professional counter-balance to the more expressive headers. Use `body-lg` for all instructional text.
*   **Labels & Callouts (Space Grotesk):** This is our "Technical" font. Used for `label-md` and small UI metadata, it evokes the feeling of a game's HUD (Heads-Up Display).
*   **The "Hand-Drawn" Accent:** For non-critical UI hints (e.g., "Click to Start"), use a custom hand-drawn script font to break the digital rigidity, paired with `tertiary` (#c2c1ff) neon coloring.

---

## 4. Elevation & Depth
Depth in this system is an optical illusion created through "Light Emittance" rather than physical shadows.

*   **Tonal Layering:** Instead of drop shadows, place a `surface-bright` (#3f3646) element inside a `surface-dim` (#18101f) container to create a "recessed" or "carved" look.
*   **Neon Glows (Ambient Shadows):** For floating "3D" objects, use a glow effect: `box-shadow: 0 0 20px 0px rgba(255, 179, 174, 0.4)` using the `primary` or `secondary` token. Shadows should match the color of the object, simulating light bouncing off the floor.
*   **The Ghost Border Fallback:** If a container needs more definition, use a `1.5px` border of `surface-tint` (#ffb3ae) at 15% opacity. This creates a "glass edge" rather than a hard stroke.
*   **Isometric Offsets:** Use the Spacing Scale (e.g., `spacing-2`) to offset elements vertically on hover, simulating a "hovering toy" animation.

---

## 5. Components

### Buttons (The "Game Tokens")
*   **Primary:** Solid `primary-container` (#ff5352) with `on-primary-container` (#5c0008) text. Shape: `rounded-md`. On hover, add a `primary` glow.
*   **Secondary:** `surface-container-highest` with a `Ghost Border`.
*   **Interactive Call-to-Action:** For critical paths, use the `secondary` (#ffade5) neon pink to ensure it pops against the purple void.

### Cards & Modules
*   **Forbid Dividers:** Use `spacing-8` of vertical whitespace or a transition from `surface-container-low` to `surface-container-highest` to separate content blocks.
*   **3D Transform:** Cards should have a subtle `rotateX` and `rotateY` on hover to reinforce the isometric 3D world.

### Inputs & Selection
*   **Input Fields:** `surface-container-lowest` (#130b1a) background. The cursor and focus state should use the `tertiary` (#c2c1ff) electric blue glow.
*   **Chips:** Use `rounded-full` with `secondary-container` (#831771) for active states.

### HUD Overlays (Additional Component)
*   Small, floating panels in the corners of the viewport using `glassmorphism` to show progress or navigation status, mimicking a game's interface.

---

## 6. Do's and Don'ts

### Do:
*   **Do** use the Spacing Scale `20` and `24` to create massive breathing room between major sections.
*   **Do** use `secondary` (#ffade5) and `tertiary` (#c2c1ff) for small, vibrant "accents" like glowing dots or status indicators.
*   **Do** align elements to an isometric 30-degree angle where possible in the background imagery.

### Don't:
*   **Don't** use pure `#000000` or `#FFFFFF`. Always use the tinted neutrals (`surface` and `on-surface`) to maintain the "atmospheric" purple haze.
*   **Don't** use 1px solid borders. It flattens the 3D diorama effect.
*   **Don't** use standard "Drop Shadows." Use "Outer Glows" that inherit the color of the object they belong to.
*   **Don't** crowd the interface. The "Toy-Box" aesthetic relies on the "void" (empty space) to make the objects feel precious.