/**
 * TOY_BOX.IO — Orchestrator
 * Wires all modules together and runs the game loop.
 */
import { AudioEngine } from './audio.js';
import { initScene, scene, camera, composer, clock, updateSceneUniforms, warpPass } from './scene.js';
import {
    createStarfield, createGridFloor, createNebulaClouds, createCosmicDust,
    createDistantGalaxies, createExplosion, updateExplosions, updateEnvironment,
    createNebulaRing, createStarClusters, createCosmicFilaments, createLightPillars,
    preloadExplosions
} from './vfx.js';
import { createSpaceship, createTrail, updateShip, updateTrail, updateCamera, resetShip, shipGroup, shipVelocity } from './ship.js';
import { loadNeonText, letters } from './text.js';
import { checkCollisions, updateLetters, resetLetters } from './physics.js';
import { setupInput } from './input.js';
import { setupUI } from './ui.js';
import { initMechanics, updateMechanics, resetMechanics } from './mechanics.js';
import * as THREE from 'three';

// ── Audio ──────────────────────────────────────────────────
const audio = new AudioEngine();
let audioStarted = false;
function ensureAudio() {
    if (audioStarted) return;
    audioStarted = true;
    audio.init();
}

// ── Reset support ──────────────────────────────────────────
const originalPositions = [];
let resetReady = false;
const shipWorldBox = new THREE.Box3();

function resetScene() {
    if (!resetReady) return;
    resetShip();
    resetLetters(originalPositions);
    resetMechanics();
}

// ── Emergency Failsafe ────────────────────────────────────
// If ANYTHING crashes before or during init, dismiss loading screen
// after 8s so the user is never permanently stuck.
const _emergencyTimer = setTimeout(() => {
    const ls = document.getElementById('loading-screen');
    if (ls) { ls.style.opacity = '0'; ls.style.pointerEvents = 'none'; }
}, 8000);

// ── Init ───────────────────────────────────────────────────
async function init() {
    initScene();

    // Environment layers (order doesn't matter — additive blending)
    createStarfield(scene);
    createNebulaClouds(scene);
    createCosmicDust(scene);
    createDistantGalaxies(scene);
    createGridFloor(scene);

    // Macro-cosmic elements (large-scale depth structures)
    createNebulaRing(scene);
    createStarClusters(scene);
    createCosmicFilaments(scene);
    createLightPillars(scene);

    createSpaceship(scene);
    createTrail(scene);
    preloadExplosions(scene);

    // Await font load — this is what controls the loading screen dismissal.
    // loadNeonText has its own 5s internal failsafe; we also have the 8s
    // emergency timer above as a final backstop.
    await loadNeonText(scene);
    clearTimeout(_emergencyTimer);

    setupInput({ shipGroup, ensureAudio });
    setupUI(audio, ensureAudio);

    // Mechanics receives its deps the same way as before
    initMechanics({
        scene,
        shipGroup,
        audio,
        createExplosion: (pos, col) => createExplosion(scene, pos, col),
    });

    animate();
}

// ── Game Loop ──────────────────────────────────────────────
function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);

    // Capture original letter positions once they exist
    if (!resetReady && letters.length > 0) {
        for (const l of letters) {
            originalPositions.push({
                pos: l.mesh.position.clone(),
                rot: l.mesh.rotation.clone(),
                glowPos: l.glow.position.clone(),
            });
        }
        resetReady = true;
    }

    updateShip(dt, audio, resetScene);
    updateCamera(camera);
    updateTrail();
    shipWorldBox.setFromObject(shipGroup);
    checkCollisions(scene, audio, shipWorldBox);
    updateLetters(dt);
    updateExplosions(scene, dt);
    updateEnvironment(dt);
    updateMechanics(dt, shipVelocity, shipWorldBox);

    // Tick post-processing uniforms (film grain time, etc.)
    if (warpPass) {
        warpPass.uniforms.uSpeed.value = shipVelocity.length();
    }
    updateSceneUniforms();

    composer.render();
}

// ── Start ──────────────────────────────────────────────────
init();
