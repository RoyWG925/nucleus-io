/**
 * TOY_BOX.IO — Letter Physics
 * Collision detection (ship ↔ letters) and simple Euler integration.
 */
import * as THREE from 'three';
import { GRAVITY_VAL } from './constants.js';
import { shipGroup, shipVelocity, triggerShake } from './ship.js';
import { letters } from './text.js';
import { createExplosion } from './vfx.js';

let gravityOn = false;
const _letterWorldBox = new THREE.Box3();
const _explodeCenter = new THREE.Vector3();

/** Toggle gravity for hit letters. */
export function setGravity(on) { gravityOn = on; }
export function getGravity() { return gravityOn; }

/**
 * Check ship bounding box against all un-hit letters.
 * On collision: scatter the letter, play explosion, trigger audio + shake.
 * @param {THREE.Scene} scene
 * @param {import('./audio.js').AudioEngine} audio
 */
export function checkCollisions(scene, audio, shipBox) {
    if (!shipBox) return;
    for (const l of letters) {
        if (l.hit) continue;
        _letterWorldBox.copy(l.localBox).applyMatrix4(l.mesh.matrixWorld);
        if (shipBox.intersectsBox(_letterWorldBox)) {
            l.hit = true;
            // Transfer ship velocity to letter + scatter
            l.vel.copy(shipVelocity).multiplyScalar(1.2);
            l.vel.x += (Math.random()-0.5) * 15;
            l.vel.y += (Math.random()-0.5) * 15;
            l.vel.z += (Math.random()-0.5) * 8;
            l.angVel.set(
                (Math.random()-0.5)*8,
                (Math.random()-0.5)*8,
                (Math.random()-0.5)*8,
            );

            // Explosion
            _letterWorldBox.getCenter(_explodeCenter);
            createExplosion(scene, _explodeCenter, l.color);

            // Audio
            audio.playCollision();

            // Screen shake
            triggerShake(0.6);

            // Dim neon glow
            l.mesh.material.emissiveIntensity = 0.4;
            l.glow.intensity = 1;
        }
    }
}

/**
 * Euler-integrate all hit letters (gravity, damping, rotation).
 * @param {number} dt
 */
export function updateLetters(dt) {
    for (const l of letters) {
        if (!l.hit) continue;
        if (gravityOn) l.vel.y += GRAVITY_VAL * dt;
        l.vel.multiplyScalar(0.998);
        l.angVel.multiplyScalar(0.995);
        l.mesh.position.addScaledVector(l.vel, dt);
        l.mesh.rotation.x += l.angVel.x * dt;
        l.mesh.rotation.y += l.angVel.y * dt;
        l.mesh.rotation.z += l.angVel.z * dt;
        l.glow.position.copy(l.mesh.position);
    }
}

/**
 * Reset all letters to their original positions.
 * @param {Array} originalPositions — snapshot from init
 */
export function resetLetters(originalPositions) {
    for (let i = 0; i < letters.length; i++) {
        const l = letters[i];
        const o = originalPositions[i];
        l.hit = false;
        l.vel.set(0, 0, 0);
        l.angVel.set(0, 0, 0);
        l.mesh.position.copy(o.pos);
        l.mesh.rotation.copy(o.rot);
        l.glow.position.copy(o.glowPos);
        l.mesh.material.emissiveIntensity = 0.5;
        l.glow.intensity = 0.8;
    }
}
