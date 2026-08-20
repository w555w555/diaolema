# 聊天引用回复与已读搜索 Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 群聊/私聊可引用回复；会话列表与群内可搜索；再次进入有未读时出现「以下为新消息」。

**Architecture:** 引用以 `replyTo` 元数据为主，云端写 `reply_to_*` 列，缺列时正文 `#yjq:` 前缀。未读仍用本机 `lastRead`，不做群已读回执。搜索为纯函数过滤。

**Tech Stack:** React 19、Vitest、Supabase 可选列

### Task 1: 库

- [x] `chatQuote.test.ts` 编解码与摘要
- [x] `searchInbox` / `searchMessages` / `firstUnreadId` / `withChatMarkers`

### Task 2: 云端行

- [x] `mapChatRow` 读引用列；`social.sql` 加 `reply_to_*`

### Task 3: UI

- [x] 气泡「回复」+ 引用条；点摘要滚到原句
- [x] 会话列表搜索；群内搜索；未读分隔

### Task 4: 验收

- [x] `npx vitest run` 与 `npx tsc --noEmit`
- [x] 更新 `task_plan.md` / `progress.md`
