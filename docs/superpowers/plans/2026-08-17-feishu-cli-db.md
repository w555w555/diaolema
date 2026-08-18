# Feishu CLI 渔获库 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]` syntax for tracking.

**Goal:** 用本机 `lark-cli` 把飞书多维表当成渔获数据库，替换 SQLite。

**Architecture:** `PostStore` 接口；生产实现 spawn 项目内 `lark-cli.exe` 读写「渔获情报」表；测试用内存库。`savePost` / `/api/posts` / `/api/ingest` / `/api/report` / 日报都走同一接口。

**Tech Stack:** TypeScript、Vite 本机插件、`@larksuite/cli`、Vitest

---

### Task 1: Store 接口 + 内存库 + 解析

**Files:**
- Create: `src/lib/ingest/store.ts`
- Create: `src/lib/ingest/memoryStore.ts`
- Create: `src/lib/ingest/feishuCli.ts`
- Create: `src/lib/ingest/feishuCli.test.ts`
- Modify: `src/lib/ingest/types.ts`

- [x] **Step 1:** `PostRow.id` 改为 string；补作者/经纬度
- [x] **Step 2:** 内存库单测：插入、按链接查重
- [x] **Step 3:** 解析 lark-cli JSON 为 PostRow

### Task 2: savePost / API / 日报改走 Store

**Files:**
- Modify: `src/lib/ingest/savePost.ts`
- Modify: `src/lib/ingest/savePost.test.ts`
- Modify: `src/lib/ingest/db.ts`
- Modify: `src/vite-plugin-ingest.ts`
- Modify: `src/lib/scout/runDaily.ts`
- Modify: `src/lib/intel.ts`
- Modify: `src/App.tsx`

- [x] **Step 1:** `savePost(store, ...)` 先查链接再插入
- [x] **Step 2:** `/api/posts` `/api/ingest` `/api/report` 走飞书 store
- [x] **Step 3:** 用户上报同时写入飞书；localStorage 仅缓存

### Task 3: 建表脚本与配置

**Files:**
- Create: `src/lib/ingest/provisionFeishu.ts`
- Modify: `.env.example`
- Modify: `package.json`
- Modify: `desktop/start.mjs`

- [x] **Step 1:** `npm run feishu:login` / `feishu:provision`
- [x] **Step 2:** 去掉 `--experimental-sqlite`
- [x] **Step 3:** `npm test` 通过
