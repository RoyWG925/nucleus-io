/**
 * TOY_BOX.IO — Developer Humor Game Mechanics
 * GC (Garbage Collector), Space Bugs, Project Orbs (replaces Tensors)
 */
import * as THREE from 'three';
import { PROJECT_ORBS } from './constants.js';

let _scene, _ship, _audio, _explode;
const GC_POS = new THREE.Vector3(38, 5, 28);
const GC_R = 15;  // 難度調整：加大收集區半徑（原 9）
let gcRing, gcLight, gcLabel;
let gcCubes = [];
let bugs = [];
let projectOrbs = [];
let orbsCollected = 0;
const orbsTotal = PROJECT_ORBS.length;
let mechanicsTime = 0;
const transientLights = [];

// ── Exported for raycasting ────────────────────────────────
export { projectOrbs };

// ── Init ───────────────────────────────────────────────────
export function initMechanics(deps) {
    _scene = deps.scene; _ship = deps.shipGroup;
    _audio = deps.audio; _explode = deps.createExplosion;
    buildGC(); buildBugs(); buildProjectOrbs(); updateOrbUI();
}

// ── Sprite Label Helper ────────────────────────────────────
function makeLabel(text, color, fontSize = 32, w = 256, h = 64) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.font = `bold ${fontSize}px monospace`; x.fillStyle = color;
    x.textAlign = 'center'; x.fillText(text, w / 2, h * 0.65);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(c), transparent: true, depthTest: false
    }));
    s.scale.set(w / 32, h / 32, 1);
    return s;
}

// ── Log Message UI ─────────────────────────────────────────
function showLog(text, type) {
    const el = document.getElementById('game-log'); if (!el) return;
    const m = document.createElement('div');
    m.className = `log-msg ${type}`; m.textContent = text;
    el.appendChild(m); setTimeout(() => m.remove(), 3000);
}
function updateOrbUI() {
    const el = document.getElementById('tensor-text');
    if (el) el.textContent = `Epoch: ${orbsCollected} / ${orbsTotal} (Model Training...)`;
}

// ═══════════════════════════════════════════════════════════
//  1. GARBAGE COLLECTOR
// ═══════════════════════════════════════════════════════════
function buildGC() {
    // Ring
    const ringMat = new THREE.MeshStandardMaterial({
        color: 0x8382ff, emissive: 0x8382ff, emissiveIntensity: 0.7,
        transparent: true, opacity: 0.45, metalness: 0.8, roughness: 0.2,
    });
    gcRing = new THREE.Mesh(new THREE.TorusGeometry(GC_R, 0.35, 16, 48), ringMat);
    gcRing.position.copy(GC_POS); gcRing.rotation.x = Math.PI / 2;
    _scene.add(gcRing);
    gcLight = new THREE.PointLight(0x8382ff, 2.5, 25);
    gcLight.position.copy(GC_POS); _scene.add(gcLight);
    gcLabel = makeLabel('GC()', '#c2c1ff');
    gcLabel.position.set(GC_POS.x, GC_POS.y + GC_R + 2, GC_POS.z);
    _scene.add(gcLabel);

    // Memory-leak cubes（難度調整：減少數量，縮小生成範圍，更靠近 GC 區）
    for (let i = 0; i < 5; i++) {
        const sz = 0.8 + Math.random() * 1.2;
        const mat = new THREE.MeshStandardMaterial({
            color: 0x8b0000, emissive: 0xff3333, emissiveIntensity: 0.3,
            metalness: 0.6, roughness: 0.4,
        });
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(sz, sz, sz), mat);
        // 圍繞 GC_POS 附近生成，距離 GC 最多 30 單位，讓玩家容易找到並推入
        const angle = (i / 5) * Math.PI * 2;
        const dist = 15 + Math.random() * 15;
        mesh.position.set(
            GC_POS.x + Math.cos(angle) * dist,
            (Math.random() - 0.5) * 10,
            GC_POS.z + Math.sin(angle) * dist,
        );
        _scene.add(mesh);
        gcCubes.push({
            mesh,
            vel: new THREE.Vector3((Math.random()-.5)*.8, (Math.random()-.5)*.4, (Math.random()-.5)*.8),
            angVel: new THREE.Vector3((Math.random()-.5)*.4,(Math.random()-.5)*.4,(Math.random()-.5)*.4),
            collisionR2: ((sz * 0.5) + 2.2) * ((sz * 0.5) + 2.2),
        });
    }
}

