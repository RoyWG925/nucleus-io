# NUCLEUS.IO portfolio audit baseline

This reference records the defect inventory for NUCLEUS.IO across desktop and coarse-pointer viewports at the `NUC-1` baseline. Every entry cites the module path and line range where the behavior originates.

## P0 defects

### Missing project preview assets (`assets/preview-*.png`)

- **Paths.** `constants.js` lines 78, 90, 102, 115, and 127. `mechanics.js` lines 407 to 415. `style.css` lines 274 to 280.
- **Symptom.** Every `PROJECT_ORBS` entry sets `preview` to `assets/preview-chewsy.png`, `assets/preview-tminus.png`, `assets/preview-gridreactor.png`, or `assets/preview-bert.png`. The repository contains no `assets/` directory. `showProjectPanel` in `mechanics.js` assigns `previewImg.src = data.preview` and `previewImg.style.display = 'block'` without an `onerror` fallback, leaving a 210px broken image header at the top of `#project-panel`.

### Simultaneous overlay stacking and unwired `PLAYGROUND` link

- **Paths.** `index.html` lines 27 to 32. `ui.js` lines 56 to 60, 89 to 94, 101 to 107, and 165 to 173. `style.css` lines 242 to 253, 442 to 454, 498 to 510, 557 to 569, 626 to 639, and 759 to 766.
- **Symptom.** `setupUI` in `ui.js` toggles `.hidden` independently on `#settings-panel`, `#info-overlay`, `#archive-overlay`, and `#project-nav-overlay`. Opening more than one overlay stacks them on screen. `#project-nav-overlay` and `#archive-overlay` share `top: 80px; left: 32px; z-index: 70` on desktop, and all three portfolio overlays share `top: 90px; left: 16px; right: 16px; z-index: 70` on mobile viewports under `768px`. Clicking `a.nav-link[data-view="playground"]` has no event listener in `ui.js`, does not close open overlays, and never updates `.nav-link.active`.

### Hangar `data-ship` attribute mismatch against `setShipVariant`

- **Paths.** `index.html` lines 51 to 63. `ui.js` lines 129 to 135. `ship.js` lines 140 to 163 and line 204.
- **Symptom.** The Hangar buttons in `index.html` declare `data-ship="default"`, `data-ship="stealth"`, and `data-ship="heavy"`. `setupUI` in `ui.js` passes `btn.dataset.ship` directly to `setShipVariant(type)` in `ship.js`. `populateShipGroup(type)` switches on `'phantom'` and `'titan'` and falls back to `buildViper` in `default:`. Clicking **PHANTOM** or **TITAN** always builds the Viper mesh and never applies the `'phantom'` (`1.25`) or `'titan'` (`0.7`) speed multipliers in `updateShip`.

### Master volume slider throws `TypeError` on `audio.bgm`

- **Paths.** `ui.js` lines 67 to 71. `audio.js` lines 6 to 58.
- **Symptom.** The `#volume-slider` `input` listener in `ui.js` writes `audio.bgm.volume = val * 0.5`. `AudioEngine` in `audio.js` exposes `this.masterGain`, `this.musicGain`, and `this.sfxGain`, and never defines `this.bgm`. Moving `#volume-slider` throws an uncaught `TypeError: Cannot set properties of undefined (setting 'volume')`.

### Incomplete `Escape` key dismissal

- **Paths.** `ui.js` lines 149 to 158.
- **Symptom.** The `keydown` listener for `Escape` in `ui.js` closes only `#project-panel` and `#project-nav-overlay`. Pressing `Escape` leaves `#info-overlay`, `#archive-overlay`, `#settings-panel`, and `#dev-terminal` open.

### Quality tiers leave `chromaPass`, `warpPass`, VFX layers, and `MeshPhysicalMaterial` active on Low

- **Paths.** `scene.js` lines 107 to 146, 186 to 218, 257 to 276, and 294 to 305. `mechanics.js` lines 153 to 168. `text.js` lines 101 to 111. `vfx.js` lines 33 to 991.
- **Symptom.** `updateRenderQuality` in `scene.js` toggles only `renderer.setPixelRatio`, `bloomPass.enabled`, and `filmGrainPass.enabled`. `vignettePass`, `chromaPass` (`ChromaAberrationShader`), and `warpPass` (`WarpSpeedShader`, which runs a 12-sample texture loop per fragment every frame even when `uSpeed <= 60.0`) remain enabled on `medium` and `low`. `updateRenderQuality` does not call `composer.setPixelRatio`, leaving `EffectComposer` render targets at the initial pixel ratio until a window resize calls `composer.setSize`. On `low`, `mechanics.js` keeps 5 transmissive `MeshPhysicalMaterial` orb shells (`transmission: 0.6`, `clearcoat: 1.0`, `DoubleSide`) and `text.js` keeps 7 clearcoat `MeshPhysicalMaterial` letter meshes alongside 25 to 27 real-time lights and all 11 additive VFX layers in `vfx.js`.

## P1 defects

### Node 24 and Vite 5.4 dependency optimizer crash on `npm run dev`

- **Paths.** `package.json` lines 5 to 19. `vite.config.js` lines 1 to 5. `index.html` lines 236 to 243.
- **Symptom.** Under Node 24 (`v24.14.0`) with Vite 5.4, starting `npm run dev` reaches server ready and then crashes during dependency optimization with `TypeError: Cannot read properties of undefined (reading 'imports')`. `npm run build` and `npm run preview` succeed with `vite.config.js` resolving `fs.realpathSync(process.cwd())` across the Windows directory junction. Use `npm run build` plus `npm run preview` on Node 24, or run `npm run dev` under Node 20 LTS.

