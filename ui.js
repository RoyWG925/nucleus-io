/**
 * TOY_BOX.IO — UI Wiring
 * HUD buttons, gravity toggle, volume, settings UX.
 */
import { setGravity, getGravity } from './physics.js';
import { PROJECT_ORBS } from './constants.js';
import { projectOrbs } from './mechanics.js';
import { setCinematicTarget } from './ship.js';
import { camera } from './scene.js';

/**
 * Wire up all HUD buttons.
 * @param {import('./audio.js').AudioEngine} audio
 * @param {Function} ensureAudio
 */
export function setupUI(audio, ensureAudio) {
    // Gravity toggle
    const gravBtn = document.getElementById('btn-gravity');
    if (gravBtn) {
        gravBtn.addEventListener('click', () => {
            const next = !getGravity();
            setGravity(next);
            gravBtn.classList.toggle('active', next);
            audio.playUIClick();
        });
    }

    // Tool buttons (radio-style except gravity)
    document.querySelectorAll('.hud-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            audio.playUIClick();
            if (btn.dataset.tool !== 'gravity') {
                document.querySelectorAll('.hud-btn').forEach(b => {
                    if (b.dataset.tool !== 'gravity') b.classList.remove('active');
                });
                btn.classList.add('active');
            }
        });
    });

    // Reboot
    document.getElementById('hud-reboot')?.addEventListener('click', () => {
        audio.playUIClick();
        setTimeout(() => location.reload(), 150);
    });

    // Volume
    document.getElementById('btn-volume')?.addEventListener('click', () => {
        ensureAudio();
        const muted = audio.toggleMute();
        const icon = document.querySelector('#btn-volume .material-symbols-outlined');
        if (icon) icon.textContent = muted ? 'volume_off' : 'volume_up';
    });

    // Settings toggle
    const spPanel = document.getElementById('settings-panel');
    document.getElementById('btn-settings')?.addEventListener('click', () => {
        audio.playUIClick();
        spPanel?.classList.toggle('hidden');
    });
    document.getElementById('sp-close')?.addEventListener('click', () => {
        audio.playUIClick();
        spPanel?.classList.add('hidden');
    });

    // Settings Sliders
    document.getElementById('volume-slider')?.addEventListener('input', (e) => {
        const val = parseInt(e.target.value) / 100;
        audio.bgm.volume = val * 0.5;
        // SFX volume could be handled similarly via a master getter
    });
    
    document.getElementById('bloom-slider')?.addEventListener('input', (e) => {
        const val = parseInt(e.target.value) / 100;
        window.dispatchEvent(new CustomEvent('updateBloomIntensity', { detail: val }));
    });

    // Quality Toggle
    document.querySelectorAll('.sp-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            audio.playUIClick();
            document.querySelectorAll('.sp-toggle').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            window.dispatchEvent(new CustomEvent('updateRenderQuality', { detail: e.target.dataset.quality }));
        });
    });

    // Info Overlay
    const infoOverlay = document.getElementById('info-overlay');
    document.querySelector('[data-view="info"]')?.addEventListener('click', (e) => {
        e.preventDefault();
        audio.playUIClick();
        infoOverlay?.classList.toggle('hidden');
    });
    document.getElementById('io-close')?.addEventListener('click', () => {
        audio.playUIClick();
        infoOverlay?.classList.add('hidden');
    });

    // Archive Overlay
    const archiveOverlay = document.getElementById('archive-overlay');
    document.querySelector('[data-view="archive"]')?.addEventListener('click', (e) => {
        e.preventDefault();
        audio.playUIClick();
        archiveOverlay?.classList.toggle('hidden');
        renderArchiveList();
    });
    document.getElementById('ao-close')?.addEventListener('click', () => {
        audio.playUIClick();
        archiveOverlay?.classList.add('hidden');
    });

    function renderArchiveList() {
        const aoList = document.getElementById('ao-list');
        if (!aoList) return;
        aoList.innerHTML = '';
        PROJECT_ORBS.forEach(data => {
            const collected = projectOrbs.find((o) => o.data.name === data.name && o.collected);
            const el = document.createElement('div');
            el.className = 'ao-item ' + (collected ? 'collected' : '');
            el.innerHTML =
                '<div class="ao-item-name">' + data.name + '</div>' +
                '<div class="ao-item-status">' + (collected ? 'ACQUIRED' : 'LOCKED') + '</div>';
            aoList.appendChild(el);
        });
    }

    // Ship selector (dummy for now)
    document.querySelectorAll('.hud-btn[data-tool="ship"]').forEach(btn => {
        btn.addEventListener('click', () => {
            // Just visuals for now, you could inject logic here
            window.showLog?.("Hangar access restricted", "system");
        });
    });

    // Project panel close button
    const ppClose = document.querySelector('.pp-close');
    const ppPanel = document.getElementById('project-panel');
    if (ppClose && ppPanel) {
        ppClose.addEventListener('click', () => {
            ppPanel.classList.remove('visible');
            clearTimeout(ppPanel._hideTimer);
            // Also exit cinematic mode if we were viewing it
            setCinematicTarget(null, camera);
        });
    }
    // Escape key also closes project panel and cinematic nav
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Escape') {
            if (ppPanel?.classList.contains('visible')) {
                ppPanel.classList.remove('visible');
                clearTimeout(ppPanel._hideTimer);
                setCinematicTarget(null, camera);
            }
            document.getElementById('project-nav-overlay')?.classList.add('hidden');
        }
    });

    // ── Cinematic Navigation Overlay (Dual Mode) ──
    const overlay = document.getElementById('project-nav-overlay');
    const toggleLinks = document.querySelectorAll('a.nav-link');
    
    // Wire up the "PROJECTS" header link to show the overlay
    toggleLinks.forEach(link => {
        if (link.textContent.includes('PROJECT')) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                audio.playUIClick();
                if (overlay) overlay.classList.toggle('hidden');
            });
        }
    });

    const pnvClose = document.getElementById('pnv-close');
    if (pnvClose) {
        pnvClose.addEventListener('click', () => {
            audio.playUIClick();
            overlay.classList.add('hidden');
        });
    }

    const pnvList = document.getElementById('pnv-list');
    if (pnvList) {
        // Populate the list from PROJECT_ORBS
        PROJECT_ORBS.forEach((data, index) => {
            const el = document.createElement('div');
            el.className = 'pnv-item';
            el.innerHTML =
                '<div>' +
                    '<div class="pnv-item-name">' + data.name + '</div>' +
                    '<div class="pnv-item-tech">' + data.tech + '</div>' +
                '</div>' +
                '<span class="material-symbols-outlined" style="color:var(--secondary)">movie</span>';
            el.addEventListener('click', () => {
                audio.playUIClick();
                // 1. Hide the nav overlay
                overlay.classList.add('hidden');
                
                // 2. Find the spawned orb group in mechanics.js
                // Because elements might be missing if collected, we check if it exists:
                const targetOrb = projectOrbs.find((o) => o.data.name === data.name);
                if (targetOrb && !targetOrb.collected) {
                    // Set camera to cinematic lerp mode towards this orb
                    setCinematicTarget(targetOrb.group, camera);
                    
                    // 3. Keep the ship away from it (handled in ship.js camera code), but STILL show the panel manually
                    window.showProjectPanelManually(data); // We need to export this or just dispatch an event.
                } else {
                    // Orb was already collected, just show panel
                    window.showProjectPanelManually(data);
                }
            });
            pnvList.appendChild(el);
        });
    }
}