// ═══════════════════════════════════════════════════════════
//  2. SPACE BUGS
// ═══════════════════════════════════════════════════════════
function buildBugs() {
    for (let i = 0; i < 6; i++) {
        const mat = new THREE.MeshStandardMaterial({
            color: 0x22ff44, emissive: 0x22ff44, emissiveIntensity: 0.8,
            metalness: 0.3, roughness: 0.5,
        });
        const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4, 0), mat);
        const angle = (i / 6) * Math.PI * 2;
        const radius = 6 + Math.random() * 5;
        mesh.position.set(Math.cos(angle) * radius, (Math.random()-.5)*3, Math.sin(angle) * radius);
        _scene.add(mesh);
        const light = new THREE.PointLight(0x22ff44, 0.5, 4);
        light.position.copy(mesh.position); _scene.add(light);
        bugs.push({
            mesh, light, angle, speed: 0.15 + Math.random() * 0.15, radius, yBase: mesh.position.y,
            collisionR2: (0.4 + 2.2) * (0.4 + 2.2),
        });
    }
}

// ═══════════════════════════════════════════════════════════
//  3. PROJECT ORBS (replaces Floating Tensors)
// ═══════════════════════════════════════════════════════════

/** Build a small geometry for the inner rotating model inside each orb. */
function createInnerGeo(type) {
    switch (type) {
        case 'torus':        return new THREE.TorusGeometry(0.35, 0.12, 8, 16);
        case 'box':          return new THREE.BoxGeometry(0.5, 0.5, 0.5);
        case 'icosahedron':  return new THREE.IcosahedronGeometry(0.35, 0);
        case 'octahedron':   return new THREE.OctahedronGeometry(0.4, 0);
        case 'dodecahedron': return new THREE.DodecahedronGeometry(0.35, 0);
        case 'cylinder':     return new THREE.CylinderGeometry(0.2, 0.2, 0.6, 8);
        case 'tetrahedron':  return new THREE.TetrahedronGeometry(0.45, 0);
        case 'sphere':       return new THREE.SphereGeometry(0.35, 12, 12);
        case 'cone':         return new THREE.ConeGeometry(0.3, 0.6, 8);
        case 'torusKnot':    return new THREE.TorusKnotGeometry(0.25, 0.08, 32, 8);
        default:             return new THREE.OctahedronGeometry(0.4, 0);
    }
}

