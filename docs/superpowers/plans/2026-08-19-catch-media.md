# 渔获多图与短视频 Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 今日渔获支持最多 9 张图与一条 15 秒短视频；列表有角标，详情可滑图或播放。

**Architecture:** `catchMedia` 纯函数处理去重截断、角标与视频校验。`CatchReport.imageUrls` / `videoUrl` 本机保存；`stripInlineImage` 去掉 data URL 后再写飞书。示例帖用现有 `/shares/` 多图，不造假视频文件。

**Tech Stack:** React 19、Vitest

### Task 1: 规格

- [x] PRD FR-7/8 与验收 28
- [x] SDD 分享流与 `catchMedia`

### Task 2: 库

- [x] `catchMedia.test.ts` 先红后绿
- [x] `shareCover` 用第一张图
- [x] `stripInlineImage` 去掉多图/视频 data URL

### Task 3: UI

- [x] 报渔获多选图 + 短视频
- [x] 列表/主页/转发卡角色标；详情滑图或播放
- [x] 示例帖补多图

### Task 4: 验收

- [x] `npx vitest run` 与 `npx tsc --noEmit`
- [x] 更新 `task_plan.md` / `progress.md`
