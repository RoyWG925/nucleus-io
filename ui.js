/**
 * TOY_BOX.IO — UI Wiring
 * HUD buttons, gravity toggle, volume, settings UX.
 */
import { setGravity, getGravity } from './physics.js';
import { PROJECT_ORBS } from './constants.js';
import { projectOrbs } from './mechanics.js';
import { setCinematicTarget, setShipVariant } from './ship.js';
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

    // Ship selector
    document.querySelectorAll('.hud-btn[data-tool="ship"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const variant = btn.dataset.ship;
            setShipVariant(variant);
            window.showLog?.(`Hangar: Deployed ${variant.toUpperCase()} class`, "system");
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

    // ── Developer Terminal ──
    const terminal = document.getElementById('dev-terminal');
    const termInput = document.getElementById('terminal-input');
    const termOutput = document.getElementById('terminal-output');
    const termClose = document.getElementById('term-close');

    function toggleTerminal() {
        if (!terminal) return;
        const isHidden = terminal.classList.contains('hidden');
        if (isHidden) {
            terminal.classList.remove('hidden');
            if (document.pointerLockElement) document.exitPointerLock();
            setTimeout(() => termInput?.focus(), 100);
            if (audio) audio.playUIClick();
        } else {
            terminal.classList.add('hidden');
            termInput?.blur();
        }
    }

    window.addEventListener('toggleTerminal', toggleTerminal);
    if (termClose) termClose.addEventListener('click', toggleTerminal);

    const termHistory = [];
    let historyIdx = -1;

    function printTerm(html) {
        if (!termOutput) return;
        const div = document.createElement('div');
        div.innerHTML = html;
        termOutput.appendChild(div);
        termOutput.scrollTop = termOutput.scrollHeight;
    }

    if (termInput) {
        termInput.addEventListener('keydown', (e) => {
            if (e.code === 'Enter') {
                const cmd = termInput.value.trim();
                if (!cmd) return;
                printTerm(`<span class="prompt">root@nexus:/$</span> ${cmd}`);
                termInput.value = '';
                termHistory.push(cmd);
                historyIdx = termHistory.length;
                processCommand(cmd);
            } else if (e.code === 'ArrowUp') {
                e.preventDefault();
                if (historyIdx > 0) {
                    historyIdx--;
                    termInput.value = termHistory[historyIdx];
                }
            } else if (e.code === 'ArrowDown') {
                e.preventDefault();
                if (historyIdx < termHistory.length - 1) {
                    historyIdx++;
                    termInput.value = termHistory[historyIdx];
                } else {
                    historyIdx = termHistory.length;
                    termInput.value = '';
                }
            }
        });
    }

    function processCommand(cmd) {
        const args = cmd.split(' ').map(s => s.toLowerCase());
        const main = args[0];

        switch (main) {
            case 'help':
                printTerm(`Available commands:<br>
                <span class="term-highlight">ship --switch [viper|phantom|titan]</span> : Switch active spacecraft<br>
                <span class="term-highlight">status</span> : Print system diagnostics<br>
                <span class="term-highlight">clear</span> : Clear terminal output<br>
                <span class="term-highlight">reboot</span> : Restart NUCLEUS.IO engine`);
                break;
            case 'clear':
                if (termOutput) termOutput.innerHTML = '';
                break;
            case 'status':
                printTerm(`<span class="term-success">[OK]</span> Core Life Support: ONLINE`);
                printTerm(`<span class="term-success">[OK]</span> Godot Game Engine: DETECTED`);
                printTerm(`<span class="term-success">[OK]</span> NLP Transformers: OPTIMIZED`);
                printTerm(`<span class="term-success">[OK]</span> React State: SYNCED`);
                break;
            case 'reboot':
                printTerm(`Rebooting system...`);
                setTimeout(() => location.reload(), 500);
                break;
            case 'ship':
                if (args[1] === '--switch' && args[2]) {
                    const variant = args[2];
                    if (['viper', 'phantom', 'titan'].includes(variant)) {
                        setShipVariant(variant);
                        printTerm(`<span class="term-success">Success:</span> Switched to ${variant.toUpperCase()} class.`);
                        document.querySelectorAll('.hud-btn[data-tool="ship"]').forEach(b => {
                            b.classList.toggle('active', b.dataset.ship === variant);
                        });
                    } else {
                        printTerm(`<span class="term-error">Error:</span> Unknown class '${variant}'. Models: viper, phantom, titan.`);
                    }
                } else {
                     printTerm(`Usage: <span class="term-highlight">ship --switch [model]</span>`);
                }
                break;
            default:
                printTerm(`<span class="term-error">Command not found:</span> ${main}. Type 'help' for options.`);
        }
    }
}