function buildProjectOrbs() {
    const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // Fibonacci spiral
    for (let i = 0; i < orbsTotal; i++) {
        const data = PROJECT_ORBS[i];
        const col = data.color;

        // ── Group container ──
        const orbGroup = new THREE.Group();

        // ── Outer glass shell ──
        const shellMat = new THREE.MeshPhysicalMaterial({
            color: col,
            emissive: col,
            emissiveIntensity: 0.15,
            metalness: 0.1,
            roughness: 0.05,
            transparent: true,
            opacity: 0.18,
            transmission: 0.6,
            thickness: 0.5,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
            side: THREE.DoubleSide,
        });
        const shell = new THREE.Mesh(new THREE.SphereGeometry(1.2, 24, 24), shellMat);
        orbGroup.add(shell);

        // ── Inner rotating model ──
        const innerMat = new THREE.MeshStandardMaterial({
            color: col,
            emissive: col,
            emissiveIntensity: 0.9,
            metalness: 0.7,
            roughness: 0.15,
        });
        const innerMesh = new THREE.Mesh(createInnerGeo(data.innerModel), innerMat);
        orbGroup.add(innerMesh);

        // ── Orbit ring ──
        const ringGeo = new THREE.TorusGeometry(1.0, 0.02, 8, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: col, transparent: true, opacity: 0.3
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
        ring.rotation.z = (Math.random() - 0.5) * 0.8;
        orbGroup.add(ring);

        // ── Point light ──
        const light = new THREE.PointLight(col, 1.2, 12);
        orbGroup.add(light);

        // ── Position using Fibonacci sphere distribution ──
        const y = 1 - (i / (orbsTotal - 1)) * 2; // -1 to 1
        const radiusAtY = Math.sqrt(1 - y * y);
        const theta = goldenAngle * i;
        const spreadRadius = 45 + Math.random() * 15;
        orbGroup.position.set(
            Math.cos(theta) * radiusAtY * spreadRadius,
            y * 18 + (Math.random() - 0.5) * 8,
            Math.sin(theta) * radiusAtY * spreadRadius,
        );

        _scene.add(orbGroup);

        // ── Hover label (hidden until proximity) ──
        const label = makeLabel(data.name, '#' + new THREE.Color(col).getHexString(), 28, 512, 64);
        label.position.set(0, 2.2, 0);
        label.visible = false;
        orbGroup.add(label);

        // ── Tech subtitle label ──
        const techLabel = makeLabel(data.tech, 'rgba(255,255,255,0.6)', 18, 512, 48);
        techLabel.position.set(0, 1.6, 0);
        techLabel.visible = false;
        orbGroup.add(techLabel);

        projectOrbs.push({
            group: orbGroup,
            shell,
            innerMesh,
            ring,
            light,
            label,
            techLabel,
            data,
            color: col,
            rot: new THREE.Vector3(
                (Math.random() - 0.5) * 1.5,
                (Math.random() - 0.5) * 1.5,
                (Math.random() - 0.5) * 1.5
            ),
            bobPhase: Math.random() * Math.PI * 2,
            baseY: orbGroup.position.y,
            collected: false,
        });
    }
}

// ── Celebration effect when all orbs collected ─────────────
function triggerCelebration() {
    showLog('🎉 Model Training Complete! All projects explored!', 'tensor');
    // Spawn a big burst at the ship
    const shipPos = _ship.position.clone();
    for (let i = 0; i < 6; i++) {
        const offset = new THREE.Vector3(
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8,
        );
        _explode(shipPos.clone().add(offset), PROJECT_ORBS[i % PROJECT_ORBS.length].color);
    }
}

// ═══════════════════════════════════════════════════════════
//  UPDATE (call every frame)
// ═══════════════════════════════════════════════════════════
export function updateMechanics(dt, shipVelocity, _shipBox) {
    mechanicsTime += dt;
    const shipPos = _ship.position;

    // ── GC cubes drift + push + collect ──
    if (gcRing) gcRing.rotation.z += dt * 0.3;
    for (let i = gcCubes.length - 1; i >= 0; i--) {
        const c = gcCubes[i];
        c.vel.multiplyScalar(0.999); c.angVel.multiplyScalar(0.998);
        c.mesh.position.addScaledVector(c.vel, dt);
        c.mesh.rotation.x += c.angVel.x*dt; c.mesh.rotation.y += c.angVel.y*dt; c.mesh.rotation.z += c.angVel.z*dt;
        // Ship push
        const dx = c.mesh.position.x - shipPos.x;
        const dy = c.mesh.position.y - shipPos.y;
        const dz = c.mesh.position.z - shipPos.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < c.collisionR2) {
            // 難度調整：推力係數從 0.6 → 1.4，方塊更容易被推走
            c.vel.copy(shipVelocity).multiplyScalar(1.4);
            c.vel.x += (Math.random()-.5)*3; c.vel.y += (Math.random()-.5)*2; c.vel.z += (Math.random()-.5)*3;
            c.angVel.set((Math.random()-.5)*4,(Math.random()-.5)*4,(Math.random()-.5)*4);
        }
        // GC zone check
        if (c.mesh.position.distanceTo(GC_POS) < GC_R) {
            _explode(c.mesh.position.clone(), 0xc2c1ff);
            _scene.remove(c.mesh); gcCubes.splice(i, 1);
            showLog('Memory freed!', 'gc');
            if (_audio.playGCFreed) _audio.playGCFreed();
        }
    }

    // ── Bugs orbit ──
    for (let i = bugs.length - 1; i >= 0; i--) {
        const b = bugs[i];
        b.angle += b.speed * dt;
        b.mesh.position.set(Math.cos(b.angle)*b.radius, b.yBase + Math.sin(b.angle*2)*1.5, Math.sin(b.angle)*b.radius);
        b.mesh.rotation.x += dt*2; b.mesh.rotation.y += dt*3;
        b.light.position.copy(b.mesh.position);
        const dx = b.mesh.position.x - shipPos.x;
        const dy = b.mesh.position.y - shipPos.y;
        const dz = b.mesh.position.z - shipPos.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < b.collisionR2) {
            _explode(b.mesh.position.clone(), 0x22ff44);
            // 避免 Shader Recompile: 不要 remove light，而是將它移走並關閉強度
            b.mesh.position.set(0, -9999, 0); 
            b.light.position.set(0, -9999, 0); 
            b.light.intensity = 0; 
            bugs.splice(i, 1);
            showLog("console.log('Bug resolved')", 'bug');
            if (_audio.playBugSquash) _audio.playBugSquash();
        }
    }

    // ── Project Orbs: rotate, bob, proximity labels, collect ──
    const LABEL_DISTANCE = 20;
    const COLLECT_DISTANCE = 3;
    const now = mechanicsTime;
    const labelDist2 = LABEL_DISTANCE * LABEL_DISTANCE;
    const collectDist2 = COLLECT_DISTANCE * COLLECT_DISTANCE;

    for (let i = projectOrbs.length - 1; i >= 0; i--) {
        const orb = projectOrbs[i];
        if (orb.collected) continue;

        const orbPos = orb.group.position;

        // Inner model rotation
        orb.innerMesh.rotation.x += orb.rot.x * dt;
        orb.innerMesh.rotation.y += orb.rot.y * dt;
        orb.innerMesh.rotation.z += orb.rot.z * dt;

        // Orbit ring slow spin
        orb.ring.rotation.z += dt * 0.5;

        // Gentle bobbing
        orbPos.y = orb.baseY + Math.sin(now + orb.bobPhase) * 0.12;

        // Shell pulsing glow
        const pulse = 0.15 + Math.sin(now * 2 + orb.bobPhase) * 0.05;
        orb.shell.material.opacity = pulse;
        orb.shell.material.emissiveIntensity = 0.15 + Math.sin(now * 3 + orb.bobPhase) * 0.1;

        // Light pulsing
        orb.light.intensity = 1.0 + Math.sin(now * 2 + orb.bobPhase) * 0.4;

        // Proximity — show / hide labels
        const dx = orbPos.x - shipPos.x;
        const dy = orbPos.y - shipPos.y;
        const dz = orbPos.z - shipPos.z;
        const dist2 = dx * dx + dy * dy + dz * dz;
        const showLabels = dist2 < labelDist2;
        orb.label.visible = showLabels;
        orb.techLabel.visible = showLabels;

        if (showLabels) {
            const dist = Math.sqrt(dist2);
            // Scale labels by proximity for a "holographic reveal" effect
            const t = Math.max(0, Math.min(1, 1 - (dist - 5) / (LABEL_DISTANCE - 5)));
            const s = t * t; // ease-in
            orb.label.material.opacity = s;
            orb.techLabel.material.opacity = s * 0.7;
        }

        // Collect on fly-through
        if (dist2 < collectDist2) {
            _explode(orbPos.clone(), orb.color);

            orb.collected = true;
            // 避免 Shader Recompile
            orb.group.position.set(0, -9999, 0);
            orb.light.intensity = 0;
            orbsCollected++;
            updateOrbUI();
            showLog(`📦 ${orb.data.name} — collected!`, 'tensor');
            if (_audio.playTensorCollect) _audio.playTensorCollect();

            // Show project detail panel
            showProjectPanel(orb.data);

            if (orbsCollected >= orbsTotal) triggerCelebration();
        }
    }

    // ── transient lights lifetime (replaces setTimeout churn) ──
    for (let i = transientLights.length - 1; i >= 0; i--) {
        const t = transientLights[i];
        t.ttl -= dt;
        if (t.ttl <= 0) {
            _scene.remove(t.light);
            transientLights.splice(i, 1);
        }
    }
}

