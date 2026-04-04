/**
 * TOY_BOX.IO — Input Manager
 * Keyboard state + mouse look via pointer lock.
 */
import * as THREE from 'three';

/** Active key state — read this from any module. */
export const keys = {};

/** Callbacks registered by other modules. */
let _onMouseMove = null;
let _ensureAudioCb = null;
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const X_AXIS = new THREE.Vector3(1, 0, 0);

/**
 * Set up all input listeners.
 * @param {Object} opts
 * @param {THREE.Group} opts.shipGroup — ship mesh, for mouse look rotation
 * @param {Function} opts.ensureAudio — called on first interaction to start audio
 */
export function setupInput({ shipGroup, ensureAudio }) {
    _ensureAudioCb = ensureAudio;

    window.addEventListener('keydown', e => {
        keys[e.code] = true;
        ensureAudio();
        if (['Space','ControlLeft','ControlRight'].includes(e.code)) e.preventDefault();
    });

    window.addEventListener('keyup', e => { keys[e.code] = false; });

    // Mouse look (pointer-locked)
    window.addEventListener('mousemove', e => {
        if (!document.pointerLockElement) return;
        const sens = 0.002;
        shipGroup.rotateOnWorldAxis(Y_AXIS, -e.movementX * sens);
        shipGroup.rotateOnAxis(X_AXIS, -e.movementY * sens);
    });

    // Click to capture pointer
    document.getElementById('three-container')?.addEventListener('click', () => {
        ensureAudio();
        document.getElementById('three-container')?.requestPointerLock();
    });

    window.addEventListener('click', ensureAudio, { once: true });
}
