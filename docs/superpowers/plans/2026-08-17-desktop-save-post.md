# 本机 save_post 桌面端 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把用户提供的 `save_post` 做成可在 Windows 双击运行的本机软件：规则+可选 AI 入库到 SQLite，并钉到现有高德地图。

**Architecture:** 本机无 Python。用 Node 22 内置 SQLite 实现同一流水线；Vite 插件提供 `/api/ingest` 与 `/api/posts`；`启动钓了嘛.bat` 拉起本地服务并用 Edge `--app=` 打开独立窗口。小红书/抖音/微博不抓登录页。

**Tech Stack:** TypeScript, Vite plugin, `node:sqlite`, Vitest, Windows bat

---

### Task 1: ingest 单测与纯函数

**Files:**
- Create: `src/lib/ingest/*.ts` 与 `src/lib/ingest/*.test.ts`

- [x] detect / extract / merge / gated fetch 测试与实现

### Task 2: save_post + SQLite + API

**Files:**
- Create: `src/lib/ingest/savePost.ts`, `src/lib/ingest/db.ts`, `src/vite-plugin-ingest.ts`

- [x] 对齐用户函数签名与合并规则；url 去重

### Task 3: 桌面启动与 UI

**Files:**
- Create: `启动钓了嘛.bat`, `desktop/start.mjs`
- Modify: `ShareImport.tsx`, `App.tsx`, `vite.config.ts`, `package.json`

- [x] 双击启动；粘贴入库后地图出现标点
