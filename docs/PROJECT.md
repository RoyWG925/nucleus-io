# TOY_BOX.IO — 完整技術規格文件（AI 維護用）

> 本文件為給 AI 或維護工程師參考的完整技術規格，涵蓋所有模組架構、資料流、遊戲邏輯與擴展指南。

---

## 目錄

1. [專案結構](#1-專案結構)
2. [模組依賴圖](#2-模組依賴圖)
3. [各模組詳細規格](#3-各模組詳細規格)
4. [遊戲機制詳解](#4-遊戲機制詳解)
5. [資料模型與常數](#5-資料模型與常數)
6. [渲染管線](#6-渲染管線)
7. [音效系統](#7-音效系統)
8. [UI 元素與 DOM 結構](#8-ui-元素與-dom-結構)
9. [常見擴展模式](#9-常見擴展模式)
10. [已知問題與注意事項](#10-已知問題與注意事項)

---

## 1. 專案結構

```
ship/
├── index.html          # 入口點，包含所有 HTML UI + importmap 設定
├── style.css           # 全部 CSS（HUD, 面板, 動畫, 字型）
├── app.js              # 頂層 Orchestrator（初始化序列 + animate loop）
├── scene.js            # Three.js 核心（renderer/camera/postprocessing/lighting）
├── ship.js             # 太空船幾何、飛行物理、鏡頭跟隨
├── vfx.js              # 所有環境視覺效果（非遊戲玩法）
├── mechanics.js        # 遊戲機制（GC / Bugs / Project Orbs）
├── physics.js          # 霓虹文字碰撞偵測與物理更新
├── text.js             # 3D 字型載入（FontLoader）
├── audio.js            # Web Audio API 合成音效引擎
├── input.js            # 鍵盤 + 滑鼠 Pointer Lock 處理
├── ui.js               # HTML 按鈕 / HUD 互動邏輯
├── constants.js        # 全域常數（顏色 / 物理值 / 專案資料）
├── package.json        # npm 套件設定（僅 three 為 dependency）
├── README.md           # 對外公開介紹（根目錄）
├── CLAUDE.md           # AI 工作規範（根目錄）
└── docs/
    ├── DESIGN.md       # 設計系統與美術風格指南
    └── PROJECT.md      # 本文件（AI 維護技術規格）
```

---

## 2. 模組依賴圖

```
index.html
    └── app.js (type="module", 入口)
            ├── scene.js        → 提供: scene, camera, composer, clock
            ├── vfx.js          → 消費: scene
            ├── ship.js         → 消費: scene, constants; 提供: shipGroup, shipVelocity
            ├── text.js         → 消費: scene; 提供: letters[]
            ├── physics.js      → 消費: letters[], shipGroup
            ├── input.js        → 消費: shipGroup
            ├── ui.js           → 消費: audio
            ├── mechanics.js    → 消費: scene, shipGroup, audio, vfx.createExplosion
            └── constants.js    → 被所有模組消費（只讀）
```

**重要**：`constants.js` 是唯一沒有副作用的純資料模組，所有其他模組皆可安全 import。

---

## 3. 各模組詳細規格

### `app.js` — Orchestrator

**職責**：模組初始化順序管理 + requestAnimationFrame 主迴圈。

**初始化順序**（順序不可隨意調換）：
1. `initScene()` — 必須最先，建立 renderer/scene/camera
2. 所有 `vfx.js` 創建函式（additive，順序無關）
3. `createSpaceship()` + `createTrail()`
4. `loadNeonText()` — 非同步，callback 完成後 letters 才存在
5. `setupInput()` + `setupUI()`
6. `initMechanics()` — 需要 scene + shipGroup 已存在
7. `animate()` — 啟動主迴圈

**Game Loop 執行順序**（每幀）：
```
getDelta() → updateShip → updateCamera → updateTrail
→ checkCollisions → updateLetters → updateExplosions
→ updateEnvironment → updateMechanics → updateSceneUniforms
→ composer.render()
```

**resetScene()**：協調重置，需等 `resetReady`（letters 第一次出現後才設為 true）。

---

### `scene.js` — 場景核心

**匯出**：`scene`, `camera`, `renderer`, `composer`, `clock`, `initScene()`, `updateSceneUniforms()`

**後處理 Pass 順序**（index 0 → 5）：
| Index | Pass | 參數 |
|-------|------|------|
| 0 | RenderPass | - |
| 1 | UnrealBloomPass | strength=0.9, radius=0.62, threshold=0.42 |
| 2 | VignetteShader | offset=1.2, darkness=1.4 |
| 3 | ChromaAberrationShader | amount=0.0012 |
| 4 | FilmGrainShader | intensity=0.06, time=動態更新 |
| 5 | OutputPass | - |

**自訂 Shader**：三個皆為 ShaderPass，定義在 scene.js 頂部，使用 `vUv` varying 傳遞 UV。`FilmGrainShader` 的 `time` uniform 每幀由 `updateSceneUniforms()` 更新。

**燈光**（6 個）：KeyLight, FillLight(Ambient), RimLight, AccentLight(Point), ColdAccent(Point), HemiLight

---

### `ship.js` — 太空船

**匯出**：`createSpaceship()`, `createTrail()`, `updateShip()`, `updateTrail()`, `updateCamera()`, `resetShip()`, `shipGroup`, `shipVelocity`

**飛行物理**：
- 速度累加 += 輸入方向 × `SHIP_SPEED` × dt（有 Boost 時乘 `BOOST_MULT`）
- 速度衰減：每幀乘以阻尼係數（無 input 時自然減速）
- 旋轉：繞 Y 軸 yaw（A/D），繞 X 軸 pitch（W/S），幀間 lerp 平滑
- **重力模式**（GRAVITY 按鈕）：Y 速度 += `GRAVITY_VAL` × dt

**鏡頭跟隨**：
- `CAM_OFFSET = (0, 6, -18)` — 船後上方
- `CAM_LERP = 0.06` — lerp 係數（0.06 = 輕柔跟隨）
- 鏡頭始終 lookAt shipGroup.position

**Trail（尾跡）**：
- BufferGeometry Line，頂點數 = `TRAIL_LEN` (120)
- 每幀將所有點往後移一位，頭部插入船當前位置
- 顏色：從粉紅（頭）→ 透明（尾）漸層

**碰撞箱**：`shipWorldBox` (Three.Box3)，每幀由 app.js 更新 `setFromObject(shipGroup)`

---

### `vfx.js` — 視覺效果

**匯出的創建函式**（只需調用一次）：
- `createStarfield(scene)` — 三層星場，各 2000–4000 顆星
- `createNebulaClouds(scene)` — 8 個大型體積雲球
- `createCosmicDust(scene)` — 1500 個漂浮塵埃粒子
- `createDistantGalaxies(scene)` — 6 個旋渦/橢圓星系
- `createGridFloor(scene)` — 發光等距網格地板
- `createNebulaRing(scene)` — 大型宇宙圓環
- `createStarClusters(scene)` — 球狀星團群
- `createCosmicFilaments(scene)` — 細絲狀星際結構
- `createLightPillars(scene)` — 垂直光束柱

**需每幀調用**：
- `updateExplosions(scene, dt)` — 管理爆炸特效生命週期
- `updateEnvironment(dt)` — 星雲旋轉、塵埃漂移

**爆炸系統**：`createExplosion(scene, position, color)` — 產生粒子系統，自動在 TTL 結束後由 `updateExplosions` 清除。

---

### `mechanics.js` — 遊戲機制

**匯出**：`initMechanics(deps)`, `updateMechanics(dt, shipVelocity, shipBox)`, `resetMechanics()`, `projectOrbs`（供 raycasting 用）

#### GC（垃圾回收器）參數
```js
const GC_POS = new THREE.Vector3(38, 5, 28);  // 場景右前方固定位置
const GC_R = 9;                                // 收集圓環半徑
```
- 8 顆記憶體洩漏方塊隨機分布全場
- 船推動方塊：`vel = shipVelocity * 0.6 + random jitter`
- 方塊進入 `GC_R` 內觸發消除

#### Space Bugs 參數
- 6 顆，以 `radius = 6-11` 繞原點軌道飛行
- 碰撞半徑 `(0.4 + 2.2)^2 ≈ 6.76`
- 船碰到即消除

#### Project Orbs 參數
- 12 顆，Fibonacci 球面分布，半徑 45-60
- `LABEL_DISTANCE = 20` — 進入此距離顯示標籤
- `COLLECT_DISTANCE = 3` — 進入此距離觸發收集
- 收集後顯示 `#project-panel` DOM 面板，5 秒後自動隱藏

---

### `physics.js` — 文字物理

**職責**：管理 neon letters 的碰撞偵測與物理模擬

**資料結構**（每個 letter）：
```js
{
    mesh: THREE.Mesh,
    glow: THREE.Mesh,       // 同步跟隨 mesh
    vel: THREE.Vector3,
    angVel: THREE.Vector3,
    grounded: boolean,
    collisionR2: number,    // (mesh半徑 + 船半徑)^2，已預計算
}
```

**更新邏輯**（`updateLetters`）：
- 重力模式開：y vel += GRAVITY_VAL × dt
- 碰地面（y < -floorY）：vel.y 翻正 × 0.5（彈跳），grounded check
- 阻尼：vel × 0.98, angVel × 0.97 每幀

---

### `text.js` — 3D 文字

**字型**：`FONT_URL`（CDN 上的 helvetiker_bold），由 `FontLoader` 非同步載入

**匯出**：`loadNeonText(scene)`, `letters[]`（完成後填充）

**文字幾何**：固定 size=4，height=1，bevelEnabled=true

**發光效果**：每個字母有兩個 Mesh：實體 + 略大的半透明 glow Mesh（相同幾何，scale 1.05）

---

### `audio.js` — 音效引擎

**架構**：全部用 Web Audio API 合成，無音訊資源檔案依賴

**方法**：
- `init()` — 建立 AudioContext（必須在使用者互動後調用）
- `playEngineHum(velocity)` — 持續引擎聲，音調跟速度
- `playBoost()` — 加速音效
- `playCollision()` — 文字碰撞音
- `playGCFreed()` — GC 方塊消除音
- `playBugSquash()` — Bug 消除音
- `playTensorCollect()` — Orb 收集音

---

### `input.js` — 輸入處理

**按鍵映射**：
```
W/ArrowUp    → forward
S/ArrowDown  → backward
A/ArrowLeft  → left
D/ArrowRight → right
Shift        → up
Ctrl/Control → down
Space        → boost
R            → reset (callback)
```

**滑鼠**：Pointer Lock API，`mousemove` 更新全域 `mouseX/mouseY` delta（每幀消費後歸零）

---

### `ui.js` — HUD 互動

**管理的 DOM 元素**：
- `#btn-gravity` → 切換重力模式
- `.hud-btn[data-tool]` → SHIP/TEXTURE/GRAVITY/AUDIO 工具按鈕
- `#hud-reboot` → 呼叫 resetScene
- `#btn-volume` → 音量切換
- `#btn-settings` → 設定（目前為 placeholder）
- `#project-panel .pp-close` → 關閉專案詳情面板
- `#loading-screen` → 初始化完成後淡出

---

## 4. 遊戲機制詳解

### GC 難度調整參數（`mechanics.js`）

| 參數 | 位置 | 當前值 | 降低難度建議 |
|------|------|--------|-------------|
| `GC_R` | 常數 | 9 | 增加至 14–16 |
| 方塊數量 | `buildGC` loop | 8 | 減少至 4–5 |
| 方塊生成範圍 | position set | ±25+偏移 | 縮小至 ±15 |
| 推力係數 | `multiplyScalar(0.6)` | 0.6 | 增加至 1.2 |
| 方塊速度衰減 | `multiplyScalar(0.999)` | 0.999 | 降至 0.995（更快停） |

### Project Orbs 距離調整

| 參數 | 當前值 | 說明 |
|------|--------|------|
| 分布半徑 | 45–60 | 很散，需主動飛去找 |
| 標籤顯示距離 | 20 | 在此範圍內才看到名字 |
| 收集距離 | 3 | 需要非常接近才觸發 |

---

## 5. 資料模型與常數

### `constants.js` 匯出

```js
COLORS      // UI 色彩 token（primary/secondary/tertiary 等）
SPACE       // 宇宙環境色彩（背景/星雲/網格/霧等）
FONT_URL    // Three.js CDN 字型 URL
SHIP_SPEED  // = 40（基礎速度）
BOOST_MULT  // = 2.5（加速倍率）
ROTATE_SPEED// = 2.2（旋轉速度）
CAM_LERP    // = 0.06（鏡頭跟隨平滑）
CAM_OFFSET  // = (0, 6, -18)（鏡頭偏移）
LETTER_MASS // = 1（文字物理質量）
GRAVITY_VAL // = -9.8
TRAIL_LEN   // = 120（尾跡長度）
PROJECT_ORBS// Array[12]（Orb 資料，見下方）
```

### `PROJECT_ORBS` 每筆資料結構

```js
{
    name: string,       // 顯示名稱
    tech: string,       // 技術棧（副標題）
    tagline: string,    // 引言（斜體）
    desc: string,       // 詳細描述
    github: string,     // GitHub URL
    demo: string,       // Demo URL
    badges: string[],   // 標籤陣列
    color: 0xRRGGBB,    // 光球顏色（hex number）
    innerModel: string, // 內部幾何類型（見 createInnerGeo）
}
```

**`innerModel` 可用值**：`torus`, `box`, `icosahedron`, `octahedron`, `dodecahedron`, `cylinder`, `tetrahedron`, `sphere`, `cone`, `torusKnot`

---

## 6. 渲染管線

### Renderer 設定
```js
antialias: true
pixelRatio: min(devicePixelRatio, 2)   // 限制高 DPI 效能
toneMapping: ACESFilmicToneMapping
toneMappingExposure: 0.95
outputColorSpace: SRGBColorSpace
```

### 相機設定
```js
type: PerspectiveCamera
fov: 58
near: 0.1
far: 3000
```

### 霧效
```js
type: FogExp2
color: SPACE.fogColor   // #0a0612
density: 0.004          // 指數霧密度，遠景自然消失
```

---

## 7. 音效系統

`audio.js` 完全合成，不依賴任何音訊檔案。`AudioContext` 必須在使用者首次互動後由 `ensureAudio()` 初始化（瀏覽器 autoplay 限制）。

引擎聲音為持續振盪器，音調（frequency）根據船速動態映射。所有單次音效使用短暫 OscillatorNode + GainNode，播完自動 disconnect。

---

## 8. UI 元素與 DOM 結構

### 關鍵 DOM ID
| ID | 類型 | 用途 |
|----|------|------|
| `#three-container` | div | renderer.domElement 掛載點 |
| `#loading-screen` | div | 載入遮罩 |
| `#loader-fill` | div | 載入進度條 |
| `#top-app-bar` | header | 頂部導覽列 |
| `#side-hud` | aside | 左側工具 HUD |
| `#controls-hint` | div | 底部操控提示 |
| `#speed-display` | div | 速度計 |
| `#speed-value` | div | 速度數字（動態更新） |
| `#game-log` | div | 遊戲事件 log 容器 |
| `#tensor-counter` | div | Orb 收集計數器（左下） |
| `#tensor-text` | span | 計數文字 |
| `#project-panel` | div | 專案詳情側滑面板 |
| `#btn-gravity` | button | 重力切換按鈕 |
| `#btn-volume` | button | 音量切換按鈕 |
| `#hud-reboot` | button | 重置場景按鈕 |

### Log 訊息類型（CSS class）
- `.log-msg.gc` → 紫色（GC 事件）
- `.log-msg.bug` → 綠色（Bug 事件）
- `.log-msg.tensor` → 粉色（Orb 收集事件）

---

## 9. 常見擴展模式

### 新增一顆 Project Orb

在 `constants.js` 的 `PROJECT_ORBS` 陣列末尾新增：
```js
{
    name: '專案名稱',
    tech: 'React · Node.js',
    tagline: '"一句話幽默描述"',
    desc: '詳細說明...',
    github: 'https://github.com/...',
    demo: 'https://...',
    badges: ['標籤1', '標籤2'],
    color: 0xABCDEF,
    innerModel: 'torus',  // 選一個幾何類型
}
```

**注意**：`orbsTotal` 是在 module 初始化時從 `PROJECT_ORBS.length` 計算，自動更新。

### 新增環境 VFX 層

在 `vfx.js` 中新增創建函式，在 `app.js` 的 `init()` 中調用即可（順序不影響結果，因為都以 additive blending 疊加）。

### 新增後處理效果

在 `scene.js` 的 `initScene()` 中，在 `OutputPass` 之前插入新的 `ShaderPass`（維持 OutputPass 在最後）。

### 新增遊戲機制

在 `mechanics.js` 中新增 build/update/reset 三個區塊，在 `initMechanics` 調用 build，在 `updateMechanics` 調用 update，在 `resetMechanics` 調用 reset。

### 調整飛行手感

修改 `constants.js`：
- `SHIP_SPEED`：基礎速度（建議範圍 20–60）
- `BOOST_MULT`：加速倍率（建議範圍 2–4）
- `ROTATE_SPEED`：旋轉靈敏度（建議範圍 1.5–3.5）
- `CAM_LERP`：鏡頭跟隨速度（0.02=極輕柔，0.15=緊跟）

---

## 10. 已知問題與注意事項

### importmap + CDN
- Three.js 透過 `importmap` 從 CDN 載入，需要 HTTP 伺服器
- Vite dev server 提供最好的開發體驗（HMR + ES Module 快取）
- **不可** 直接用 `file://` 開啟 index.html

### Pointer Lock 相容性
- Chrome、Edge 支援最佳
- Firefox 需使用者點擊進入才能觸發 Pointer Lock
- 點擊空白區域以外的 HUD 按鈕不會觸發 Pointer Lock

### Font 載入時序
- `letters[]` 在 font 載入完成前是空陣列
- `resetReady` flag 防止在 letters 存在前嘗試儲存原始位置
- font 載入失敗（CDN 不通）時場景仍可運行，只是沒有文字

### MeshPhysicalMaterial 效能
- Project Orbs 的 shell 使用 `MeshPhysicalMaterial`（transmission=0.6）
- 這是 Three.js 中最耗效能的材質
- 低階設備可改為 `MeshStandardMaterial` + 調高 opacity

### AudioContext 生命週期
- `audio.init()` 只能在使用者互動後調用（首次點擊/按鍵）
- `ensureAudio()` 有冪等保護（audioStarted flag），安全可多次調用
