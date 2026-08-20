# 短视频上传云端 Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 登录后把短视频传到 Supabase Storage；群聊/私聊与今日渔获只存 HTTPS URL，别人点开可播。

**Architecture:** 文件进公开桶 `yj-media`，路径 `{uid}/chat|catch/{id}.ext`。Postgres 只存 URL。前端只用 publishable key。未登录或未配云端仍本机预览。

**Tech Stack:** Supabase Storage、React 19、Vitest

### Task 1: 库

- [x] `userMedia.test.ts` 先红后绿
- [x] `mapChatRow` / `previewLine` / `catchToRow` 识别视频 URL

### Task 2: SQL

- [x] `chat_messages.kind` 含 `video`；`catch_reports.video_url`；Storage 桶与策略

### Task 3: UI

- [x] 聊天栏发视频并写入 `media_url`
- [x] 报渔获上传后写入 `video_url`；首页合并公开渔获

### Task 4: 验收

- [x] `npx vitest run` 与 `npx tsc --noEmit`
- [x] 更新 `task_plan.md` / `progress.md`
