/**
 * NUCLEUS.IO — Spaceship
 * Three ship variants: VIPER (agile), PHANTOM (stealth), TITAN (heavy).
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
export let currentShipType = 'viper';

// ── Internal state ─────────────────────────────────────────
let trailParticles;
let trailIdx = 0;
let wasBoosting = false;
let shakeIntensity = 0;
const speedEl = document.getElementById('speed-value');
let lastSpeedHud = -1;

const BASE_FWD        = new THREE.Vector3(0, 0, 1);
const BASE_UP         = new THREE.Vector3(0, 1, 0);
const ROLL_AXIS       = new THREE.Vector3(0, 0, 1);
const TRAIL_BASE_LOCAL = new THREE.Vector3(0, 0, -3);
const TRAIL_WORLD_POS  = new THREE.Vector3();
const CAM_OFFSET_WORLD = new THREE.Vector3();
const CAM_TARGET       = new THREE.Vector3();
const LOOK_TARGET      = new THREE.Vector3();
const FORWARD_DIR      = new THREE.Vector3();
const UP_DIR           = new THREE.Vector3();
const LOOK_FWD_DIR     = new THREE.Vector3();

// ── Ship Material Palettes ─────────────────────────────────
const PALETTES = {
    viper:   { body: 0xff5352, accent: 0xffb3ae, engine: 0xc2c1ff },
    phantom: { body: 0x1a2035, accent: 0x4a9eff, engine: 0x4a9eff },
    titan:   { body: 0x2d3436, accent: 0xffd32a, engine: 0xff7675 },
};

function makeMats(variant) {
    const p = PALETTES[variant] || PALETTES.viper;
    return {
        body:   new THREE.MeshStandardMaterial({ color: p.body,   emissive: p.body,   emissiveIntensity: 0.35, metalness: 0.85, roughness: 0.25 }),
        accent: new THREE.MeshStandardMaterial({ color: p.accent, emissive: p.accent, emissiveIntensity: 0.4,  metalness: 0.7,  roughness: 0.2  }),
        glass:  new THREE.MeshStandardMaterial({ color: 0x080818, emissive: p.accent, emissiveIntensity: 0.2,  metalness: 0.95, roughness: 0.05, transparent: true, opacity: 0.75 }),
        engine: new THREE.MeshStandardMaterial({ color: p.engine, emissive: p.engine, emissiveIntensity: 0.8,  transparent: true, opacity: 0.6 }),
        glow:   new THREE.MeshBasicMaterial({ color: p.accent, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending }),
    };
}

// ── VIPER MK-I — agile interceptor ────────────────────────
function buildViper(g, m) {
    // Fuselage
    const fuse = new THREE.Mesh(new THREE.ConeGeometry(0.8, 5, 6), m.body);
    fuse.rotation.x = Math.PI / 2; fuse.position.z = 0.5; g.add(fuse);
    // Cockpit bubble
    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), m.glass);
    cockpit.scale.set(0.8, 0.5, 1); cockpit.position.set(0, 0.3, 2.2); g.add(cockpit);
    // Wings
    const wings = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.08, 2.2), m.body);
    wings.position.set(0, -0.1, -0.4);
    g.add(wings);
    // Fin
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 1.3), m.accent);
    fin.position.set(0, 0.7, -1.8); g.add(fin);
    // Engine cone
    const ec = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.4, 6), m.engine);
    ec.rotation.x = -Math.PI / 2; ec.position.z = -2.8; g.add(ec);
    // Lights
    const el = new THREE.PointLight(COLORS.tertiary, 2.2, 9); el.position.z = -3; g.add(el);
    const tL = new THREE.PointLight(COLORS.secondary, 1.5, 5); tL.position.set(-2.5, 0, -0.5); g.add(tL);
    const tR = new THREE.PointLight(COLORS.container, 1.5, 5); tR.position.set(2.5, 0, -0.5); g.add(tR);
}

// ── PHANTOM X — stealth delta-wing ────────────────────────
function buildPhantom(g, m) {
    // Razor fuselage spine
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 7.5), m.body);
    body.position.z = 0.5; g.add(body);
    // Swept delta wings
    [-1, 1].forEach(side => {
        const w = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.06, 4.5), m.body);
        w.position.set(side * 2.2, -0.1, -0.3); w.rotation.y = side * -0.2; g.add(w);
        // Wing edge accent glow strip
        const edge = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.04, 0.07), m.glow);
        edge.position.set(side * 2.2, -0.1, -2.5); g.add(edge);
    });
    // V-tail fins
    [-1.4, 1.4].forEach((x, i) => {
        const vf = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.1, 2), m.accent);
        vf.rotation.z = (i === 0 ? -1 : 1) * 0.4; vf.position.set(x, 0.45, -2.8); g.add(vf);
    });
    // Sensor spine ridge
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 9), m.accent);
    ridge.position.set(0, 0.13, -0.5); g.add(ridge);
    // Twin engines
    [-1.0, 1.0].forEach(x => {
        const ec = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.0, 6), m.engine);
        ec.rotation.x = -Math.PI / 2; ec.position.set(x, 0, -4); g.add(ec);
        const el = new THREE.PointLight(0x4a9eff, 2, 9); el.position.set(x, 0, -4.5); g.add(el);
    });
}

// ── TITAN HEAVY — armored battlecruiser ───────────────────
function buildTitan(g, m) {
    // Wide armored hull
    const hull = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.4, 7), m.body);
    hull.position.z = 0.5; g.add(hull);
    // Nose wedge
    const nose = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2, 4), m.body);
    nose.rotation.x = Math.PI / 2; nose.rotation.y = Math.PI / 4; nose.position.z = 4.2; g.add(nose);
    // Heavy shoulder wings
    [-2.4, 2.4].forEach(x => {
        const sw = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.45, 3.2), m.body);
        sw.position.set(x, -0.2, 0); g.add(sw);
        // Turret nubs
        const tn = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.55, 6), m.accent);
        tn.position.set(x + Math.sign(x) * 0.6, 0.35, 0.6); g.add(tn);
    });
    // Armor spine top
    const spine = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.3, 6.5), m.accent);
    spine.position.set(0, 0.85, 0.3); g.add(spine);
    // Accent rim
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, emissive: 0xffd32a, emissiveIntensity: 0.6 });
    const rim    = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.08, 7.2), rimMat);
    rim.position.set(0, 0.72, 0.5); g.add(rim);
    // Four engine exhausts
    [[-0.9,-0.3],[0.9,-0.3],[-0.9,0.3],[0.9,0.3]].forEach(([x, y]) => {
        const ec = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.6, 6), m.engine);
        ec.rotation.x = -Math.PI / 2; ec.position.set(x, y, -4); g.add(ec);
        const el = new THREE.PointLight(0xff7675, 2.2, 9); el.position.set(x, y, -4.5); g.add(el);
    });
}

// ── Build/Switch variant ───────────────────────────────────
function populateShipGroup(type) {
    // Dispose children
    while (shipGroup.children.length) {
        const c = shipGroup.children[0];
        shipGroup.remove(c);
        c.geometry?.dispose();
        if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
        else c.material?.dispose();
    }
    const m = makeMats(type);
    switch (type) {
        case 'phantom': buildPhantom(shipGroup, m);  break;
        case 'titan':   buildTitan(shipGroup, m);    break;
        default:        buildViper(shipGroup, m);    break;
    }
}

export function setShipVariant(type) {
    if (!shipGroup || type === currentShipType) return;
    currentShipType = type;
    populateShipGroup(type);
    // Dispatch for HUD label updates
    window.dispatchEvent(new CustomEvent('shipVariantChanged', { detail: type }));
}

// ── Create Spaceship ───────────────────────────────────────
export function createSpaceship(scene) {
    shipGroup = new THREE.Group();
    shipGroup.position.set(0, 0, -80);
    populateShipGroup('viper');
    scene.add(shipGroup);
}

// ── Engine Trail ───────────────────────────────────────────
export function createTrail(scene) {
    const geo  = new THREE.BufferGeometry();
    const pos  = new Float32Array(TRAIL_LEN * 3);
    const sizes = new Float32Array(TRAIL_LEN);
    for (let i = 0; i < TRAIL_LEN; i++) {
        pos[i*3] = 0; pos[i*3+1] = -9999; pos[i*3+2] = 0;
        sizes[i] = 0;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));
    trailParticles = new THREE.Points(geo, new THREE.PointsMaterial({
        color: COLORS.tertiary, size: 0.6, transparent: true, opacity: 0.5,
        blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    }));
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
export function updateShip(dt, audio, onReset) {
    const isBoosting = !!keys['Space'];
    const speedMult  = currentShipType === 'titan' ? 0.7 : currentShipType === 'phantom' ? 1.25 : 1.0;
    const boost  = isBoosting ? BOOST_MULT : 1;
    const speed  = SHIP_SPEED * boost * speedMult;
    const rot    = ROTATE_SPEED * dt;

    const forward = FORWARD_DIR.copy(BASE_FWD).applyQuaternion(shipGroup.quaternion);
    const up      = UP_DIR.copy(BASE_UP).applyQuaternion(shipGroup.quaternion);

    shipVelocity.set(0, 0, 0);

    if (keys['KeyW'] || keys['ArrowUp'])    shipVelocity.addScaledVector(forward, speed);
    if (keys['KeyS'] || keys['ArrowDown'])  shipVelocity.addScaledVector(forward, -speed * 0.5);
    if (keys['KeyA'] || keys['ArrowLeft'])  shipGroup.rotateOnWorldAxis(up, rot);
    if (keys['KeyD'] || keys['ArrowRight']) shipGroup.rotateOnWorldAxis(up, -rot);
    if (keys['KeyQ']) shipGroup.rotateOnAxis(ROLL_AXIS, rot);
    if (keys['KeyE']) shipGroup.rotateOnAxis(ROLL_AXIS, -rot);
    if (keys['ShiftLeft']  || keys['ShiftRight'])   shipVelocity.y += speed * 0.6;
    if (keys['ControlLeft']|| keys['ControlRight'])  shipVelocity.y -= speed * 0.6;

    shipGroup.position.addScaledVector(shipVelocity, dt);

    const spd = Math.round(shipVelocity.length());
    if (spd !== lastSpeedHud) {
        if (speedEl) speedEl.textContent = spd;
        lastSpeedHud = spd;
    }

    audio.updateEngine(spd, isBoosting);
    if (isBoosting && !wasBoosting) audio.playBoost();
    wasBoosting = isBoosting;

    if (keys['KeyR']) onReset();
}

// ── Cinematic Mode ─────────────────────────────────────────
export let cinematicTarget = null;

export function setCinematicTarget(target, camera) {
    if (target && !cinematicTarget && camera) {
        LOOK_TARGET.copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()));
    }
    cinematicTarget = target;
}

// ── Camera Follow ──────────────────────────────────────────
export function updateCamera(camera) {
    if (cinematicTarget) {
        const tPos  = cinematicTarget.position;
        const viewPos = tPos.clone().add(new THREE.Vector3(0, 2, 7));
        camera.position.lerp(viewPos, CAM_LERP * 0.5);
        LOOK_TARGET.lerp(tPos, CAM_LERP * 0.8);
        camera.lookAt(LOOK_TARGET);
        shipGroup.position.lerp(tPos.clone().add(new THREE.Vector3(0, 15, 0)), CAM_LERP);
    } else {
        CAM_OFFSET_WORLD.copy(CAM_OFFSET).applyQuaternion(shipGroup.quaternion);
        CAM_TARGET.copy(shipGroup.position).add(CAM_OFFSET_WORLD);
        camera.position.lerp(CAM_TARGET, CAM_LERP);
        LOOK_TARGET.copy(shipGroup.position);
        LOOK_TARGET.add(LOOK_FWD_DIR.set(0, 0, 8).applyQuaternion(shipGroup.quaternion));
        camera.lookAt(LOOK_TARGET);
    }
    if (shakeIntensity > 0.01) {
        camera.position.x += (Math.random()-0.5) * shakeIntensity;
        camera.position.y += (Math.random()-0.5) * shakeIntensity;
        shakeIntensity *= 0.92;
    } else {
        shakeIntensity = 0;
    }
}

export function triggerShake(intensity = 0.6) { shakeIntensity = intensity; }

export function resetShip() {
    shipGroup.position.set(0, 0, -80);
    shipGroup.rotation.set(0, 0, 0);
    shipGroup.quaternion.identity();
    shipVelocity.set(0, 0, 0);
}
