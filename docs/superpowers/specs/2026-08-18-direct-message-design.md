# 粉丝互关私聊

> 日期：2026-08-18  
> 状态：已确认实施

## 规则

- 互关：对方在「我的粉丝」里，且我在首页关注了同名作者。
- 双方都打开该人的「允许私聊」。示例粉丝默认已打开对你的开关；你这边默认关。
- 同时满足后，粉丝名单出现「私聊」。
- 登录后才能发言；消息进 Supabase `dm_messages`，仅自己的会话可读。不是公网群聊。
- 示例粉丝不会真人回复。

## 数据

- 本机：`diaolema.me.dmAllow.v1`
- 云端：`dm_allows (user_id, peer_key, allowed)`；`dm_messages (thread_id, sender_id, author, body, created_at)`，`thread_id = dm:{userId}:{fanId}`
