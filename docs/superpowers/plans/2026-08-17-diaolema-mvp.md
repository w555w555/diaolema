# 钓了嘛 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 可演示的上海钓鱼 Web 应用：实时天气（气压/湿度）、规则引擎作钓建议、高德地图渔获附文。

**Architecture:** 无后端 SPA。Open-Meteo 拉天气，纯函数生成建议，渔获 = 种子 JSON + localStorage，高德 JS API 渲染标记（无 Key 时 Leaflet 降级）。

**Tech Stack:** Vite, React 19, TypeScript, Vitest, @amap/amap-jsapi-loader, Leaflet

---

### Task 1: 工程脚手架

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `index.html`, `.gitignore`, `.env.example`, `src/main.tsx`, `src/vite-env.d.ts`

- [x] **Step 1:** 初始化 Vite React-TS 依赖与配置
- [x] **Step 2:** 确认 `npm test` 与 `npm run dev` 脚本存在

### Task 2: 建议引擎与附文（TDD）

**Files:**
- Create: `src/types.ts`, `src/lib/advice.ts`, `src/lib/caption.ts`, `src/lib/advice.test.ts`, `src/lib/caption.test.ts`

- [x] **Step 1:** 按 SDD 写失败测试再实现 `buildAdvice` / `formatCatchCaption`

### Task 3: 天气客户端与渔获存储

**Files:**
- Create: `src/lib/weather.ts`, `src/lib/intel.ts`, `src/data/catch-reports.json`

- [x] **Step 1:** Open-Meteo 映射为 `WeatherSnapshot`
- [x] **Step 2:** seed + localStorage 合并去重

### Task 4: UI 与地图

**Files:**
- Create: `src/App.tsx`, `src/index.css`, `src/components/*`

- [x] **Step 1:** 天气卡 + 建议卡 + 上报表单 + 地图附文
- [x] **Step 2:** 高德优先，Leaflet 降级

### Task 5: 验证

- [x] **Step 1:** `npm test` 与 `npm run build`