// ═══════════════════════════════════════════════════════════
//  PROJECT DETAIL PANEL (HTML overlay)
// ═══════════════════════════════════════════════════════════
export function showProjectPanel(data) {
    const panel = document.getElementById('project-panel');
    if (!panel) return;

    panel.querySelector('.pp-name').textContent = data.name;
    panel.querySelector('.pp-tagline').textContent = data.tagline;
    panel.querySelector('.pp-tech').textContent = data.tech;
    panel.querySelector('.pp-desc').textContent = data.desc;

    const previewImg = panel.querySelector('#pp-preview');
    if (previewImg) {
        if (data.preview) {
            previewImg.src = data.preview;
            previewImg.style.display = 'block';
        } else {
            previewImg.style.display = 'none';
        }
    }

    // Badges
    const badgeWrap = panel.querySelector('.pp-badges');
    badgeWrap.innerHTML = '';
    for (const b of data.badges) {
        const span = document.createElement('span');
        span.className = 'pp-badge';
        span.textContent = b;
        badgeWrap.appendChild(span);
    }

    // Links
    const linksWrap = panel.querySelector('.pp-links');
    linksWrap.innerHTML = '';
    if (data.status) {
        const s = document.createElement('span');
        s.className = 'pp-link pp-status';
        s.textContent = data.status;
        linksWrap.appendChild(s);
    }
    if (data.github && data.github !== '#') {
        const a = document.createElement('a');
        a.href = data.github; a.target = '_blank'; a.rel = 'noopener';
        a.className = 'pp-link github'; a.textContent = '⟨/⟩ GitHub';
        linksWrap.appendChild(a);
    }
    if (data.demo && data.demo !== '#') {
        const a = document.createElement('a');
        a.href = data.demo; a.target = '_blank'; a.rel = 'noopener';
        a.className = 'pp-link demo'; a.textContent = '▶ Live Demo';
        linksWrap.appendChild(a);
    }

    // Color accent
    const hex = '#' + new THREE.Color(data.color).getHexString();
    panel.style.setProperty('--pp-accent', hex);

    // Show
    panel.classList.add('visible');
    // Auto-hide after 15 seconds if in cinematic mode to give time to read
    clearTimeout(panel._hideTimer);
    panel._hideTimer = setTimeout(() => panel.classList.remove('visible'), 15000);
}
window.showProjectPanelManually = showProjectPanel;

// ═══════════════════════════════════════════════════════════
//  RESET
// ═══════════════════════════════════════════════════════════
export function resetMechanics() {
    gcCubes.forEach(c => _scene.remove(c.mesh));
    bugs.forEach(b => { _scene.remove(b.mesh); _scene.remove(b.light); });
    projectOrbs.forEach(o => { if (!o.collected) _scene.remove(o.group); });
    if (gcRing) _scene.remove(gcRing);
    if (gcLight) _scene.remove(gcLight);
    if (gcLabel) _scene.remove(gcLabel);
    gcCubes = []; bugs = []; projectOrbs = [];
    transientLights.forEach((t) => _scene.remove(t.light));
    transientLights.length = 0;
    mechanicsTime = 0;
    orbsCollected = 0;
    buildGC(); buildBugs(); buildProjectOrbs(); updateOrbUI();
}
