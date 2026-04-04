/**
 * TOY_BOX.IO — Neon Text
 * Font loading + "ROY WANG" letter mesh creation.
 */
import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { COLORS, FONT_URL } from './constants.js';

/** Array of letter objects: { mesh, glow, color, hit, vel, angVel, size } */
export let letters = [];

/**
 * Load font and create neon text. Returns a promise that resolves
 * with the letters array once the font is loaded.
 * @param {THREE.Scene} scene
 * @returns {Promise<Array>}
 */
export function loadNeonText(scene) {
    const loaderFill = document.getElementById('loader-fill');
    if (loaderFill) loaderFill.style.width = '30%';

    return new Promise((resolve) => {
        const loader = new FontLoader();
        
        // Failsafe: if loader takes too long or fails, force fade out
        const forceResolve = () => {
             if (loaderFill) loaderFill.style.width = '100%';
             setTimeout(() => document.getElementById('loading-screen')?.classList.add('fade-out'), 400);
             resolve(letters);
        };
        const failTimeout = setTimeout(forceResolve, 5000);

        loader.load(
            FONT_URL, 
            (font) => {
                clearTimeout(failTimeout);
                if (loaderFill) loaderFill.style.width = '80%';
                createNeonText(scene, font);
                forceResolve();
            },
            undefined,
            (err) => {
                console.error('Font loading failed:', err);
                clearTimeout(failTimeout);
                forceResolve();
            }
        );
    });
}

function createNeonText(scene, font) {
    const text = 'ROY WANG';
    const textColors = [
        0xffffff, 0xffffff, 0xffffff,
        0, // space
        0xff5352, 0xff5352, 0xff5352, 0xff5352,
    ];
    const size = 2;
    const depth = 0.3;
    let offsetX = 0;
    const spacing = 0.8;

    const textGroup = new THREE.Group();
    scene.add(textGroup);

    // First pass: create geometries to measure total width
    const geos = [];
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === ' ') { geos.push(null); continue; }
        const geo = new TextGeometry(ch, {
            font, size, depth,
            curveSegments: 6, bevelEnabled: true,
            bevelThickness: 0.15, bevelSize: 0.1, bevelSegments: 2,
        });
        geo.computeBoundingBox();
        geos.push(geo);
    }

    // Measure total width
    let totalW = 0;
    for (let i = 0; i < geos.length; i++) {
        if (!geos[i]) { totalW += size * 0.5; continue; }
        const bb = geos[i].boundingBox;
        totalW += (bb.max.x - bb.min.x) + spacing;
    }
    totalW -= spacing;

    // Second pass: position and create meshes
    offsetX = -totalW / 2;
    for (let i = 0; i < geos.length; i++) {
        if (!geos[i]) { offsetX += size * 0.5; continue; }
        const bb = geos[i].boundingBox;
        const w = bb.max.x - bb.min.x;
        const h = bb.max.y - bb.min.y;
        const d = bb.max.z - bb.min.z;
        const col = textColors[i] || COLORS.tertiary;

        // Core material: Sleek glowing glass
        const mat = new THREE.MeshPhysicalMaterial({
            color: 0x000000, 
            emissive: col,
            emissiveIntensity: 0.6, 
            metalness: 0.8, 
            roughness: 0.1,
            transparent: true, 
            opacity: 0.6,
            clearcoat: 1.0
        });
        const mesh = new THREE.Mesh(geos[i], mat);
        
        // Add crisp neon borders (Toned down)
        const edges = new THREE.EdgesGeometry(geos[i], 30);
        const edgeLine = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ 
            color: col, 
            transparent: true, 
            opacity: 0.3 
        }));
        mesh.add(edgeLine);
        mesh.position.set(offsetX, -size/2, 0);
        textGroup.add(mesh);

        const glow = new THREE.PointLight(col, 0.8, 8);
        glow.position.set(offsetX + w/2, 0, depth/2);
        textGroup.add(glow);

        letters.push({
            mesh,
            glow,
            color: col,
            hit: false,
            vel: new THREE.Vector3(),
            angVel: new THREE.Vector3(),
            size: new THREE.Vector3(w, h, d),
            localBox: geos[i].boundingBox.clone(),
        });

        offsetX += w + spacing;
    }

    // Rotate entire text 180° so it faces the ship's starting direction (-Z)
    textGroup.rotation.y = Math.PI;
}
