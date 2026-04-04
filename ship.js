/**
 * TOY_BOX.IO — Spaceship
 * Mesh creation, flight controls, engine trail, and camera follow.
 */
import * as THREE from 'three';
import {
    COLORS, SHIP_SPEED, BOOST_MULT, ROTATE_SPEED,
    CAM_LERP, CAM_OFFSET, TRAIL_LEN,
} from './constants.js';
import { keys } from './input.js';

// ── Exported state ─────────────────────────────────────────
export let shipGroup;
export const shipVelocity = new THREE.Vector3();

// ── Internal state ─────────────────────────────────────────
let trailParticles;
let trailIdx = 0;
let wasBoosting = false;
let shakeIntensity = 0;
const speedEl = document.getElementById('speed-value');
let lastSpeedHud = -1;

const BASE_FWD = new THREE.Vector3(0, 0, 1);
const BASE_UP = new THREE.Vector3(0, 1, 0);
const ROLL_AXIS = new THREE.Vector3(0, 0, 1);
const TRAIL_BASE_LOCAL = new THREE.Vector3(0, 0, -3);
const TRAIL_WORLD_POS = new THREE.Vector3();
const CAM_OFFSET_WORLD = new THREE.Vector3();
const CAM_TARGET = new THREE.Vector3();
const LOOK_TARGET = new THREE.Vector3();
const FORWARD_DIR = new THREE.Vector3();
const UP_DIR = new THREE.Vector3();
const LOOK_FWD_DIR = new THREE.Vector3();

// ── Create Spaceship ───────────────────────────────────────
export function createSpaceship(scene) {
    shipGroup = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
        color: COLORS.container, emissive: COLORS.container,
        emissiveIntensity: 0.35, metalness: 0.85, roughness: 0.25,
    });
    const accentMat = new THREE.MeshStandardMaterial({
        color: COLORS.primary, emissive: COLORS.primary,
        emissiveIntensity: 0.3, metalness: 0.7, roughness: 0.3,
    });
    const glassMat = new THREE.MeshStandardMaterial({
        color: COLORS.cabin, emissive: COLORS.primary,
        emissiveIntensity: 0.15, metalness: 0.95, roughness: 0.05,
        transparent: true, opacity: 0.8,
    });

    // ── Fuselage
    const fuse = new THREE.Mesh(new THREE.ConeGeometry(0.8, 5, 6), bodyMat);
    fuse.rotation.x = Math.PI / 2;
    fuse.position.z = 0.5;
    shipGroup.add(fuse);

    // ── Cockpit
    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), glassMat);
    cockpit.scale.set(0.8, 0.5, 1);
    cockpit.position.set(0, 0.3, 2.2);
    shipGroup.add(cockpit);

    // ── Wings
    const wingGeo = new THREE.BoxGeometry(5, 0.08, 2);
    const wingL = new THREE.Mesh(wingGeo, bodyMat);
    wingL.position.set(0, -0.1, -0.5);
    shipGroup.add(wingL);

    // ── Fins
    const finGeo = new THREE.BoxGeometry(0.08, 1.5, 1.2);
    const finTop = new THREE.Mesh(finGeo, accentMat);
    finTop.position.set(0, 0.7, -1.8);
    shipGroup.add(finTop);

    // ── Engine glow
    const engineMat = new THREE.MeshStandardMaterial({
        color: COLORS.tertiary, emissive: COLORS.tertiary,
        emissiveIntensity: 0.6, transparent: true, opacity: 0.5,
    });
    const engineCone = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.4, 6), engineMat);
    engineCone.rotation.x = -Math.PI / 2;
    engineCone.position.z = -2.8;
    shipGroup.add(engineCone);

    const engineLight = new THREE.PointLight(COLORS.tertiary, 2, 8);
    engineLight.position.z = -3;
    shipGroup.add(engineLight);

    // ── Wingtip accent lights
    const tipL = new THREE.PointLight(COLORS.secondary, 1.5, 5);
    tipL.position.set(-2.5, 0, -0.5);
    shipGroup.add(tipL);
    const tipR = new THREE.PointLight(COLORS.container, 1.5, 5);
    tipR.position.set(2.5, 0, -0.5);
    shipGroup.add(tipR);

    shipGroup.position.set(0, 0, -80);
    scene.add(shipGroup);
}

// ── Engine Trail ───────────────────────────────────────────
export function createTrail(scene) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(TRAIL_LEN * 3);
    const sizes = new Float32Array(TRAIL_LEN);
    for (let i = 0; i < TRAIL_LEN; i++) {
        pos[i*3] = 0; pos[i*3+1] = -9999; pos[i*3+2] = 0;
        sizes[i] = 0;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    const mat = new THREE.PointsMaterial({
        color: COLORS.tertiary, size: 0.6, transparent: true, opacity: 0.5,
        blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    });
    trailParticles = new THREE.Points(geo, mat);
    scene.add(trailParticles);
}

