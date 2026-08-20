# 内容互动与聊天表情语音 Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 渔获评论、转发、真实关注/粉丝与作者主页；群聊/私聊表情包与 15 秒语音。

**Architecture:** 纯函数可单测（评论、转发文案、粉丝合并、贴纸、语音标记）。本机 localStorage；公网可选 `supabase/social.sql`。语音音频 data URL 留在本机消息，公网正文为 `[语音 N″]`。

**Tech Stack:** React 19、Vitest、MediaRecorder、Supabase

### Task 1: 规格

- [x] PRD FR-8/9/10 与验收 23/24/26
- [x] SDD 群聊/我的/分享流
- [x] `supabase/social.sql`

### Task 2: 库

- [x] `shareComments` / `shareRepost` / `authorProfile` / `chatStickers` / `chatVoice`
- [x] `npx vitest run` 相关测试

### Task 3: UI

- [x] 详情评论与转发、作者主页、关注/粉丝可点
- [x] `ChatComposer` + `ChatLog`：表情、语音
- [x] `npx tsc --noEmit`
