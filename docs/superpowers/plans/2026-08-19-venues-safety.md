# 钓点加深 + 举报拉黑 Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 钓场列表可按类型/营业中/距离筛选，详情有距离与附近 3 场；按作者拉黑与举报，渔获、评论、群聊与私信随之隐藏。

**Architecture:** 纯函数 `distanceKm` / `filterVenues` / `catchesForVenue` / `userSafety` 可单测。列表名次仍取全量排行。拉黑按作者昵称存 localStorage；登录后可选写 Supabase。地图仍只显示营地钉。

**Tech Stack:** React 19、Vitest、localStorage、可选 Supabase

### Task 1: 规格

- [x] PRD FR-6/8/9/10、FR-4 约钓支付以后、验收 3/27
- [x] SDD 定位距离、钓场过滤、userSafety
- [x] `supabase/social.sql` 增加 `user_blocks` / `user_reports`

### Task 2: 钓点库

- [x] `geo.test.ts`：`distanceKm` / `formatDistanceKm` 先红后绿
- [x] `venues.test.ts`：`filterVenues` / `nearbyVenues` / `catchesForVenue`
- [x] 实现 `geo.ts` 与 `venues.ts`

### Task 3: 钓点 UI

- [x] `VenueList` 芯片 + 距离 + 排序
- [x] `VenueDetail` 距离、复制地址、附近 3 场、匹配渔获

### Task 4: 安全库

- [x] `userSafety.test.ts` 先红后绿
- [x] `canOpenFanChat` 已拉黑不可聊
- [x] 实现 `userSafety.ts` + 可选 `userCloud` 推送

### Task 5: 安全 UI

- [x] 作者主页 / 渔获详情 / 群名片：拉黑与举报
- [x] 今日渔获、评论、ChatLog、会话列表过滤
- [x] 「我的 → 已拉黑」可解除

### Task 6: 验收

- [x] `npx vitest run` 与 `npx tsc --noEmit`
- [x] 更新 `task_plan.md` / `progress.md`
