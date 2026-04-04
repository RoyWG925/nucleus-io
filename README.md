# TOY_BOX.IO — DIMENSION_SHIFT

> **一個可飛行的 3D 互動式作品集宇宙，用太空船穿越霓虹文字與宇宙深空。**

[![Three.js](https://img.shields.io/badge/Three.js-v0.160.0-black?logo=three.js)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-dev%20server-646cff?logo=vite)](https://vitejs.dev/)
[![Vanilla JS](https://img.shields.io/badge/Vanilla-ES%20Modules-f7df1e?logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

---

## 專案概述

**TOY_BOX.IO — DIMENSION_SHIFT** 是一個以 Three.js 驅動的 3D 瀏覽器互動體驗。玩家操控一艘太空船在宇宙深空中穿梭，碰撞霓虹文字物理體，蒐集漂浮的「專案光球」(Project Orbs)，並與各種程式幽默元素互動（垃圾回收器、程式蟲子等）。

整體視覺美學為 **"Toy-Box Void"**：深黑紫色的虛空宇宙舞台上，鮮豔的霓虹發光物件有如玩具被擺放在舞臺上，兼具電玩 HUD 感與現代設計。

---

## 核心功能

### 🚀 太空船飛行系統
- **WASD** 前後左右飛行，**Shift** 上升，**Ctrl** 下降
- **Space** 噴射加速（Boost），**R** 回到原點
- 滑鼠控制視角（Pointer Lock）
- 速度表即時顯示於畫面右下角

### 🌌 宇宙環境層次
| 層次 | 描述 |
|------|------|
| **星空** | 多層次視差星場（暖白 / 冷藍 / 粉紅點綴） |
| **星雲** | 體積霧狀紫色/午夜藍星雲雲朵 |
| **宇宙塵埃** | 漂浮的紫色粒子環境層 |
| **遙遠星系** | 遠景旋渦星系輪廓 |
| **網格地板** | 發光的等距紫色網格平面 |
| **星雲環** | 大型宇宙環結構（Macro 深度） |
| **星團 / 宇宙絲** | 細絲狀星際結構增加景深感 |
| **光柱** | 垂直光束作為空間錨點 |

### 🔠 霓虹文字物理
- 3D 文字以 `Helvetiker Bold` 字型呈現
- 太空船碰撞後文字受物理衝擊飛散
- 支援重力模式（GRAVITY HUD 按鈕切換）
- `R` 鍵可重置所有文字回初始位置

### 📦 專案光球系統 (Project Orbs)
- 12 顆各具特色的玻璃光球均勻散佈於空間中
- 每顆光球代表一個真實或虛構的開發者專案
- 接近時顯示霓虹文字標籤（漸進透明度揭示）
- 飛入收集後觸發爆炸特效 + 顯示專案詳情面板
- 集滿全部 12 顆觸發彩火慶祝效果

### 🗑️ 垃圾回收器 (Garbage Collector)
- 場景中有漂浮的「記憶體洩漏方塊」(Memory Leak Cubes)
- 太空船推動方塊進入紫色 GC 圓環後觸發「記憶體釋放」特效
- 模擬程式垃圾回收的開發者幽默設計

### 🐛 太空蟲子 (Space Bugs)
- 6 隻綠色多面體蟲子繞中心軌道飛行
- 太空船碰撞後觸發「Bug resolved」消除動畫
- 幽默致敬開發者日常 debug 工作

---

## 技術架構

```
ship/
├── app.js          # 主 Orchestrator：wire 所有模組、執行 game loop
├── scene.js        # Three.js 場景初始化、後處理管線、燈光設置
├── ship.js         # 太空船幾何體、飛行物理、鏡頭跟隨
├── vfx.js          # 所有環境 VFX（星空、星雲、塵埃、爆炸等）
├── mechanics.js    # 遊戲機制（GC、Bugs、Project Orbs）
├── physics.js      # 霓虹文字碰撞偵測與物理更新
├── text.js         # 霓虹 3D 文字載入（FontLoader）
├── audio.js        # Web Audio API 音效引擎
├── input.js        # 鍵盤 / 滑鼠輸入處理（Pointer Lock）
├── ui.js           # HTML HUD 互動（按鈕、面板、控制提示）
├── constants.js    # 全域常數（色彩、物理值、專案資料）
├── index.html      # 入口 HTML + Material Icons + Google Fonts
├── style.css       # UI 樣式（HUD、面板、動畫）
└── docs/           # 文件目錄（本文件所在）
```

### 後處理管線
```
RenderPass → UnrealBloomPass → VignetteShader → ChromaAberrationShader → FilmGrainShader → OutputPass
```

- **UnrealBloom**：霓虹發光 / 宇宙光暈效果
- **Vignette**：邊緣暗化，強化電影感構圖
- **Chromatic Aberration**：微妙的色差鏡頭失真
- **Film Grain**：動態噪點模擬膠片質感

### 燈光系統（3-Point + 環境增強）
| 燈光 | 類型 | 顏色 | 用途 |
|------|------|------|------|
| Key Light | Directional | 暖粉紅 `#ffd0e8` | 主角照明 |
| Fill Light | Ambient | 深紫 `#221144` | 基底環境填充 |
| Rim Light | Directional | 紫羅蘭 `#8855cc` | 輪廓光 / 深度分離 |
| Far Accent | Point | 橙色 `#ff9966` | 遠景星光 |
| Cold Accent | Point | 冰藍 `#4488ff` | 對側冷色調 |
| Hemisphere | Hemisphere | 天空/地面漸層 | 環境氛圍 |

---

## 快速開始

### 執行環境需求
- Node.js（建議 18+）
- 現代瀏覽器（Chrome / Edge / Firefox，需支援 WebGL2 + ES Modules）

### 安裝與啟動
```bash
# 使用 Vite dev server（推薦）
npx -y vite --port 3000

# 或者直接用任何靜態伺服器
npx serve .
```

> ⚠️ **必須透過 HTTP 伺服器開啟**，直接用 `file://` 開啟會因 CORS 無法載入字型資源。

### 操作指南
| 按鍵 | 功能 |
|------|------|
| `W / A / S / D` | 前後左右飛行 |
| `Shift` | 上升 |
| `Ctrl` | 下降 |
| `Space` | Boost 加速 |
| `R` | 重置場景 |
| 滑鼠移動 | 視角瞄準（需先點擊畫面鎖定游標） |

---

## 設計系統

詳見 → [`DESIGN.md`](./DESIGN.md)

設計哲學：**"Void and Glow"** — 深黑紫色虛空底色搭配高飽和度霓虹發光物件，模仿 indie 遊戲的 Toy-World 美學，拒絕平面網頁模板感，打造有縱深感的 3D 互動環境。

---

## 依賴項目

| 套件 | 版本 | 用途 |
|------|------|------|
| `three` | `^0.160.0` | 3D 渲染引擎 |
| `vite` *(dev)* | latest | 開發伺服器（ES Module 支援） |

Three.js 的 addons（EffectComposer、字型 loader 等）透過 CDN importmap 載入，無需本地安裝。

---

## 授權

© 2024 TOY_BOX.IO / DIMENSION_SHIFT. All rights reserved.