### Zero flight inertia per frame

- **Paths.** `ship.js` lines 203 to 233. `CLAUDE.md` line 79. `docs/PROJECT.md` line 122.
- **Symptom.** `updateShip` in `ship.js` calls `shipVelocity.set(0, 0, 0)` on line 213 every frame before adding directional thrust. Releasing movement keys halts the ship in a single frame with no acceleration or coasting damping.

### Frame-rate-dependent camera follow and screen shake

- **Paths.** `ship.js` lines 259 to 282. `constants.js` line 59.
- **Symptom.** `updateCamera` in `ship.js` interpolates `camera.position` and `LOOK_TARGET` with fixed per-frame `CAM_LERP` (`0.06`) factors and decays `shakeIntensity *= 0.92` per frame without scaling by `dt`.

### Stuck input state on `blur`, `visibilitychange`, or pointer lock exit

- **Paths.** `input.js` lines 8 to 11, 28 to 48, and 139 to 188.
- **Symptom.** `setupInput` in `input.js` mutates `keys` and `touchState` on key and touch events but registers no `blur`, `visibilitychange`, or `pointerlockchange` cleanup handlers. Losing focus or opening an overlay while holding a movement key leaves thrust active.

### Cinematic camera fights active thrust and `resetShip` keeps `cinematicTarget`

- **Paths.** `ship.js` lines 203 to 233, 250 to 274, and 286 to 291. `app.js` lines 108 to 109.
- **Symptom.** While `cinematicTarget` is set, `updateShip` still applies player velocity to `shipGroup.position` every frame while `updateCamera` lerps `shipGroup.position` toward `tPos + (0, 15, 0)`. Pressing `KeyR` calls `resetShip`, which resets `shipGroup.position` to `(0, 0, -80)` without clearing `cinematicTarget`.

### Coarse-pointer touch controls remain active under overlays and canvas lacks `touch-action: none`

- **Paths.** `style.css` lines 40 to 43, 338 to 363, and 703 to 706. `input.js` lines 72 to 107.
- **Symptom.** `.touch-controls` (`z-index: 45`) keeps `pointer-events: auto` on `.touch-joystick` and `.touch-actions` while portfolio overlays (`#project-nav-overlay`, `#info-overlay`, `#archive-overlay`, `#project-panel`) are open. `#three-container` has no `touch-action: none` CSS rule and attaches `touchstart` and `touchmove` listeners with `{ passive: true }`, allowing browser scroll and pinch-zoom gestures to intercept aiming drags.

### Coarse-pointer visitors start on High quality with no first-run project browse path

- **Paths.** `scene.js` line 163 and lines 257 to 276. `ui.js` lines 160 to 216.
- **Symptom.** Mobile and coarse-pointer visitors boot at `Math.min(window.devicePixelRatio, 2)` with all 7 post-processing passes active and land in the 3D flight view without an automatic `#project-nav-overlay` or one-tap browse prompt.

### Placeholder `#` links in `PROJECT_ORBS` leave empty link rows

- **Paths.** `constants.js` lines 109 to 131. `mechanics.js` lines 428 to 447.
- **Symptom.** `Market Sentiment vs TAIEX` and `Semantic Segmentation` in `constants.js` set `github: '#'` and `demo: '#'` with no `status` string. `showProjectPanel` in `mechanics.js` skips `'#'` URLs, rendering an empty `.pp-links` container on both cards.

## P2 defects

### Hard step deadzone on the virtual joystick

- **Paths.** `ship.js` lines 225 to 231.
- **Symptom.** `updateShip` gates `touchState.moveY` and `touchState.moveX` at `0.08` without rescaling the post-deadzone range `(abs - 0.08) / 0.92`, causing a step jump at the threshold.

### Rotation axis mismatch introduces roll drift

- **Paths.** `input.js` lines 51 to 56 and 81 to 96. `ship.js` lines 210 to 220.
- **Symptom.** Mouse and touch look rotate `shipGroup` around world `Y_AXIS` and local `X_AXIS` directly inside input handlers, while `KeyA` and `KeyD` rotate around transformed ship `up`. Mixing world yaw and local pitch accumulates unintended roll relative to the grid floor.

### Mobile navigation and settings hit targets below 44px

- **Paths.** `style.css` lines 100 to 112, 426 to 430, 529 to 535, and 716 to 723.
- **Symptom.** `.nav-link`, `.sp-toggle`, `.pp-close`, and `.touch-btn-reset` (`height: 32px`) have touch hit areas smaller than 44x44px on coarse pointers, and `@media (max-width: 480px)` (`style.css` line 769) hides `.side-hud` with `display: none`.

### Per-frame `Vector3` allocations in cinematic camera and retained orb groups on reset

- **Paths.** `ship.js` lines 260 to 267. `mechanics.js` lines 369 to 371 and 464 to 477.
- **Symptom.** `updateCamera` allocates `tPos.clone().add(new THREE.Vector3(...))` twice per frame while `cinematicTarget` is active. `resetMechanics` only removes `o.group` from `_scene` when `!o.collected`, leaving collected orb groups and their zeroed `PointLight` nodes in `_scene` across resets.
