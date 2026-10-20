/**
 * TOY_BOX.IO — Scene Setup
 * Renderer, camera, post-processing pipeline, cinematic lighting, and resize handler.
 *
 * Post-processing chain:
 *   RenderPass → UnrealBloomPass → Vignette → ChromaticAberration → FilmGrain → OutputPass
 */
import * as THREE from 'three';
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass }      from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass }      from 'three/addons/postprocessing/OutputPass.js';
import { COLORS, SPACE }   from './constants.js';

// ── Custom Shader: Vignette ────────────────────────────────
const VignetteShader = {
    uniforms: {
        tDiffuse:  { value: null },
        offset:    { value: 1.2 },
        darkness:  { value: 1.4 },
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float offset;
        uniform float darkness;
        varying vec2 vUv;
        void main() {
            vec4 texel = texture2D(tDiffuse, vUv);
            vec2 uv = (vUv - 0.5) * 2.0;
            float vig = clamp(1.0 - dot(uv, uv) * 0.35, 0.0, 1.0);
            vig = pow(vig, darkness);
            texel.rgb *= mix(0.25, 1.0, vig);
            gl_FragColor = texel;
        }
    `,
};

// ── Custom Shader: Subtle Chromatic Aberration ─────────────
const ChromaAberrationShader = {
    uniforms: {
        tDiffuse: { value: null },
        amount:   { value: 0.0012 },
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float amount;
        varying vec2 vUv;
        void main() {
            vec2 dir = vUv - 0.5;
            float dist = length(dir);
            float aberr = amount * dist * dist;
            float r = texture2D(tDiffuse, vUv - dir * aberr).r;
            float g = texture2D(tDiffuse, vUv).g;
            float b = texture2D(tDiffuse, vUv + dir * aberr).b;
            gl_FragColor = vec4(r, g, b, 1.0);
        }
    `,
};

// ── Custom Shader: Film Grain (cinematic noise) ────────────
const FilmGrainShader = {
    uniforms: {
        tDiffuse:  { value: null },
        time:      { value: 0 },
        intensity: { value: 0.06 },
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float time;
        uniform float intensity;
        varying vec2 vUv;
        float rand(vec2 co) {
            return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
        }
        void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            float noise = (rand(vUv * time) - 0.5) * intensity;
            color.rgb += noise;
            gl_FragColor = color;
        }
    `,
};

// ── Custom Shader: Warp Speed (Radial Stretch) ─────────────
const WarpSpeedShader = {
    uniforms: {
        tDiffuse: { value: null },
        uSpeed:   { value: 0.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uSpeed;
        varying vec2 vUv;
        void main() {
            vec2 center = vec2(0.5, 0.5);
            vec2 toCenter = vUv - center;
            
            // Start stretching only when speed > 60
            float stretchFactor = max(0.0, (uSpeed - 60.0)) * 0.0006;
            
            vec4 color = vec4(0.0);
            float totalWeight = 0.0;
            const int samples = 12;
            
            for(int i = 0; i < samples; i++) {
                float f = float(i) / float(samples - 1);
                float weight = 1.0 - f;
                
                // Sample along the radial line toward the center
                vec2 sampleUv = vUv - toCenter * stretchFactor * f;
                color += texture2D(tDiffuse, sampleUv) * weight;
                totalWeight += weight;
            }
            gl_FragColor = color / totalWeight;
        }
    `
};

// ── Exported State ─────────────────────────────────────────
export let scene, camera, renderer, composer, clock, warpPass;
export let bloomPass, vignettePass, chromaPass, filmGrainPass;

export const QUALITY_STORAGE_KEY = 'renderQuality';

export const QUALITY_TIERS = {
    high: {
        maxPixelRatio: 2,
        passes: { bloom: true, vignette: true, chroma: true, grain: true, filmGrain: true, warp: true },
        physicalShells: true,
        vfxLowDensity: false,
    },
    medium: {
        maxPixelRatio: 1,
        passes: { bloom: true, vignette: true, chroma: false, grain: false, filmGrain: false, warp: true },
        physicalShells: true,
        vfxLowDensity: false,
    },
    low: {
        maxPixelRatio: 0.75,
        passes: { bloom: false, vignette: true, chroma: false, grain: false, filmGrain: false, warp: false },
        physicalShells: false,
        vfxLowDensity: true,
    },
};

export function normalizeQuality(quality) {
    return quality === 'low' || quality === 'medium' || quality === 'high' ? quality : 'high';
}

export function getQualityPassFlags(quality) {
    return { ...QUALITY_TIERS[normalizeQuality(quality)].passes };
}

export function getQualityConfig(quality) {
    return QUALITY_TIERS[normalizeQuality(quality)];
}

export function readStoredQuality(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
    try {
        const saved = storage?.getItem(QUALITY_STORAGE_KEY);
        if (saved === 'high' || saved === 'medium' || saved === 'low') {
            return saved;
        }
    } catch {
        return null;
    }
    return null;
}

export function writeStoredQuality(quality, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
    const normalized = normalizeQuality(quality);
    try {
        storage?.setItem(QUALITY_STORAGE_KEY, normalized);
    } catch {
        return normalized;
    }
    return normalized;
}

export function isCoarseOrSmallViewport(win = typeof window !== 'undefined' ? window : null) {
    if (!win) return false;
    const coarse =
        Boolean(win.matchMedia?.('(pointer: coarse)').matches) ||
        Boolean(win.matchMedia?.('(any-pointer: coarse) and (hover: none)').matches);
    const smallViewport =
        Boolean(win.matchMedia?.('(max-width: 768px)').matches) ||
        (typeof win.innerWidth === 'number' && win.innerWidth <= 768);
    return coarse || smallViewport;
}

export function resolveInitialQuality({
    savedQuality = readStoredQuality(),
    coarseOrSmall = isCoarseOrSmallViewport(),
} = {}) {
    if (savedQuality === 'high' || savedQuality === 'medium' || savedQuality === 'low') {
        return savedQuality;
    }
    return coarseOrSmall ? 'low' : 'high';
}

let currentQuality = resolveInitialQuality();

export function getRenderQuality() {
    return currentQuality;
}

export function getQualityPixelRatio(
    quality = currentQuality,
    devicePixelRatio = (typeof window !== 'undefined' && window.devicePixelRatio) || 1,
) {
    const tier = normalizeQuality(quality);
    if (tier === 'low') return 0.75;
    if (tier === 'medium') return 1;
    return Math.min(devicePixelRatio, 2);
}

export function syncQualityButtons(quality = currentQuality) {
    if (typeof document === 'undefined') return;
    const activeTier = normalizeQuality(quality);
    document.querySelectorAll('.sp-toggle').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.quality === activeTier);
    });
}

