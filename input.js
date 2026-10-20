/**
 * TOY_BOX.IO — Input Manager
 * Keyboard state + mouse look via pointer lock.
 */
import * as THREE from 'three';

/** Active key state — read this from any module. */
export const keys = {};

/** Analog touch joystick state (-1..1). */
export const touchState = { moveX: 0, moveY: 0 };

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
        if (e.target.tagName === 'INPUT') {
            if (e.code === 'Backquote') {
                e.preventDefault();
                window.dispatchEvent(new Event('toggleTerminal'));
            }
            return;
        }

        if (e.code === 'Backquote' || e.key === '~') {
            e.preventDefault();
            window.dispatchEvent(new Event('toggleTerminal'));
            return;
        }

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

    // Click to capture pointer (desktop only)
    const threeContainer = document.getElementById('three-container');
    threeContainer?.addEventListener('click', () => {
        ensureAudio();
        if (!window.matchMedia('(pointer: coarse)').matches) {
            threeContainer?.requestPointerLock?.();
        }
    });

    // ── Touch Look on 3D Canvas ───────────────────────────────
    let lookTouchId = null;
    let lastLookX = 0;
    let lastLookY = 0;

    threeContainer?.addEventListener('touchstart', e => {
        ensureAudio();
        if (lookTouchId !== null) return;
        const t = e.changedTouches[0];
        lookTouchId = t.identifier;
        lastLookX = t.clientX;
        lastLookY = t.clientY;
    }, { passive: true });

    threeContainer?.addEventListener('touchmove', e => {
        if (lookTouchId === null) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (t.identifier === lookTouchId) {
                const dx = t.clientX - lastLookX;
                const dy = t.clientY - lastLookY;
                lastLookX = t.clientX;
                lastLookY = t.clientY;
                const sens = 0.0045;
                shipGroup.rotateOnWorldAxis(Y_AXIS, -dx * sens);
                shipGroup.rotateOnAxis(X_AXIS, -dy * sens);
                break;
            }
        }
    }, { passive: true });

    const endLookTouch = e => {
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === lookTouchId) {
                lookTouchId = null;
                break;
            }
        }
    };
    threeContainer?.addEventListener('touchend', endLookTouch, { passive: true });
    threeContainer?.addEventListener('touchcancel', endLookTouch, { passive: true });

    // ── Virtual Joystick (Thrust + Yaw) ───────────────────────
    const joyEl = document.getElementById('touch-joystick');
    const knobEl = document.getElementById('touch-joystick-knob');
    let joyTouchId = null;

    function updateJoystick(clientX, clientY) {
        if (!joyEl || !knobEl) return;
        const rect = joyEl.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const maxR = rect.width * 0.36;
        let dx = clientX - cx;
        let dy = clientY - cy;
        const dist = Math.hypot(dx, dy);
        if (dist > maxR) {
            dx = (dx / dist) * maxR;
            dy = (dy / dist) * maxR;
        }
        knobEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        touchState.moveX = dx / maxR;
        touchState.moveY = -dy / maxR; // up is positive (forward)
    }

    function resetJoystick() {
        joyTouchId = null;
        touchState.moveX = 0;
        touchState.moveY = 0;
        if (knobEl) knobEl.style.transform = 'translate(-50%, -50%)';
    }

    joyEl?.addEventListener('touchstart', e => {
        e.preventDefault();
        ensureAudio();
        const t = e.changedTouches[0];
        joyTouchId = t.identifier;
        updateJoystick(t.clientX, t.clientY);
    }, { passive: false });

    joyEl?.addEventListener('touchmove', e => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (t.identifier === joyTouchId) {
                updateJoystick(t.clientX, t.clientY);
                break;
            }
        }
    }, { passive: false });

    const endJoyTouch = e => {
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === joyTouchId) {
                resetJoystick();
                break;
            }
        }
    };
    joyEl?.addEventListener('touchend', endJoyTouch);
    joyEl?.addEventListener('touchcancel', endJoyTouch);

    // ── Touch Action Buttons (BOOST / UP / DOWN / RESET) ─────
    document.querySelectorAll('.touch-btn[data-key]').forEach(btn => {
        const code = btn.dataset.key;
        const press = e => {
            e.preventDefault();
            ensureAudio();
            keys[code] = true;
            btn.classList.add('active');
        };
        const release = e => {
            e.preventDefault();
            keys[code] = false;
            btn.classList.remove('active');
        };
        btn.addEventListener('touchstart', press, { passive: false });
        btn.addEventListener('touchend', release, { passive: false });
        btn.addEventListener('touchcancel', release, { passive: false });
        btn.addEventListener('mousedown', press);
        btn.addEventListener('mouseup', release);
        btn.addEventListener('mouseleave', release);
    });

    window.addEventListener('click', ensureAudio, { once: true });
}
