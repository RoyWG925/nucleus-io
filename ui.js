/**
 * TOY_BOX.IO — UI Wiring
 * HUD buttons, gravity toggle, volume, settings UX.
 */
import { setGravity, getGravity } from './physics.js';
import { PROJECT_ORBS } from './constants.js';
import { projectOrbs } from './mechanics.js';
import { resolveShipVariant, setCinematicTarget, setShipVariant } from './ship.js';
import { camera, getRenderQuality, syncQualityButtons, writeStoredQuality } from './scene.js';

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

    const ppPanel = document.getElementById('project-panel');
    const terminal = document.getElementById('dev-terminal');
    const termInput = document.getElementById('terminal-input');
    const termOutput = document.getElementById('terminal-output');
    const termClose = document.getElementById('term-close');
    const navLinks = document.querySelectorAll('a.nav-link[data-view]');
    const overlays = {
        projects: document.getElementById('project-nav-overlay'),
        archive: document.getElementById('archive-overlay'),
        info: document.getElementById('info-overlay'),
        settings: document.getElementById('settings-panel'),
    };

    function syncOverlayState() {
        const anyOverlayOpen =
            Object.values(overlays).some(el => el && !el.classList.contains('hidden')) ||
            Boolean(ppPanel?.classList.contains('visible')) ||
            Boolean(terminal && !terminal.classList.contains('hidden'));
        document.body.classList.toggle('overlay-open', anyOverlayOpen);
    }

    function closeProjectPanel() {
        setCinematicTarget(null, camera);
        clearTimeout(ppPanel?._hideTimer);
        ppPanel?.classList.remove('visible');
        syncOverlayState();
    }
    window.closeProjectPanel = closeProjectPanel;

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

    function setActiveOverlay(next = null) {
        if (next) closeProjectPanel();
        for (const [key, el] of Object.entries(overlays)) {
            el?.classList.toggle('hidden', key !== next);
        }
        if (next === 'archive') {
            renderArchiveList();
        }
        const activeView = next === 'projects' || next === 'archive' || next === 'info' ? next : 'playground';
        navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.view === activeView);
        });
        syncOverlayState();
    }

    function toggleOverlay(name) {
        const target = overlays[name];
        const isOpen = target && !target.classList.contains('hidden');
        setActiveOverlay(isOpen ? null : name);
    }

    document.getElementById('btn-settings')?.addEventListener('click', () => {
        audio.playUIClick();
        toggleOverlay('settings');
    });

    ['sp-close', 'io-close', 'ao-close', 'pnv-close'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', () => {
            audio.playUIClick();
            setActiveOverlay(null);
        });
    });

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            audio.playUIClick();
            const view = link.dataset.view;
            if (view === 'playground') {
                closeProjectPanel();
                setActiveOverlay(null);
            } else {
                toggleOverlay(view);
            }
        });
    });

    document.getElementById('volume-slider')?.addEventListener('input', (e) => {
        ensureAudio();
        const val = parseInt(e.target.value, 10) / 100;
        if (audio.musicGain) {
            audio.musicGain.gain.value = val * 0.5;
        }
        if (audio.masterGain && !audio.muted) {
            audio.masterGain.gain.value = val;
        }
    });

    document.getElementById('bloom-slider')?.addEventListener('input', (e) => {
        const val = parseInt(e.target.value) / 100;
        window.dispatchEvent(new CustomEvent('updateBloomIntensity', { detail: val }));
    });

    syncQualityButtons(getRenderQuality());

    document.querySelectorAll('.sp-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const quality = btn.dataset.quality;
            if (!quality) return;
            audio.playUIClick();
            writeStoredQuality(quality);
            syncQualityButtons(quality);
            window.dispatchEvent(new CustomEvent('updateRenderQuality', { detail: quality }));
        });
    });

    document.querySelectorAll('.hud-btn[data-tool="ship"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const variant = resolveShipVariant(btn.dataset.ship);
            setShipVariant(variant);
            window.showLog?.(`Hangar: Deployed ${variant.toUpperCase()} class`, "system");
        });
    });

    const ppClose = document.querySelector('.pp-close');
    if (ppClose && ppPanel) {
        ppClose.addEventListener('click', () => {
            closeProjectPanel();
            syncOverlayState();
        });
    }

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Escape') {
            closeProjectPanel();
            if (terminal && !terminal.classList.contains('hidden')) {
                terminal.classList.add('hidden');
                termInput?.blur();
            }
            setActiveOverlay(null);
        }
    });

    const pnvList = document.getElementById('pnv-list');
    if (pnvList) {
        PROJECT_ORBS.forEach((data) => {
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
                setActiveOverlay(null);
                const targetOrb = projectOrbs.find((o) => o.data.name === data.name);
                if (targetOrb && !targetOrb.collected) {
                    setCinematicTarget(targetOrb.group, camera);
                    window.showProjectPanelManually(data);
                } else {
                    window.showProjectPanelManually(data);
                }
                syncOverlayState();
            });
            pnvList.appendChild(el);
        });
    }

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
        syncOverlayState();
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
                            b.classList.toggle('active', resolveShipVariant(b.dataset.ship) === variant);
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