export function updateTrail() {
    TRAIL_WORLD_POS.copy(TRAIL_BASE_LOCAL);
    shipGroup.localToWorld(TRAIL_WORLD_POS);
    const pos = trailParticles.geometry.attributes.position.array;
    pos[trailIdx*3]   = TRAIL_WORLD_POS.x + (Math.random()-0.5)*0.5;
    pos[trailIdx*3+1] = TRAIL_WORLD_POS.y + (Math.random()-0.5)*0.5;
    pos[trailIdx*3+2] = TRAIL_WORLD_POS.z + (Math.random()-0.5)*0.5;
    trailIdx = (trailIdx + 1) % TRAIL_LEN;
    trailParticles.geometry.attributes.position.needsUpdate = true;
}

// ── Flight Controls ────────────────────────────────────────
/**
 * Update ship position / rotation based on input.
 * @param {number} dt
 * @param {import('./audio.js').AudioEngine} audio
 * @param {Function} onReset — callback when R is pressed
 */
export function updateShip(dt, audio, onReset) {
    const isBoosting = !!keys['Space'];
    const boost = isBoosting ? BOOST_MULT : 1;
    const speed = SHIP_SPEED * boost;
    const rot   = ROTATE_SPEED * dt;

    const forward = FORWARD_DIR.copy(BASE_FWD).applyQuaternion(shipGroup.quaternion);
    const up      = UP_DIR.copy(BASE_UP).applyQuaternion(shipGroup.quaternion);

    shipVelocity.set(0, 0, 0);

    if (keys['KeyW'] || keys['ArrowUp'])    shipVelocity.addScaledVector(forward, speed);
    if (keys['KeyS'] || keys['ArrowDown'])  shipVelocity.addScaledVector(forward, -speed * 0.5);
    if (keys['KeyA'] || keys['ArrowLeft'])  shipGroup.rotateOnWorldAxis(up, rot);
    if (keys['KeyD'] || keys['ArrowRight']) shipGroup.rotateOnWorldAxis(up, -rot);
    if (keys['KeyQ']) shipGroup.rotateOnAxis(ROLL_AXIS, rot);
    if (keys['KeyE']) shipGroup.rotateOnAxis(ROLL_AXIS, -rot);
    if (keys['ShiftLeft'] || keys['ShiftRight'])    shipVelocity.y += speed * 0.6;
    if (keys['ControlLeft'] || keys['ControlRight']) shipVelocity.y -= speed * 0.6;

    shipGroup.position.addScaledVector(shipVelocity, dt);

    // Speed HUD
    const spd = Math.round(shipVelocity.length());
    if (spd !== lastSpeedHud) {
        speedEl.textContent = spd;
        lastSpeedHud = spd;
    }

    // Audio
    audio.updateEngine(spd, isBoosting);
    if (isBoosting && !wasBoosting) audio.playBoost();
    wasBoosting = isBoosting;

    // Reset key
    if (keys['KeyR']) onReset();
}

// ── Cinematic Mode State ─────────────────────────────────
export let cinematicTarget = null;

export function setCinematicTarget(target, camera) {
    if (target && !cinematicTarget && camera) {
        // Just entering cinematic mode, reset look target to avoid snap
        LOOK_TARGET.copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()));
    }
    cinematicTarget = target;
}

// ── Camera Follow ──────────────────────────────────────────
/**
 * Smooth camera follow + screen shake or Cinematic Lerp.
 * @param {THREE.PerspectiveCamera} camera
 */
export function updateCamera(camera) {
    if (cinematicTarget) {
        // Cinematic Lerp mode
        const tPos = cinematicTarget.position;
        // View from 7 units in front and slightly above
        const viewPos = tPos.clone().add(new THREE.Vector3(0, 2, 7));
        camera.position.lerp(viewPos, CAM_LERP * 0.5);

        LOOK_TARGET.lerp(tPos, CAM_LERP * 0.8);
        camera.lookAt(LOOK_TARGET);

        // Keep the ship hovering harmlessly away from the orb to avoid triggering collection
        shipGroup.position.lerp(tPos.clone().add(new THREE.Vector3(0, 15, 0)), CAM_LERP);
    } else {
        // Normal ship follow camera
        CAM_OFFSET_WORLD.copy(CAM_OFFSET).applyQuaternion(shipGroup.quaternion);
        CAM_TARGET.copy(shipGroup.position).add(CAM_OFFSET_WORLD);
        camera.position.lerp(CAM_TARGET, CAM_LERP);

        LOOK_TARGET.copy(shipGroup.position);
        LOOK_TARGET.add(LOOK_FWD_DIR.set(0, 0, 8).applyQuaternion(shipGroup.quaternion));
        camera.lookAt(LOOK_TARGET);
    }

    // Screen shake
    if (shakeIntensity > 0.01) {
        camera.position.x += (Math.random()-0.5) * shakeIntensity;
        camera.position.y += (Math.random()-0.5) * shakeIntensity;
        shakeIntensity *= 0.92;
    } else {
        shakeIntensity = 0;
    }
}

/** Trigger screen shake (called on collision). */
export function triggerShake(intensity = 0.6) {
    shakeIntensity = intensity;
}

/** Hard-reset ship to starting position. */
export function resetShip() {
    shipGroup.position.set(0, 0, -80);
    shipGroup.rotation.set(0, 0, 0);
    shipGroup.quaternion.identity();
    shipVelocity.set(0, 0, 0);
}
