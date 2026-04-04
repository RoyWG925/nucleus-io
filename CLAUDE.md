# CLAUDE.md — TOY_BOX.IO 專案規範

> AI 工作指引、程式碼規範與協作守則。每次開始新任務前請先閱讀。

---

## 專案快速摘要

**TOY_BOX.IO — DIMENSION_SHIFT**  
一個 Three.js 驅動的 3D 瀏覽器互動體驗，玩家操控太空船在宇宙深空飛行、碰撞霓虹文字、收集專案光球。

**技術棧**：Vanilla JS (ES Modules) + Three.js v0.160.0 + Vite (dev server)  
**入口**：`index.html` → `app.js`  
**詳細架構**：見 [`docs/PROJECT.md`](./docs/PROJECT.md)  
**設計系統**：見 [`docs/DESIGN.md`](./docs/DESIGN.md)

---

## 開發指令

```bash
# 啟動 dev server（必須透過 HTTP，不能用 file://）
npx -y vite --port 3000

# 建置（通常不需要，除非要部署）
npx vite build
```

---

## 架構守則

### 模組職責邊界（禁止跨越）

| 模組 | 唯一職責 | 禁止做的事 |
|------|----------|------------|
| `constants.js` | 純資料，無副作用 | 不可 import 其他模組，不可改 DOM |
| `scene.js` | Three.js 環境初始化 | 不可包含遊戲邏輯 |
| `vfx.js` | 純視覺效果 | 不可讀取輸入狀態 |
| `mechanics.js` | 遊戲機制（GC/Bugs/Orbs） | 不可直接改 DOM（除了透過 showLog/showProjectPanel） |
| `physics.js` | 文字碰撞物理 | 不可含非物理邏輯 |
| `app.js` | 串聯所有模組 | 不可含業務邏輯，只做 wire-up |

### 命名規範

- **函式**：camelCase（`buildGC`, `updateMechanics`）
- **常數（模組級）**：SCREAMING_SNAKE_CASE（`GC_R`, `SHIP_SPEED`）
- **Three.js 物件**：直覺命名（`gcRing`, `shellMat`, `orbGroup`）
- **DOM ID**：kebab-case（`#game-log`, `#tensor-counter`）
- **CSS class**：kebab-case（`.log-msg`, `.pp-badge`）

### 效能規則

1. **預計算碰撞半徑平方**：所有距離判斷用 `dist2 < r2`，避免 `Math.sqrt()`，除非需要實際距離
2. **避免 GC 壓力**：不在 animate loop 內 new Vector3/Color 等物件（除非必要），偏好複用
3. **Transient Lights 用 TTL 管理**：短暫光源加入 `transientLights[]` 陣列由 update loop 統一清理，**禁止** 用 setTimeout 移除 Three.js 物件
4. **dt 上限**：`Math.min(clock.getDelta(), 0.05)` — 防止分頁隱藏後重回的巨大 dt 造成物理爆炸
5. **MeshPhysicalMaterial** 謹慎使用（高效能消耗），目前只有 Orb shell 使用

### Three.js 規範

- 所有燈光、Mesh 加入 scene 後必須在 `resetMechanics()` 中對應清除
- Sprite label 用 `makeLabel()` 統一工廠函式建立
- Geometry 在建立後不需要單獨 dispose，除非是動態大量生成的情況
- 後處理 Pass 必須保持 `OutputPass` 在最後

---

## 遊戲設計守則

### 難度平衡原則

- **GC 機制**：設計為輕鬆探索型，不應讓玩家沮喪。方塊應要「可被推動」而非「逃跑」
- **Bugs**：軌道固定，玩家只需飛過去，難度極低（設計意圖：小獎勵）
- **Project Orbs**：核心收集目標，收集距離不應過小（目前 3 單位）

### 核心體驗原則（勿破壞）

1. 飛行應感覺**流暢且有慣性**（不要瞬間停止）
2. 碰撞文字應感覺**有重量且有趣**
3. 收集 Orb 應有**清晰的視覺 + 音效回饋**
4. 宇宙環境應保持**深邃且壯觀**（星雲/bloom 不要削弱）

---

## CSS 規範

- **顏色**：只使用 `constants.js` 中的 COLORS 和 SPACE 定義的色彩，映射為 CSS 自訂屬性
- **禁止**使用純黑 `#000` 或純白 `#fff`（破壞大氣感）
- **禁止**使用 1px solid border（改用 box-shadow glow 或 tinted neutral）
- **動畫**：偏用 CSS transition/animation，Three.js 動畫只用於 3D 物件
- **字型**：Display → Epilogue，Body → Plus Jakarta Sans，Label/HUD → Space Grotesk

---

## 新增功能 Checklist

在提交任何新功能前確認：

- [ ] 新物件是否在 `resetMechanics()` 或對應 reset 函式中清除？
- [ ] 是否在 animate loop 中建立了不必要的臨時物件？
- [ ] 是否遵守了模組職責邊界？
- [ ] 新的遊戲元素是否需要音效（`audio.js` 新增方法）？
- [ ] 新的 DOM 元素是否用了唯一 ID？
- [ ] 是否影響了飛行手感（ship.js 的阻尼/慣性）？

---

## 常見 Pitfalls

| 問題 | 原因 | 解法 |
|------|------|------|
| 文字 physics 在 reset 後異常 | `letters[]` 是由 text.js 持有的引用，reset 需透過 `resetLetters()` | 呼叫 `resetLetters(originalPositions)` |
| Audio 無聲 | AudioContext 未初始化 | 確保 `ensureAudio()` 在使用者互動後才調用 |
| GC 方塊無法被推動 | shipVelocity 為零時推力為零 | 加速後再推 |
| Orb panel 不消失 | `panel._hideTimer` 未 clearTimeout | 已有保護，下一次收集自動 clear |
| Bloom 過度 | UnrealBloomPass threshold 太低 | 調高 threshold（目前 0.42），或降低 strength |
