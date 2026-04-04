# NUCLEUS.IO — Interactive 3D Developer Portfolio

> *An immersive, flyable universe built with Three.js — pilot a spaceship through neon physics, collect project orbs, and squash bugs in the void.*

[![Three.js](https://img.shields.io/badge/Three.js-v0.160.0-black?logo=three.js)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-dev%20server-646cff?logo=vite)](https://vitejs.dev/)
[![Vanilla JS](https://img.shields.io/badge/ES%20Modules-Vanilla%20JS-f7df1e?logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Solo Project](https://img.shields.io/badge/Solo%20Project-✓-brightgreen)](.)

**→ [Live Demo](https://nucleus-829pux5y7-roywangs-projects-28832da8.vercel.app/)**

---

## What Is This?

This is my developer portfolio — but instead of a scroll-and-read webpage, it's a **flyable 3D universe**. You pilot a spaceship, fly into glowing project orbs to view my work, collide with neon text, and push memory-leak cubes into a garbage collector ring.

Built entirely solo with **Three.js + Vanilla JS** over several weeks of iteration. No game engine — custom physics, audio engine, and VFX pipeline from scratch.

**Aesthetic:** "Toy-Box Void" — hyper-saturated neon objects floating in deep-space darkness, like developer tools reimagined as toys.

---

## Controls

| Key | Action |
|-----|--------|
| `W / A / S / D` | Fly forward / strafe |
| `Shift` | Ascend |
| `Ctrl` | Descend |
| `Space` | Boost |
| `R` | Reset scene |
| Mouse | Aim / look (Pointer Lock) |

---

## Technical Highlights

### Post-Processing Pipeline
```
RenderPass → UnrealBloomPass → VignetteShader → ChromaAberrationShader → FilmGrainShader → OutputPass
```
Custom GLSL shaders for cinematic neon glows, lens aberration, and film grain — all running in real-time.

### Module Architecture
```
app.js          ← Main orchestrator & game loop
scene.js        ← Three.js scene, lighting, post-processing
ship.js         ← Spaceship geometry, flight physics, camera follow
vfx.js          ← Environment VFX (starfields, nebulae, explosions, particles)
mechanics.js    ← Game mechanics (Project Orbs, GC, Space Bugs)
physics.js      ← Neon text collision detection & physics update
audio.js        ← Procedural Web Audio API sound engine
input.js        ← Keyboard/mouse input (Pointer Lock API)
ui.js           ← HUD, panels, tooltips
constants.js    ← Global config (colors, physics values, project data)
```

### Environment Layers
| Layer | Description |
|-------|-------------|
| Starfield | Multi-layer parallax star field (warm white / cold blue / pink) |
| Nebulae | Volumetric purple/midnight-blue cloud formations |
| Cosmic Dust | Floating purple particle ambient layer |
| Galaxy Silhouettes | Distant spiral galaxy outlines for depth |
| Grid Floor | Glowing isometric purple grid plane |
| Nebula Rings | Large cosmic ring structures (macro depth) |
| Light Pillars | Vertical light beams as spatial anchors |

### Lighting System (3-Point + Atmosphere)
| Light | Type | Color | Purpose |
|-------|------|-------|---------|
| Key Light | Directional | Warm Pink `#ffd0e8` | Main subject illumination |
| Fill | Ambient | Deep Purple `#221144` | Base environment fill |
| Rim | Directional | Violet `#8855cc` | Silhouette / depth separation |
| Far Accent | Point | Orange `#ff9966` | Distant star warmth |
| Cold Accent | Point | Ice Blue `#4488ff` | Opposing cool tone |
| Hemisphere | Hemisphere | Sky↔Ground gradient | Atmospheric ambience |

---

## Interactive Game Mechanics

### 🔮 Project Orbs
12 glass orbs scattered across the void, each representing a real project. Fly into one to trigger a particle explosion and reveal its project detail panel. Collect all 12 for a fireworks celebration.

### 🗑️ Garbage Collector
"Memory Leak Cubes" float in the scene. Push them into the purple GC ring to trigger a "memory freed" effect. A small tribute to every developer's nemesis.

### 🐛 Space Bugs
6 green polyhedra orbiting the center. Fly through them to trigger "Bug resolved" dissolve animations. Because debugging never ends.

### 🔠 Neon Physics Text
3D text rendered with Helvetiker Bold. Collide with it and watch it scatter from the impact force. Toggle gravity mode for slow-drift chaos.

---

## Running Locally

**Requirements:** Node.js 18+, any modern browser with WebGL2 support

```bash
# Recommended: Vite dev server (handles ES module CORS)
npx -y vite --port 3000

# Or any static server
npx serve .
```

> ⚠️ Must be served via HTTP — `file://` will fail due to font loader CORS requirements.

---

## Stack

| Package | Version | Purpose |
|---------|---------|---------|
| `three` | `^0.160.0` | 3D rendering engine |
| `vite` *(dev)* | latest | Dev server & ES module bundling |

Three.js addons (EffectComposer, FontLoader, etc.) loaded via CDN importmap — zero local setup needed.

---

*© 2024 Roy Wang — NUCLEUS.IO / DIMENSION_SHIFT. All rights reserved.*