export function applyRenderQuality(quality) {
    currentQuality = normalizeQuality(quality);
    const flags = getQualityPassFlags(currentQuality);
    const pixelRatio = getQualityPixelRatio(currentQuality);

    if (renderer) {
        renderer.setPixelRatio(pixelRatio);
    }
    if (composer) {
        composer.setPixelRatio(pixelRatio);
    }
    if (bloomPass) {
        bloomPass.enabled = flags.bloom;
        if (typeof window !== 'undefined') {
            bloomPass.resolution.set(window.innerWidth * pixelRatio, window.innerHeight * pixelRatio);
        }
    }
    if (vignettePass) vignettePass.enabled = flags.vignette;
    if (chromaPass) chromaPass.enabled = flags.chroma;
    if (filmGrainPass) filmGrainPass.enabled = flags.grain;
    if (warpPass) {
        warpPass.enabled = flags.warp;
        if (!flags.warp) warpPass.uniforms.uSpeed.value = 0;
    }
    syncQualityButtons(currentQuality);
    return currentQuality;
}

/**
 * Create the core Three.js scene, renderer, camera, cinematic lighting,
 * and a full post-processing pipeline.
 */
export function initScene() {
    clock = new THREE.Clock();

    // ─── Renderer ──────────────────────────────────────────
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping          = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure  = 0.95;
    renderer.outputColorSpace     = THREE.SRGBColorSpace;
    document.getElementById('three-container').appendChild(renderer.domElement);

    // ─── Scene ─────────────────────────────────────────────
    scene = new THREE.Scene();
    scene.background = new THREE.Color(SPACE.bgDeep);

    // Exponential fog — fades distant objects into the void
    scene.fog = new THREE.FogExp2(SPACE.fogColor, SPACE.fogDensity);

    // ─── Camera ────────────────────────────────────────────
    camera = new THREE.PerspectiveCamera(
        58,
        window.innerWidth / window.innerHeight,
        0.1,
        3000,
    );
    camera.position.set(0, 8, -25);

    // ─── Post-Processing Pipeline ──────────────────────────
    composer = new EffectComposer(renderer);

    // 1 — Render the scene
    composer.addPass(new RenderPass(scene, camera));

    // 2 — Bloom (cinematic glow)
    bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.9,    // strength — keep glow cinematic but controlled
        0.62,   // radius — smoother spread for far-field structures
        0.42,   // threshold — avoid over-blooming gameplay focal objects
    );
    composer.addPass(bloomPass);

    // 3 — Vignette (darken edges for cinematic framing)
    vignettePass = new ShaderPass(VignetteShader);
    composer.addPass(vignettePass);

    // 4 — Chromatic aberration (subtle lens imperfection)
    chromaPass = new ShaderPass(ChromaAberrationShader);
    composer.addPass(chromaPass);

    // 5 — Film grain (life-like texture)
    filmGrainPass = new ShaderPass(FilmGrainShader);
    composer.addPass(filmGrainPass);

    // 6 — Warp Speed (radial stretch during boost)
    warpPass = new ShaderPass(WarpSpeedShader);
    composer.addPass(warpPass);

    // 7 — Output (tone-mapping / color-space conversion)
    composer.addPass(new OutputPass());

    currentQuality = resolveInitialQuality();
    applyRenderQuality(currentQuality);

    // ─── Lighting: Cinematic 3-Point + Volumetric Accents ──

    // Key light — warm pinkish directional (hero fill)
    const keyLight = new THREE.DirectionalLight(0xffd0e8, 0.55);
    keyLight.position.set(15, 30, -15);
    scene.add(keyLight);

    // Fill light — cool blue ambient for depth
    const fillLight = new THREE.AmbientLight(0x221144, 0.65);
    scene.add(fillLight);

    // Rim / back light — violet accent from below-behind
    const rimLight = new THREE.DirectionalLight(0x8855cc, 0.35);
    rimLight.position.set(-20, -10, 20);
    scene.add(rimLight);

    // Far accent — a subtle warm point light to the side (distant star glow)
    const accentLight = new THREE.PointLight(0xff9966, 0.5, 600, 1.8);
    accentLight.position.set(200, 80, -300);
    scene.add(accentLight);

    // Cold accent — icy blue point light opposite side
    const coldAccent = new THREE.PointLight(0x4488ff, 0.35, 500, 1.8);
    coldAccent.position.set(-250, 40, 150);
    scene.add(coldAccent);

    // Hemisphere light — sky/ground subtle gradient fill
    const hemiLight = new THREE.HemisphereLight(0x1a0a3e, 0x050310, 0.3);
    scene.add(hemiLight);

    // ─── Settings Listeners ─────────────────────────────────
    window.addEventListener('updateBloomIntensity', (e) => {
        if (bloomPass) {
            bloomPass.strength = 1.8 * e.detail; // e.detail is 0.0 to 1.0 (default is 0.5 for 0.9 bloom)
        }
    });

    window.addEventListener('updateRenderQuality', (e) => {
        applyRenderQuality(e.detail);
    });

    // ─── Resize Handler ────────────────────────────────────
    window.addEventListener('resize', onResize);
}

/**
 * Call once per frame (before composer.render) to update time-based uniforms.
 * Note: the main animate loop in app.js calls composer.render() which triggers
 * all passes. The film grain needs its time uniform updated externally.
 */
export function updateSceneUniforms() {
    if (filmGrainPass && filmGrainPass.enabled) {
        filmGrainPass.uniforms.time.value = performance.now() * 0.001;
    }
}

// ── Resize ─────────────────────────────────────────────────
function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pixelRatio = getQualityPixelRatio(currentQuality);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(w, h);
    composer.setPixelRatio(pixelRatio);
    composer.setSize(w, h);

    if (bloomPass) {
        bloomPass.resolution.set(w * pixelRatio, h * pixelRatio);
    }
}
