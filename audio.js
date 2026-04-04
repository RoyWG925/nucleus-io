/**
 * TOY_BOX.IO — Procedural Audio Engine
 * All sounds generated via Web Audio API — no external files needed.
 */

export class AudioEngine {
    constructor() {
        this.ctx = null;
        this.initialized = false;
        this.muted = false;

        // Gain nodes
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.engineGain = null;

        // Engine oscillators
        this.engineOsc1 = null;
        this.engineOsc2 = null;
        this.engineFilter = null;

        // Music state
        this.musicNodes = [];
        this.arpInterval = null;
        this.padFilter = null;
        this.padLfo = null;

        // Reverb
        this.reverb = null;
        this.reverbGain = null;

        // Prevent boost spam
        this._lastBoostTime = 0;
        this.noiseBuffers = null;
    }

    // ─── Initialize (must be called from user gesture) ─────────
    init() {
        if (this.initialized) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.initialized = true;

        // Master chain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.7;
        this.masterGain.connect(this.ctx.destination);

        // Music bus
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.35;
        this.musicGain.connect(this.masterGain);

        // SFX bus
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.6;
        this.sfxGain.connect(this.masterGain);

        // Create reverb
        this._createReverb();
        this._createNoiseBuffers();

        // Start all systems
        this._initEngine();
        this._startMusic();
    }

