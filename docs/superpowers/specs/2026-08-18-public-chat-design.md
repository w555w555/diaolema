# 渔见公网群聊（第一期）

> 日期：2026-08-18  
> 状态：已实施  
> 对应：`docs/spec/PRD.md` FR-9、`docs/spec/SDD.md` 4d

## 背景

当前群聊写在浏览器 `localStorage`（`diaolema.hub.chat.v1`），只有本机看得到。上线后需要变成公网主题群：所有打开同一房间的人看到同一份消息。

资料、渔获、点赞、关注、钓场反馈等其它本机数据**不在本切片**。天气规则、商城支付、一对一私信仍不做。

## 已选方案

用现有 **Supabase**（Auth 已接好）：Postgres 存消息 + Realtime 推送新行。

未选：自建 WebSocket（运维多）、飞书当聊天室（不适合公开 IM）。

## 产品行为

- 房间：沿用 `hub.json` 现有主题群（`room-lure` 路亚夜聊、`room-ji` 台钓鲫鱼、`room-gear` 装备互助、`room-match` 赛事），不新增大厅。
- **不登录可以看**历史与新消息。
- **登录后才能发言**。未登录时输入框禁用，提示去「我的」登录。
- 作者取当前资料昵称（本机 `loadProfile().name`），写入该条消息后不再改写历史。
- 正文去首尾空格；空文案不发送；最长 200 字。
- 配好 `VITE_SUPABASE_URL` 时：只读写云端表，不再把新消息写入 `diaolema.hub.chat.v1`。空房间显示「还没有口讯」。`hub.json` 种子消息只用于无云端配置时的本机演示，并标「示例」。
- 未配 Supabase：保持现有本机 localStorage 行为，文案标明本机演示。
- 不做：私信、删改消息后台、敏感词库、已读、图片消息。本切片不提供管理员删帖界面。

## 数据

表 `public.chat_messages`：

| 列 | 类型 | 说明 |
|----|------|------|
| id | uuid PK | 默认 `gen_random_uuid()` |
| room_id | text | 必须是上述四个 id 之一 |
| user_id | uuid | `auth.users.id`，插入时必须等于 `auth.uid()` |
| author | text | 发送时昵称快照，1–12 字 |
| body | text | 1–200 字 |
| created_at | timestamptz | 默认 `now()` |

RLS：

- `SELECT`：匿名与登录均可（`using (true)`）。
- `INSERT`：仅 `authenticated`，且 `user_id = auth.uid()`，并校验 `room_id` / `body` / `author` 长度。
- 不开放 `UPDATE` / `DELETE`。

Realtime：对该表开启 postgres_changes，客户端按当前 `room_id` 订阅 `INSERT`。

每个房间一次最多拉最近 200 条，按 `created_at` 正序展示。

## 前端

- `src/lib/hub.ts`：拆出纯函数 `messagesForRoom`（保留单测）；云端读写放到 `src/lib/hubChat.ts`（或同等模块），用 `getSupabase()`。
- `HubScreen` 进入房间：拉取该群；订阅 Realtime；卸载时取消订阅。
- 发送失败：提示「发送失败」，正文留在输入框。
- secret key 仍禁止进前端。

## 测试

- `messagesForRoom` 仍只测排序与过滤。
- 映射云端行 → `HubChatMessage`（`source: 'user'`）可单测。
- 空文案 / 超长不调用 insert（纯函数校验）。
- 不在 CI 打真实 Supabase。

## 以后（不在本期）

资料与头像、渔获、点赞关注、钓场/装备评测再迁到同一项目。
