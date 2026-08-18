# 公网群聊 Implementation Plan

> **For agentic workers:** Use executing-plans. Checkboxes track steps. Do not commit unless the user asks.

**Goal:** 配好 Supabase 后，渔圈四个主题群变成公网聊天室：不登录可看，登录可发，Realtime 同步。

**Architecture:** 纯函数校验/映射可单测；`hubChat.ts` 用现有 `getSupabase()` 读写 `chat_messages`；未配置时 `appendChatMessage` 仍走 localStorage。`HubScreen` 进入房间拉最近 200 条并订阅 INSERT。

**Tech Stack:** `@supabase/supabase-js`（已有）、Postgres RLS、Realtime、Vitest

规格：`docs/superpowers/specs/2026-08-18-public-chat-design.md`、`docs/spec/PRD.md` FR-9、`docs/spec/SDD.md` 4d。

### 文件

- Create: `src/lib/hubChat.ts`, `src/lib/hubChat.test.ts`, `supabase/chat_messages.sql`
- Modify: `src/types.ts`, `src/lib/hub.ts`（保持本机路径）, `src/components/HubScreen.tsx`, `src/App.tsx`, `src/components/MeScreen.tsx`（`MeStart` 含 `auth`）, `src/index.css`, `src/data/hub.json`, `.env.example`

### Task 1: 校验与行映射（TDD）

- [x] `draftChatBody`：trim；空/仅空格 → `null`；>200 → `null`
- [x] `isChatRoomId`：仅 `room-lure|room-ji|room-gear|room-match`
- [x] `mapChatRow`：云端行 → `HubChatMessage`（`source:'user'` + `userId`）；缺字段 → `null`
- [x] `npx vitest run src/lib/hubChat.test.ts`

### Task 2: SQL

- [x] `supabase/chat_messages.sql`：建表、RLS（anon/authenticated SELECT；authenticated INSERT 且 `user_id = auth.uid()`）、grant、realtime publication
- [x] `.env.example` 注明需在 SQL Editor 执行该文件

### Task 3: 云端读写

- [x] `fetchRoomMessages` / `sendRoomMessage` / `subscribeRoomMessages` / 中文错误文案
- [x] 空文案不 insert；发送用 `loadProfile().name`
- [x] 本机 `appendChatMessage` 与 `hub.test.ts` 仍通过

### Task 4: UI

- [x] 已配 Supabase：不混种子消息；空房间「还没有口讯」；未登录禁用发送，可去「我的」登录
- [x] Realtime 追加且按 id 去重；失败保留草稿并提示「发送失败」
- [x] 未配云端：原 localStorage + 「示例」
- [x] `npx vitest run src/lib/hubChat.test.ts src/lib/hub.test.ts` 与 `npx tsc --noEmit`
