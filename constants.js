/**
 * TOY_BOX.IO — Shared Constants
 * Single source of truth for colors, physics values, and configuration.
 */
import * as THREE from 'three';

export const COLORS = {
    bg:         0x0a0612,
    primary:    0xffb3ae,
    container:  0xff5352,
    secondary:  0xffade5,
    tertiary:   0xc2c1ff,
    dark:       0x201828,
    cabin:      0x130b1a,
};

// ── Deep Space Palette ─────────────────────────────────────
export const SPACE = {
    // Background gradient (dark → mid)
    bgDeep:     0x050310,
    bgMid:      0x0a0612,

    // Nebula cloud tints
    nebula1:    0x1a0a3e,   // deep violet
    nebula2:    0x0c1638,   // midnight blue
    nebula3:    0x200826,   // dark magenta
    nebula4:    0x08102a,   // navy ink

    // Star layer tints
    starWarm:   0xffddb3,   // warm white
    starCool:   0xb3d4ff,   // cool blue-white
    starAccent: 0xffb3ae,   // pink (primary)

    // Volumetric / god-ray hints
    volumetric: 0x1a1040,

    // Grid floor
    gridPrimary:   0x2a1845,
    gridSecondary: 0x1a0e2e,
    gridEmissive:  0x6c3baa,

    // Fog layers
    fogNear:    0x08041a,
    fogColor:   0x0a0612,
    fogDensity: 0.004,

    // Ambient dust
    dustColor:  0x9070c0,
};

export const FONT_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json';

// Ship flight
export const SHIP_SPEED   = 40;
export const BOOST_MULT   = 2.5;
export const ROTATE_SPEED = 2.2;
export const THRUST_APPROACH_PER_SEC = 10;
export const COAST_APPROACH_PER_SEC = 6.5;
export const JOY_DEADZONE = 0.08;

// Camera
export const CAM_FOLLOW_PER_FRAME = 0.06;
export const CAM_OFFSET = new THREE.Vector3(0, 6, -18);
export const SHAKE_FRAME_DECAY = 0.92;
export const FLIGHT_REF_FPS = 60;

// Letter physics
export const LETTER_MASS = 1;
export const GRAVITY_VAL = -9.8;

// Trail
export const TRAIL_LEN = 120;

// ── Project Orbs Data ──────────────────────────────────────
export const PROJECT_ORBS = [
    {
        name: 'Chewsy',
        tech: 'React · Firebase · Framer Motion',
        tagline: '"Tinder for food decisions"',
        desc: 'Group restaurant matching with Tinder-style swipes, live Firebase sync, and QR room joins.',
        github: null,
        demo: 'https://chewsy-51ce4.web.app',
        preview: 'assets/preview-chewsy.png',
        badges: ['Web App', 'Real-time'],
        color: 0xff6b9d,
        innerModel: 'torus',
    },
    {
        name: 'T-MINUS',
        tech: 'Vanilla JS · Canvas API · Glassmorphism',
        tagline: '"Countdowns, but cinematic"',
        desc: 'A sleek global countdown platform applying glassmorphism UI and custom starfield particle physics.',
        github: 'https://github.com/RoyWG925/T-MINUS',
        demo: 'https://roywg925.github.io/T-MINUS/',
        preview: 'assets/preview-tminus.png',
        badges: ['UI/UX', 'Canvas'],
        color: 0x54a0ff,
        innerModel: 'icosahedron',
    },
    {
        name: 'GridReactor Engine',
        tech: 'Godot Engine · GDScript',
        tagline: '"Physics-based roguelite madness"',
        desc: 'Core systems for GigaJoule: Scrap Matrix. Multi-cell item synergy, dynamic grid adjacency, and settlement logic in Godot.',
        github: null,
        demo: null,
        preview: 'assets/preview-gridreactor.png',
        status: 'In Development',
        badges: ['Game Dev', 'System Design'],
        color: 0x1dd1a1,
        innerModel: 'octahedron',
    },
    {
        name: 'Market Sentiment vs TAIEX',
        tech: 'Python · PyTorch (BERT) · SQLite',
        tagline: '"Predicting stocks with PTT memes"',
        desc: 'Fine-tuned a BERT classifier on 20,000+ PTT Stock posts (F1 from 0.23 to 0.68) and compared sentiment volatility with TAIEX returns.',
        github: 'https://github.com/RoyWG925/ptt-sentiment-stock-analysis',
        demo: null,
        preview: 'assets/preview-bert.png',
        badges: ['NLP', 'Data Engineering'],
        color: 0xfeca57,
        innerModel: 'dodecahedron',
    },
    {
        name: 'Semantic Segmentation',
        tech: 'PyTorch · SegFormer · UNet',
        tagline: '"Teaching AI to see the road"',
        desc: 'Trained SegFormer and MobileNet-UNet on 10,000 BDD100K driving images and compared mIoU and per-class accuracy.',
        github: null,
        demo: null,
        status: 'Unavailable',
        preview: 'assets/preview-bert.png',
        badges: ['Computer Vision', 'Deep Learning'],
        color: 0xff9f43,
        innerModel: 'box',
    }
];