    // ─── Reverb (generated impulse response) ───────────────────
    _createReverb() {
        const length = this.ctx.sampleRate * 2.5;
        const impulse = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
            const data = impulse.getChannelData(ch);
            for (let i = 0; i < length; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
            }
        }
        this.reverb = this.ctx.createConvolver();
        this.reverb.buffer = impulse;
        this.reverbGain = this.ctx.createGain();
        this.reverbGain.gain.value = 0.3;
        this.reverb.connect(this.reverbGain);
        this.reverbGain.connect(this.musicGain);
    }

    // ═══════════════════════════════════════════════════════════
    //  REUSABLE NOISE BUFFERS (avoid per-event allocations)
    // ═══════════════════════════════════════════════════════════
    _createNoiseBuffers() {
        const makeNoise = (seconds, shaped = false) => {
            const len = Math.max(1, Math.floor(this.ctx.sampleRate * seconds));
            const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < len; i++) {
                let v = (Math.random() * 2 - 1);
                if (shaped) v *= Math.pow(1 - i / len, 3);
                d[i] = v;
            }
            return buf;
        };

        this.noiseBuffers = {
            collisionCrunch: makeNoise(0.4, true),
            boostWhoosh: makeNoise(0.8, false),
            gcWhoosh: makeNoise(0.5, false),
        };
    }

    // ═══════════════════════════════════════════════════════════
    //  BACKGROUND MUSIC — Ambient Synth Pad + Arpeggiator
    // ═══════════════════════════════════════════════════════════

    _startMusic() {
        const now = this.ctx.currentTime;

        // ── Sub Bass Drone (A1 = 55 Hz) ──
        const sub = this.ctx.createOscillator();
        sub.type = 'sine';
        sub.frequency.value = 55;
        const subGain = this.ctx.createGain();
        subGain.gain.value = 0.12;
        sub.connect(subGain);
        subGain.connect(this.musicGain);
        sub.start(now);
        this.musicNodes.push(sub);

        // ── Pad Chord (Am7: A2=110, C3=131, E3=165, G3=196) ──
        this.padFilter = this.ctx.createBiquadFilter();
        this.padFilter.type = 'lowpass';
        this.padFilter.frequency.value = 600;
        this.padFilter.Q.value = 2;
        this.padFilter.connect(this.musicGain);

        const padNotes = [110, 130.81, 164.81, 196];
        padNotes.forEach(freq => {
            // Two detuned oscillators per note for richness
            for (let d = -6; d <= 6; d += 12) {
                const osc = this.ctx.createOscillator();
                osc.type = 'sawtooth';
                osc.frequency.value = freq;
                osc.detune.value = d + (Math.random() - 0.5) * 4;
                const g = this.ctx.createGain();
                g.gain.value = 0.025;
                osc.connect(g);
                g.connect(this.padFilter);
                osc.start(now);
                this.musicNodes.push(osc);
            }
        });

        // ── Pad Filter LFO ──
        this.padLfo = this.ctx.createOscillator();
        this.padLfo.type = 'sine';
        this.padLfo.frequency.value = 0.08; // Very slow sweep
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 400;
        this.padLfo.connect(lfoGain);
        lfoGain.connect(this.padFilter.frequency);
        this.padLfo.start(now);

        // ── Second Pad Layer (higher octave, quieter) ──
        const pad2Filter = this.ctx.createBiquadFilter();
        pad2Filter.type = 'lowpass';
        pad2Filter.frequency.value = 1200;
        pad2Filter.Q.value = 1;
        pad2Filter.connect(this.musicGain);

        const padNotes2 = [220, 261.63, 329.63]; // A3, C4, E4
        padNotes2.forEach(freq => {
            const osc = this.ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            osc.detune.value = (Math.random() - 0.5) * 8;
            const g = this.ctx.createGain();
            g.gain.value = 0.015;
            osc.connect(g);
            g.connect(pad2Filter);
            osc.start(now);
            this.musicNodes.push(osc);
        });

        // ── Sparse Arpeggiator ──
        const arpScale = [220, 261.63, 329.63, 392, 440, 523.25, 659.25, 783.99];
        this.arpInterval = setInterval(() => {
            if (this.muted || !this.initialized) return;
            if (Math.random() > 0.35) return; // ~35% chance per tick = sparse
            const freq = arpScale[Math.floor(Math.random() * arpScale.length)];
            this._playArpNote(freq, 0.6 + Math.random() * 0.8);
        }, 600);
    }

    _playArpNote(freq, duration) {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        osc.type = Math.random() > 0.5 ? 'triangle' : 'sine';
        osc.frequency.value = freq;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.06, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, now);
        filter.frequency.exponentialRampToValueAtTime(500, now + duration);

        osc.connect(filter);
        filter.connect(gain);
        // Dry signal
        gain.connect(this.musicGain);
        // Wet signal (reverb)
        gain.connect(this.reverb);

        osc.start(now);
        osc.stop(now + duration + 0.1);
    }

    stopMusic() {
        this.musicNodes.forEach(n => { try { n.stop(); } catch(e) {} });
        this.musicNodes = [];
        if (this.padLfo) { try { this.padLfo.stop(); } catch(e) {} }
        if (this.arpInterval) clearInterval(this.arpInterval);
    }

    // ═══════════════════════════════════════════════════════════
    //  ENGINE SOUND — Speed-reactive rumble
    // ═══════════════════════════════════════════════════════════

    _initEngine() {
        const now = this.ctx.currentTime;

        // Engine bus
        const engineBus = this.ctx.createGain();
        engineBus.gain.value = 1;
        engineBus.connect(this.sfxGain);

        this.engineFilter = this.ctx.createBiquadFilter();
        this.engineFilter.type = 'lowpass';
        this.engineFilter.frequency.value = 80;
        this.engineFilter.Q.value = 4;
        this.engineFilter.connect(engineBus);

        this.engineGainNode = this.ctx.createGain();
        this.engineGainNode.gain.value = 0;
        this.engineGainNode.connect(this.engineFilter);

        // Primary engine osc (low rumble)
        this.engineOsc1 = this.ctx.createOscillator();
        this.engineOsc1.type = 'sawtooth';
        this.engineOsc1.frequency.value = 40;
        this.engineOsc1.connect(this.engineGainNode);
        this.engineOsc1.start(now);

        // Secondary engine osc (harmonics)
        this.engineOsc2 = this.ctx.createOscillator();
        this.engineOsc2.type = 'square';
        this.engineOsc2.frequency.value = 60;
        const osc2Gain = this.ctx.createGain();
        osc2Gain.gain.value = 0.3;
        this.engineOsc2.connect(osc2Gain);
        osc2Gain.connect(this.engineGainNode);
        this.engineOsc2.start(now);

        // Noise layer for texture
        const noiseLen = this.ctx.sampleRate * 2;
        const noiseBuf = this.ctx.createBuffer(1, noiseLen, this.ctx.sampleRate);
        const noiseData = noiseBuf.getChannelData(0);
        for (let i = 0; i < noiseLen; i++) {
            noiseData[i] = (Math.random() * 2 - 1);
        }
        this.engineNoise = this.ctx.createBufferSource();
        this.engineNoise.buffer = noiseBuf;
        this.engineNoise.loop = true;
        const engineNoiseGain = this.ctx.createGain();
        engineNoiseGain.gain.value = 0.04;
        const engineNoiseFilter = this.ctx.createBiquadFilter();
        engineNoiseFilter.type = 'bandpass';
        engineNoiseFilter.frequency.value = 200;
        engineNoiseFilter.Q.value = 2;
        this.engineNoise.connect(engineNoiseFilter);
        engineNoiseFilter.connect(engineNoiseGain);
        engineNoiseGain.connect(this.engineGainNode);
        this.engineNoise.start(now);
    }

    /**
     * Call every frame with current ship speed and boost state.
     * @param {number} speed - Current speed in M/S
     * @param {boolean} boosting - Whether boost is active
     */
    updateEngine(speed, boosting) {
        if (!this.initialized || this.muted) return;
        const now = this.ctx.currentTime;
        const t = now + 0.1;
        const norm = Math.min(speed / 100, 1); // 0..1

        // Volume scales with speed
        const vol = norm * 0.18 * (boosting ? 1.6 : 1);
        this.engineGainNode.gain.linearRampToValueAtTime(vol, t);

        // Pitch rises with speed
        const baseFreq = 40 + norm * 90;
        this.engineOsc1.frequency.linearRampToValueAtTime(baseFreq, t);
        this.engineOsc2.frequency.linearRampToValueAtTime(baseFreq * 1.5, t);

        // Filter opens with speed
        const cutoff = 80 + norm * 600 * (boosting ? 1.5 : 1);
        this.engineFilter.frequency.linearRampToValueAtTime(cutoff, t);
    }

    // ═══════════════════════════════════════════════════════════
    //  COLLISION SFX — Boom + noise burst
    // ═══════════════════════════════════════════════════════════

    playCollision() {
        if (!this.initialized || this.muted) return;
        const now = this.ctx.currentTime;

        // Layer 1: Low frequency boom
        const boom = this.ctx.createOscillator();
        boom.type = 'sine';
        boom.frequency.setValueAtTime(160 + Math.random() * 40, now);
        boom.frequency.exponentialRampToValueAtTime(25, now + 0.6);

        const boomGain = this.ctx.createGain();
        boomGain.gain.setValueAtTime(0.5, now);
        boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        boom.connect(boomGain);
        boomGain.connect(this.sfxGain);
        boom.start(now);
        boom.stop(now + 0.7);

        // Layer 2: Noise crunch
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffers.collisionCrunch;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 600 + Math.random() * 400;
        noiseFilter.Q.value = 1.5;

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.35, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);
        noise.start(now);

        // Layer 3: Metallic ping (glass shatter feel)
        const ping = this.ctx.createOscillator();
        ping.type = 'triangle';
        ping.frequency.value = 800 + Math.random() * 600;

        const pingGain = this.ctx.createGain();
        pingGain.gain.setValueAtTime(0.15, now);
        pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        ping.connect(pingGain);
        pingGain.connect(this.sfxGain);
        // Send to reverb too for spacey feel
        pingGain.connect(this.reverb);
        ping.start(now);
        ping.stop(now + 0.3);
    }

    // ═══════════════════════════════════════════════════════════
    //  BOOST SFX — Rising sweep
    // ═══════════════════════════════════════════════════════════

    playBoost() {
        if (!this.initialized || this.muted) return;
        const now = this.ctx.currentTime;
        if (now - this._lastBoostTime < 0.8) return; // Debounce
        this._lastBoostTime = now;

        // Whoosh: filtered sawtooth sweep
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.25);
        osc.frequency.exponentialRampToValueAtTime(80, now + 1.2);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(300, now);
        filter.frequency.exponentialRampToValueAtTime(2000, now + 0.2);
        filter.frequency.exponentialRampToValueAtTime(150, now + 1.2);
        filter.Q.value = 2;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 1.3);

        // Noise whoosh layer
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffers.boostWhoosh;

        const nf = this.ctx.createBiquadFilter();
        nf.type = 'highpass';
        nf.frequency.setValueAtTime(1000, now);
        nf.frequency.exponentialRampToValueAtTime(4000, now + 0.15);
        nf.frequency.exponentialRampToValueAtTime(800, now + 0.8);

        const ng = this.ctx.createGain();
        ng.gain.setValueAtTime(0, now);
        ng.gain.linearRampToValueAtTime(0.1, now + 0.05);
        ng.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

        noise.connect(nf);
        nf.connect(ng);
        ng.connect(this.sfxGain);
        noise.start(now);
    }

    // ═══════════════════════════════════════════════════════════
    //  UI CLICK SFX — Subtle blip
    // ═══════════════════════════════════════════════════════════

    playUIClick() {
        if (!this.initialized || this.muted) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 1200;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.1);
    }

    // ═══════════════════════════════════════════════════════════
    //  BUG SQUASH — quick zap
    // ═══════════════════════════════════════════════════════════
    playBugSquash() {
        if (!this.initialized || this.muted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(2200, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.2, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(g); g.connect(this.sfxGain);
        osc.start(now); osc.stop(now + 0.2);
    }

    // ═══════════════════════════════════════════════════════════
    //  TENSOR COLLECT — dual chime
    // ═══════════════════════════════════════════════════════════
    playTensorCollect() {
        if (!this.initialized || this.muted) return;
        const now = this.ctx.currentTime;
        [880, 1320].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sine'; osc.frequency.value = freq;
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0, now + i * 0.06);
            g.gain.linearRampToValueAtTime(0.12, now + i * 0.06 + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
            osc.connect(g); g.connect(this.sfxGain); g.connect(this.reverb);
            osc.start(now + i * 0.06); osc.stop(now + 0.5);
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  GC FREED — vacuum whoosh + ding
    // ═══════════════════════════════════════════════════════════
    playGCFreed() {
        if (!this.initialized || this.muted) return;
        const now = this.ctx.currentTime;
        // Whoosh
        const n = this.ctx.createBufferSource();
        n.buffer = this.noiseBuffers.gcWhoosh;
        const nf = this.ctx.createBiquadFilter();
        nf.type = 'bandpass'; nf.frequency.setValueAtTime(2000, now);
        nf.frequency.exponentialRampToValueAtTime(200, now + 0.4);
        const ng = this.ctx.createGain();
        ng.gain.setValueAtTime(0.15, now);
        ng.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        n.connect(nf); nf.connect(ng); ng.connect(this.sfxGain); n.start(now);
        // Ding
        const osc = this.ctx.createOscillator();
        osc.type = 'sine'; osc.frequency.value = 660;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.15, now + 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.connect(g); g.connect(this.sfxGain); g.connect(this.reverb);
        osc.start(now + 0.1); osc.stop(now + 0.7);
    }

    // ═══════════════════════════════════════════════════════════
    //  MUTE / UNMUTE
    // ═══════════════════════════════════════════════════════════

    setMuted(muted) {
        this.muted = muted;
        if (!this.initialized) return;
        const now = this.ctx.currentTime;
        this.masterGain.gain.linearRampToValueAtTime(muted ? 0 : 0.7, now + 0.3);
    }

    toggleMute() {
        this.setMuted(!this.muted);
        return this.muted;
    }
}
