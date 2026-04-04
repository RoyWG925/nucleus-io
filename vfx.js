/**
 * TOY_BOX.IO — Visual Effects
 * Multi-layered starfield, nebula clouds, cosmic dust,
 * shader-powered grid floor, explosion particles,
 * and macro-scale cosmic elements (rings, clusters, filaments, pillars).
 */
import * as THREE from 'three';
import { COLORS, SPACE } from './constants.js';

// ── Internal state ─────────────────────────────────────────
let explosions = [];
const EXPLOSION_PARTICLES = 40;
const EXPLOSION_MAX_AGE = 2.5;
const EXPLOSION_POOL_CAP = 36;
let nebulaGroup = null;
let dustParticles = null;
let gridFloorMesh = null;
let cosmicTime = 0;

// Macro-cosmic elements
let nebulaRingMesh = null;
let starClusterMeshes = [];
let cosmicFilaments = [];
let lightPillars = [];
let cosmicHorizonArcs = [];
let deepFieldHalos = [];

// ── Multi-Layer Starfield ──────────────────────────────────
/**
 * Creates a 3-layer parallax starfield with varying brightness,
 * size, and color temperature for cinematic depth.
 */
export function createStarfield(scene) {
    const layers = [
        { count: 2000, spread: 1800, size: 0.5,  opacity: 0.35, colors: [0x8899bb, 0x667799, 0x556688] },      // Far — dim, small, cool
        { count: 1800, spread: 1200, size: 1.0,  opacity: 0.6,  colors: [0xffddb3, 0xb3d4ff, 0xffffff] },      // Mid — varied temp
        { count: 600,  spread: 900,  size: 1.8,  opacity: 0.9,  colors: [COLORS.primary, COLORS.tertiary, COLORS.secondary, 0xffffff] },  // Near — vivid, large
    ];

    for (const layer of layers) {
        const geo  = new THREE.BufferGeometry();
        const pos  = new Float32Array(layer.count * 3);
        const cols = new Float32Array(layer.count * 3);
        const sizes = new Float32Array(layer.count);

        for (let i = 0; i < layer.count; i++) {
            pos[i * 3]     = (Math.random() - 0.5) * layer.spread;
            pos[i * 3 + 1] = (Math.random() - 0.5) * layer.spread;
            pos[i * 3 + 2] = (Math.random() - 0.5) * layer.spread;

            const c = new THREE.Color(layer.colors[Math.floor(Math.random() * layer.colors.length)]);
            cols[i * 3]     = c.r;
            cols[i * 3 + 1] = c.g;
            cols[i * 3 + 2] = c.b;

            // Random size jitter within layer range
            sizes[i] = layer.size * (0.5 + Math.random());
        }

        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('color',    new THREE.BufferAttribute(cols, 3));
        geo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

        const mat = new THREE.PointsMaterial({
            size: layer.size,
            vertexColors: true,
            transparent: true,
            opacity: layer.opacity,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        scene.add(new THREE.Points(geo, mat));
    }

    // ── Bright "hero" stars (handful of very large, bright specks) ──
    createHeroStars(scene);
}

/**
 * Scatter a few dozen brilliant stars with soft glow sprites.
 */
function createHeroStars(scene) {
    const count = 35;
    const geo   = new THREE.BufferGeometry();
    const pos   = new Float32Array(count * 3);
    const cols  = new Float32Array(count * 3);

    const heroColors = [0xffffff, 0xffeedd, 0xddeeff, 0xffb3ae, 0xc2c1ff];

    for (let i = 0; i < count; i++) {
        pos[i * 3]     = (Math.random() - 0.5) * 1600;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 1200;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 1600;

        const c = new THREE.Color(heroColors[Math.floor(Math.random() * heroColors.length)]);
        cols[i * 3]     = c.r;
        cols[i * 3 + 1] = c.g;
        cols[i * 3 + 2] = c.b;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(cols, 3));

    const mat = new THREE.PointsMaterial({
        size: 4.0,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });

    scene.add(new THREE.Points(geo, mat));
}

// ── Nebula Clouds ──────────────────────────────────────────
/**
 * Creates soft, transparent nebula cloud planes scattered at various
 * distances and orientations. They slowly rotate for organic feel.
 */
export function createNebulaClouds(scene) {
    nebulaGroup = new THREE.Group();

    const nebulaConfigs = [
        { pos: [250, 60, -400],   scale: 320, color: SPACE.nebula1, rot: [0.2, 0.4, 0.1],  opacity: 0.06 },
        { pos: [-300, 100, -500], scale: 400, color: SPACE.nebula2, rot: [-0.3, 0.1, 0.5], opacity: 0.05 },
        { pos: [100, -80, -350],  scale: 280, color: SPACE.nebula3, rot: [0.5, -0.2, 0.3], opacity: 0.07 },
        { pos: [-150, 150, 300],  scale: 350, color: SPACE.nebula4, rot: [0.1, 0.6, -0.2], opacity: 0.04 },
        { pos: [400, -40, 200],   scale: 260, color: SPACE.nebula1, rot: [-0.4, 0.3, 0.6], opacity: 0.05 },
        { pos: [-50, 200, -600],  scale: 500, color: SPACE.nebula2, rot: [0.3, -0.5, 0.1], opacity: 0.035 },
        { pos: [350, -120, -100], scale: 220, color: SPACE.nebula3, rot: [0.6, 0.1, -0.4], opacity: 0.055 },
    ];

    for (const cfg of nebulaConfigs) {
        // Use two overlapping planes at slight angles for volume
        for (let j = 0; j < 2; j++) {
            const geo = new THREE.PlaneGeometry(cfg.scale, cfg.scale);
            const mat = new THREE.ShaderMaterial({
                uniforms: {
                    uColor:   { value: new THREE.Color(cfg.color) },
                    uOpacity: { value: cfg.opacity * (j === 0 ? 1.0 : 0.6) },
                    uTime:    { value: 0 },
                },
                vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform vec3 uColor;
                    uniform float uOpacity;
                    uniform float uTime;
                    varying vec2 vUv;

                    // Simplex-style noise hash
                    float hash(vec2 p) {
                        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
                    }
                    float noise(vec2 p) {
                        vec2 i = floor(p);
                        vec2 f = fract(p);
                        f = f * f * (3.0 - 2.0 * f);
                        float a = hash(i);
                        float b = hash(i + vec2(1.0, 0.0));
                        float c = hash(i + vec2(0.0, 1.0));
                        float d = hash(i + vec2(1.0, 1.0));
                        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
                    }
                    float fbm(vec2 p) {
                        float v = 0.0;
                        float a = 0.5;
                        for (int i = 0; i < 5; i++) {
                            v += a * noise(p);
                            p *= 2.0;
                            a *= 0.5;
                        }
                        return v;
                    }

                    void main() {
                        vec2 uv = vUv - 0.5;
                        float dist = length(uv);

                        // Soft radial falloff
                        float falloff = 1.0 - smoothstep(0.0, 0.5, dist);
                        falloff = pow(falloff, 1.5);

                        // Animated fractal noise
                        float t = uTime * 0.02;
                        float n = fbm(vUv * 3.0 + t);
                        n = n * 0.6 + 0.4;

                        float alpha = falloff * n * uOpacity;

                        gl_FragColor = vec4(uColor, alpha);
                    }
                `,
                transparent: true,
                depthWrite: false,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
            });

            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(
                cfg.pos[0] + (j * 30),
                cfg.pos[1] + (j * 20),
                cfg.pos[2] + (j * -15),
            );
            mesh.rotation.set(
                cfg.rot[0] + (j * 0.3),
                cfg.rot[1] + (j * 0.2),
                cfg.rot[2],
            );
            nebulaGroup.add(mesh);
        }
    }

    scene.add(nebulaGroup);
}

// ── Cosmic Dust Particles ──────────────────────────────────
/**
 * Floating micro-particles that drift slowly, adding life to the void.
 */
export function createCosmicDust(scene) {
    const count = 800;
    const geo   = new THREE.BufferGeometry();
    const pos   = new Float32Array(count * 3);
    const vels  = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        pos[i * 3]     = (Math.random() - 0.5) * 600;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 400;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 600;

        // Very slow drift velocities
        vels[i * 3]     = (Math.random() - 0.5) * 0.3;
        vels[i * 3 + 1] = (Math.random() - 0.5) * 0.15;
        vels[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const mat = new THREE.PointsMaterial({
        color: SPACE.dustColor,
        size: 0.6,
        transparent: true,
        opacity: 0.2,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });

    dustParticles = new THREE.Points(geo, mat);
    dustParticles.userData.velocities = vels;
    scene.add(dustParticles);
}

// ── Grid Floor (Shader-Powered) ────────────────────────────
/**
 * Creates a large shader-driven grid floor with glow lines that
 * fade into the distance and softly pulse with time.
 */
export function createGridFloor(scene) {
    const geo = new THREE.PlaneGeometry(800, 800);
    const mat = new THREE.ShaderMaterial({
        uniforms: {
            uTime:        { value: 0 },
            uColor1:      { value: new THREE.Color(SPACE.gridPrimary) },
            uColor2:      { value: new THREE.Color(SPACE.gridEmissive) },
            uFogColor:    { value: new THREE.Color(SPACE.fogColor) },
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vWorldPos;
            void main() {
                vUv = uv;
                vec4 world = modelMatrix * vec4(position, 1.0);
                vWorldPos = world.xyz;
                gl_Position = projectionMatrix * viewMatrix * world;
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform vec3 uColor1;
            uniform vec3 uColor2;
            uniform vec3 uFogColor;
            varying vec2 vUv;
            varying vec3 vWorldPos;

            void main() {
                // World-space grid
                vec2 grid = abs(fract(vWorldPos.xz * 0.1) - 0.5);
                float line = min(grid.x, grid.y);
                float gridAlpha = 1.0 - smoothstep(0.0, 0.025, line);

                // Sub-grid (finer lines)
                vec2 subGrid = abs(fract(vWorldPos.xz * 0.5) - 0.5);
                float subLine = min(subGrid.x, subGrid.y);
                float subAlpha = 1.0 - smoothstep(0.0, 0.015, subLine);
                subAlpha *= 0.15;

                // Distance-based fade
                float dist = length(vWorldPos.xz);
                float distFade = 1.0 - smoothstep(40.0, 350.0, dist);

                // Subtle pulse
                float pulse = 0.85 + 0.15 * sin(uTime * 0.5 + dist * 0.01);

                // Combine
                float alpha = max(gridAlpha * 0.18, subAlpha) * distFade * pulse;

                // Color: mix from accent near center to subdued far away
                float centerMix = 1.0 - smoothstep(0.0, 200.0, dist);
                vec3 lineColor = mix(uColor1, uColor2, centerMix * 0.4);

                // Fog blend
                float fogFactor = smoothstep(100.0, 350.0, dist);
                lineColor = mix(lineColor, uFogColor, fogFactor * 0.6);

                gl_FragColor = vec4(lineColor, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -30;
    scene.add(mesh);

    // Store reference for time update
    gridFloorMesh = mesh;
}

// ── Distant Galaxy Sprites ─────────────────────────────────
/**
 * Faint spiral/elliptical galaxy sprites far away for ultimate depth.
 */
export function createDistantGalaxies(scene) {
    const count = 8;
    const galaxyColors = [0x887acc, 0x6688bb, 0x9977aa, 0x7799bb, 0x8866aa];

    for (let i = 0; i < count; i++) {
        const size = 30 + Math.random() * 50;
        const geo  = new THREE.PlaneGeometry(size, size);
        const color = new THREE.Color(galaxyColors[Math.floor(Math.random() * galaxyColors.length)]);

        const mat = new THREE.ShaderMaterial({
            uniforms: {
                uColor:  { value: color },
                uTime:   { value: Math.random() * 100 },
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 uColor;
                uniform float uTime;
                varying vec2 vUv;

                float hash(vec2 p) {
                    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
                }

                void main() {
                    vec2 uv = vUv - 0.5;
                    float dist = length(uv);

                    // Elliptical shape
                    float angle = atan(uv.y, uv.x);
                    float spiral = sin(angle * 2.0 + dist * 15.0 - uTime * 0.01) * 0.5 + 0.5;

                    // Radial falloff
                    float core = exp(-dist * 8.0);          // bright core
                    float glow = exp(-dist * 3.0) * 0.3;    // diffuse glow
                    float arms = spiral * exp(-dist * 5.0) * 0.2;

                    float alpha = (core + glow + arms) * 0.12;
                    alpha *= 1.0 - smoothstep(0.35, 0.5, dist);

                    gl_FragColor = vec4(uColor, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
        });

        const mesh = new THREE.Mesh(geo, mat);
        // Place very far away in a sphere
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.random() * Math.PI;
        const r     = 700 + Math.random() * 600;
        mesh.position.set(
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.cos(phi) * 0.5,       // flatten vertical
            r * Math.sin(phi) * Math.sin(theta),
        );
        // Random orientation so they look natural
        mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        mesh.lookAt(0, 0, 0);   // billboarding toward the center
        mesh.rotateZ(Math.random() * Math.PI * 2);

        scene.add(mesh);
    }

    // Extra macro depth layers (low object count, high scale)
    createCosmicHorizonArcs(scene);
    createDeepFieldHalos(scene);
}

// ── Cosmic Horizon Arcs (mid-far colossal structures) ──────
/**
 * Broad, faint gas arcs in the far distance to reinforce scale without
 * cluttering the play space. Uses only a few low-segment torus arcs.
 */
function createCosmicHorizonArcs(scene) {
    if (cosmicHorizonArcs.length > 0) return;

    const arcConfigs = [
        { radius: 980, tube: 12, arc: 1.55, pos: [0, -180, -1300], rot: [0.65, 0.12, 0.0], color: 0x2b145e, alpha: 0.03 },
        { radius: 1250, tube: 16, arc: 1.25, pos: [180, -220, -1650], rot: [0.58, -0.08, 0.18], color: 0x1a2f66, alpha: 0.022 },
        { radius: 820, tube: 10, arc: 1.85, pos: [-260, -140, -1100], rot: [0.7, 0.24, -0.12], color: 0x3a1d74, alpha: 0.028 },
    ];

    for (const cfg of arcConfigs) {
        const geo = new THREE.TorusGeometry(cfg.radius, cfg.tube, 10, 56, cfg.arc);
        const mat = new THREE.ShaderMaterial({
            uniforms: {
                uColor: { value: new THREE.Color(cfg.color) },
                uTime: { value: Math.random() * 100 },
                uAlpha: { value: cfg.alpha },
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 uColor;
                uniform float uTime;
                uniform float uAlpha;
                varying vec2 vUv;

                float hash(vec2 p) {
                    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
                }

                void main() {
                    float edge = sin(vUv.y * 3.14159);
                    edge = pow(edge, 1.6);
                    float band = 0.75 + 0.25 * sin(vUv.x * 24.0 + uTime * 0.04 + hash(vUv) * 6.2831);
                    float alpha = edge * band * uAlpha;
                    gl_FragColor = vec4(uColor, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
        mesh.rotation.set(cfg.rot[0], cfg.rot[1], cfg.rot[2]);
        scene.add(mesh);
        cosmicHorizonArcs.push(mesh);
    }
}

// ── Deep Field Halos (ultra-far scale shells) ──────────────
/**
 * Large, ultra-faint fresnel shells that create a "cosmic basin" feeling.
 * Back-side rendering keeps them gentle and avoids foreground distraction.
 */
function createDeepFieldHalos(scene) {
    if (deepFieldHalos.length > 0) return;

    const haloConfigs = [
        { scale: [1300, 900, 1300], pos: [0, -120, -1200], color: 0x2d2466, alpha: 0.016 },
        { scale: [1700, 1100, 1700], pos: [120, -240, -1900], color: 0x1a2f54, alpha: 0.012 },
    ];

    for (const cfg of haloConfigs) {
        const geo = new THREE.SphereGeometry(1, 20, 14);
        const mat = new THREE.ShaderMaterial({
            uniforms: {
                uColor: { value: new THREE.Color(cfg.color) },
                uAlpha: { value: cfg.alpha },
                uTime: { value: Math.random() * 100 },
            },
            vertexShader: `
                varying vec3 vNormalW;
                varying vec3 vViewDirW;
                void main() {
                    vec4 worldPos = modelMatrix * vec4(position, 1.0);
                    vNormalW = normalize(mat3(modelMatrix) * normal);
                    vViewDirW = normalize(cameraPosition - worldPos.xyz);
                    gl_Position = projectionMatrix * viewMatrix * worldPos;
                }
            `,
            fragmentShader: `
                uniform vec3 uColor;
                uniform float uAlpha;
                uniform float uTime;
                varying vec3 vNormalW;
                varying vec3 vViewDirW;

                void main() {
                    float fresnel = pow(1.0 - max(dot(normalize(vNormalW), normalize(vViewDirW)), 0.0), 2.2);
                    float pulse = 0.94 + 0.06 * sin(uTime * 0.07);
                    float alpha = fresnel * uAlpha * pulse;
                    gl_FragColor = vec4(uColor, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
        mesh.scale.set(cfg.scale[0], cfg.scale[1], cfg.scale[2]);
        scene.add(mesh);
        deepFieldHalos.push(mesh);
    }
}

// ── Nebula Ring (massive far-field structure) ──────────────
/**
 * A colossal torus-like ring of glowing gas/dust, evoking a
 * supernova remnant or planetary ring system. Placed far away
 * and slowly rotating for parallax grandeur.
 */
export function createNebulaRing(scene) {
    const geo = new THREE.TorusGeometry(420, 18, 32, 96);
    const mat = new THREE.ShaderMaterial({
        uniforms: {
            uTime:     { value: 0 },
            uColor1:   { value: new THREE.Color(0x2a1060) },
            uColor2:   { value: new THREE.Color(0x5522aa) },
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vWorldPos;
            void main() {
                vUv = uv;
                vec4 world = modelMatrix * vec4(position, 1.0);
                vWorldPos = world.xyz;
                gl_Position = projectionMatrix * viewMatrix * world;
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform vec3 uColor1;
            uniform vec3 uColor2;
            varying vec2 vUv;
            varying vec3 vWorldPos;

            float hash(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
            }
            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                float a = hash(i);
                float b = hash(i + vec2(1.0, 0.0));
                float c = hash(i + vec2(0.0, 1.0));
                float d = hash(i + vec2(1.0, 1.0));
                return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
            }
            float fbm(vec2 p) {
                float v = 0.0, a = 0.5;
                for (int i = 0; i < 4; i++) {
                    v += a * noise(p);
                    p *= 2.0;
                    a *= 0.5;
                }
                return v;
            }

            void main() {
                float t = uTime * 0.008;
                float n = fbm(vUv * 6.0 + t);

                // Cross-section fade for smooth ring edges
                float cross = sin(vUv.y * 3.14159);
                cross = pow(cross, 2.0);

                float alpha = cross * n * 0.06;
                vec3 color = mix(uColor1, uColor2, n);

                gl_FragColor = vec4(color, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
    });

    nebulaRingMesh = new THREE.Mesh(geo, mat);
    nebulaRingMesh.position.set(200, 120, -800);
    nebulaRingMesh.rotation.set(0.6, 0.3, 0.2);
    scene.add(nebulaRingMesh);
}

// ── Distant Star Clusters ──────────────────────────────────
/**
 * Dense point clouds with a bright core and diffuse halo,
 * simulating distant globular clusters or galaxy cores.
 */
export function createStarClusters(scene) {
    const clusterConfigs = [
        { pos: [-600, 180, -900], count: 350, radius: 80, color: 0xaab8ff, coreColor: 0xeeeeff },
        { pos: [700, -60, -700],  count: 280, radius: 60, color: 0xffd6b3, coreColor: 0xfff5ee },
        { pos: [-200, 300, -1100],count: 220, radius: 50, color: 0xccaaff, coreColor: 0xf0e6ff },
    ];

    for (const cfg of clusterConfigs) {
        const geo  = new THREE.BufferGeometry();
        const pos  = new Float32Array(cfg.count * 3);
        const cols = new Float32Array(cfg.count * 3);
        const sizes = new Float32Array(cfg.count);

        const coreCol = new THREE.Color(cfg.coreColor);
        const outerCol = new THREE.Color(cfg.color);

        for (let i = 0; i < cfg.count; i++) {
            // Gaussian-like distribution — denser at center
            const u = Math.random();
            const r = cfg.radius * Math.pow(u, 0.4);
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            pos[i * 3]     = cfg.pos[0] + r * Math.sin(phi) * Math.cos(theta);
            pos[i * 3 + 1] = cfg.pos[1] + r * Math.cos(phi);
            pos[i * 3 + 2] = cfg.pos[2] + r * Math.sin(phi) * Math.sin(theta);

            // Stars near center are brighter, whiter
            const t = Math.pow(u, 0.6);
            const c = new THREE.Color().lerpColors(coreCol, outerCol, t);
            cols[i * 3]     = c.r;
            cols[i * 3 + 1] = c.g;
            cols[i * 3 + 2] = c.b;

            sizes[i] = (1.0 - t) * 2.5 + 0.3;
        }

        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('color',    new THREE.BufferAttribute(cols, 3));
        geo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

        const mat = new THREE.PointsMaterial({
            size: 1.6,
            vertexColors: true,
            transparent: true,
            opacity: 0.5,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        const pts = new THREE.Points(geo, mat);
        scene.add(pts);
        starClusterMeshes.push(pts);

        // Core glow sprite — a big soft sphere at center
        const glowGeo = new THREE.PlaneGeometry(cfg.radius * 1.5, cfg.radius * 1.5);
        const glowMat = new THREE.ShaderMaterial({
            uniforms: {
                uColor: { value: new THREE.Color(cfg.coreColor) },
                uTime:  { value: Math.random() * 100 },
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 uColor;
                uniform float uTime;
                varying vec2 vUv;
                void main() {
                    vec2 uv = vUv - 0.5;
                    float dist = length(uv);
                    float glow = exp(-dist * 5.0) * 0.15;
                    float halo = exp(-dist * 2.5) * 0.05;
                    float pulse = 1.0 + 0.05 * sin(uTime * 0.15);
                    float alpha = (glow + halo) * pulse;
                    alpha *= 1.0 - smoothstep(0.4, 0.5, dist);
                    gl_FragColor = vec4(uColor, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
        });

        const glowMesh = new THREE.Mesh(glowGeo, glowMat);
        glowMesh.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
        glowMesh.lookAt(0, 0, 0);
        scene.add(glowMesh);
        starClusterMeshes.push(glowMesh);
    }
}

// ── Cosmic Filaments (gas streams) ─────────────────────────
/**
 * Long, flowing tubular structures of faint gas, evoking
 * the large-scale cosmic web filaments between galaxy clusters.
 */
export function createCosmicFilaments(scene) {
    const filamentConfigs = [
        { start: [-500, 50, -600], end: [300, 250, -1000], width: 35, color: 0x1a0a3e },
        { start: [400, -100, -400], end: [-300, 200, -800], width: 28, color: 0x0c1638 },
        { start: [-100, 280, -500], end: [500, -50, -900],  width: 22, color: 0x200826 },
    ];

    for (const cfg of filamentConfigs) {
        const s = new THREE.Vector3(...cfg.start);
        const e = new THREE.Vector3(...cfg.end);
        const mid = new THREE.Vector3().addVectors(s, e).multiplyScalar(0.5);
        // Add a random offset to the midpoint for a curved feel
        mid.x += (Math.random() - 0.5) * 200;
        mid.y += (Math.random() - 0.5) * 150;
        mid.z += (Math.random() - 0.5) * 100;

        const curve = new THREE.QuadraticBezierCurve3(s, mid, e);
        const geo = new THREE.TubeGeometry(curve, 64, cfg.width, 8, false);

        const mat = new THREE.ShaderMaterial({
            uniforms: {
                uTime:  { value: 0 },
                uColor: { value: new THREE.Color(cfg.color) },
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vNorm;
                void main() {
                    vUv = uv;
                    vNorm = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform vec3 uColor;
                varying vec2 vUv;
                varying vec3 vNorm;

                float hash(vec2 p) {
                    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
                }
                float noise(vec2 p) {
                    vec2 i = floor(p);
                    vec2 f = fract(p);
                    f = f * f * (3.0 - 2.0 * f);
                    float a = hash(i), b = hash(i + vec2(1.0, 0.0));
                    float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
                    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
                }
                float fbm(vec2 p) {
                    float v = 0.0, a = 0.5;
                    for (int i = 0; i < 4; i++) {
                        v += a * noise(p);
                        p *= 2.0;
                        a *= 0.5;
                    }
                    return v;
                }

                void main() {
                    float t = uTime * 0.01;
                    float n = fbm(vec2(vUv.x * 8.0 + t, vUv.y * 3.0));

                    // Tube cross-section fade (soft edges)
                    float cross = sin(vUv.y * 3.14159);
                    cross = pow(cross, 1.5);

                    // Taper at both ends
                    float taper = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);

                    float alpha = cross * taper * n * 0.04;

                    // Slightly brighter along the bright core line
                    vec3 col = uColor * (1.0 + n * 0.5);

                    gl_FragColor = vec4(col, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
        });

        const mesh = new THREE.Mesh(geo, mat);
        scene.add(mesh);
        cosmicFilaments.push(mesh);
    }
}

// ── Volumetric Light Pillars ───────────────────────────────
/**
 * Tall, thin columns of faint light rising from the void,
 * suggesting distant energy phenomena or stellar nurseries.
 * Billboarded planes with vertical gradient shaders.
 */
export function createLightPillars(scene) {
    const pillarConfigs = [
        { pos: [450, 0, -650],   height: 500, width: 20, color: 0x5533aa },
        { pos: [-380, 0, -550],  height: 400, width: 16, color: 0x3355bb },
        { pos: [150, 0, -850],   height: 550, width: 24, color: 0x6644aa },
        { pos: [-550, 0, -750],  height: 350, width: 14, color: 0x4466cc },
    ];

    for (const cfg of pillarConfigs) {
        const geo = new THREE.PlaneGeometry(cfg.width, cfg.height);
        const mat = new THREE.ShaderMaterial({
            uniforms: {
                uTime:  { value: Math.random() * 100 },
                uColor: { value: new THREE.Color(cfg.color) },
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform vec3 uColor;
                varying vec2 vUv;

                void main() {
                    // Horizontal fade (thin at edges)
                    float hFade = 1.0 - pow(abs(vUv.x - 0.5) * 2.0, 2.0);

                    // Vertical gradient — brighter near base, fading upward
                    float vFade = pow(1.0 - vUv.y, 1.8);
                    // Also dimmer at very bottom
                    vFade *= smoothstep(0.0, 0.08, vUv.y);

                    // Subtle flicker
                    float flicker = 0.9 + 0.1 * sin(uTime * 0.2 + vUv.y * 10.0);

                    float alpha = hFade * vFade * flicker * 0.04;

                    gl_FragColor = vec4(uColor, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(cfg.pos[0], cfg.pos[1] + cfg.height * 0.4, cfg.pos[2]);
        scene.add(mesh);
        lightPillars.push(mesh);

        // Add a perpendicular copy for cross-billboard volume
        const mesh2 = new THREE.Mesh(geo.clone(), mat.clone());
        mesh2.position.copy(mesh.position);
        mesh2.rotation.y = Math.PI / 2;
        scene.add(mesh2);
        lightPillars.push(mesh2);
    }
}

// ── Update Environment (call per frame) ────────────────────
/**
 * Tick nebula shader time, drift cosmic dust, pulse grid floor,
 * and animate all macro-cosmic elements.
 * @param {number} dt — delta time in seconds
 */
export function updateEnvironment(dt) {
    cosmicTime += dt;

    // Nebula cloud shader time
    if (nebulaGroup) {
        for (const child of nebulaGroup.children) {
            if (child.material && child.material.uniforms && child.material.uniforms.uTime) {
                child.material.uniforms.uTime.value = cosmicTime;
            }
        }
        // Slow group rotation for parallax feel
        nebulaGroup.rotation.y += dt * 0.003;
    }

    // Cosmic dust drift
    if (dustParticles) {
        const posArr = dustParticles.geometry.attributes.position.array;
        const vels   = dustParticles.userData.velocities;
        const count  = posArr.length / 3;
        for (let i = 0; i < count; i++) {
            posArr[i * 3]     += vels[i * 3]     * dt;
            posArr[i * 3 + 1] += vels[i * 3 + 1] * dt;
            posArr[i * 3 + 2] += vels[i * 3 + 2] * dt;

            // Wrap around if drifted too far
            for (let a = 0; a < 3; a++) {
                const limit = a === 1 ? 200 : 300;
                if (posArr[i * 3 + a] > limit)  posArr[i * 3 + a] = -limit;
                if (posArr[i * 3 + a] < -limit) posArr[i * 3 + a] = limit;
            }
        }
        dustParticles.geometry.attributes.position.needsUpdate = true;

        // Subtle breathing opacity
        dustParticles.material.opacity = 0.18 + 0.04 * Math.sin(cosmicTime * 0.3);
    }

    // Grid floor shader time
    if (gridFloorMesh && gridFloorMesh.material.uniforms) {
        gridFloorMesh.material.uniforms.uTime.value = cosmicTime;
    }

    // ── Macro-cosmic element updates ──

    // Nebula ring — slow rotation + shader time
    if (nebulaRingMesh) {
        nebulaRingMesh.rotation.z += dt * 0.004;
        nebulaRingMesh.rotation.y += dt * 0.001;
        if (nebulaRingMesh.material.uniforms) {
            nebulaRingMesh.material.uniforms.uTime.value = cosmicTime;
        }
    }

    // Star cluster core glows — tick time for pulse
    for (const obj of starClusterMeshes) {
        if (obj.material && obj.material.uniforms && obj.material.uniforms.uTime) {
            obj.material.uniforms.uTime.value = cosmicTime;
        }
    }

    // Cosmic filaments — shader time
    for (const mesh of cosmicFilaments) {
        if (mesh.material && mesh.material.uniforms) {
            mesh.material.uniforms.uTime.value = cosmicTime;
        }
    }

    // Light pillars — shader time
    for (const mesh of lightPillars) {
        if (mesh.material && mesh.material.uniforms) {
            mesh.material.uniforms.uTime.value = cosmicTime;
        }
    }

    // Horizon arcs — very slow drift for parallax scale
    for (let i = 0; i < cosmicHorizonArcs.length; i++) {
        const mesh = cosmicHorizonArcs[i];
        mesh.rotation.z += dt * (0.0007 + i * 0.00015);
        mesh.rotation.y += dt * 0.00025;
        if (mesh.material && mesh.material.uniforms) {
            mesh.material.uniforms.uTime.value = cosmicTime;
        }
    }

    // Deep-field halos — nearly static breathing to keep scene alive
    for (const mesh of deepFieldHalos) {
        if (mesh.material && mesh.material.uniforms) {
            mesh.material.uniforms.uTime.value = cosmicTime;
        }
    }
}

// ── Explosions ─────────────────────────────────────────────
export function preloadExplosions(scene) {
    if (explosions.length > 0) return;
    for (let i = 0; i < EXPLOSION_POOL_CAP; i++) {
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(EXPLOSION_PARTICLES * 3);
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

        const mat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.5,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        const pts = new THREE.Points(geo, mat);
        pts.visible = false;
        // Move them far away initially to prevent frustum culling issues during warmup
        pts.position.set(0, -9999, 0); 
        scene.add(pts);

        explosions.push({
            pts,
            velArr: new Float32Array(EXPLOSION_PARTICLES * 3),
            age: 0,
            maxAge: EXPLOSION_MAX_AGE,
            active: false,
        });
    }
}

/**
 * Spawn an explosion particle burst at a world position.
 * @param {THREE.Scene} scene
 * @param {THREE.Vector3} position
 * @param {number} color — hex color
 */
export function createExplosion(scene, position, color) {
    let e = explosions.find((x) => !x.active);

    if (!e) return;

    const arr = e.pts.geometry.attributes.position.array;
    for (let i = 0; i < EXPLOSION_PARTICLES; i++) {
        const i3 = i * 3;
        arr[i3] = position.x;
        arr[i3 + 1] = position.y;
        arr[i3 + 2] = position.z;

        e.velArr[i3] = (Math.random() - 0.5) * 20;
        e.velArr[i3 + 1] = (Math.random() - 0.5) * 20;
        e.velArr[i3 + 2] = (Math.random() - 0.5) * 20;
    }

    e.pts.geometry.attributes.position.needsUpdate = true;
    e.pts.material.color.setHex(color);
    e.pts.material.opacity = 1;
    e.age = 0;
    e.active = true;
    e.pts.visible = true;
}

/**
 * Tick all active explosions. Call once per frame.
 * @param {THREE.Scene} scene
 * @param {number} dt — delta time in seconds
 */
export function updateExplosions(scene, dt) {
    for (let i = explosions.length - 1; i >= 0; i--) {
        const e = explosions[i];
        if (!e.active) continue;
        e.age += dt;
        if (e.age >= e.maxAge) {
            e.active = false;
            e.pts.visible = false;
            continue;
        }
        const arr = e.pts.geometry.attributes.position.array;
        const vel = e.velArr;
        for (let j = 0; j < EXPLOSION_PARTICLES; j++) {
            const j3 = j * 3;
            arr[j3] += vel[j3] * dt;
            arr[j3 + 1] += vel[j3 + 1] * dt;
            arr[j3 + 2] += vel[j3 + 2] * dt;
            vel[j3] *= 0.98;
            vel[j3 + 1] *= 0.98;
            vel[j3 + 2] *= 0.98;
        }
        e.pts.geometry.attributes.position.needsUpdate = true;
        e.pts.material.opacity = 1 - (e.age / e.maxAge);
    }
}
