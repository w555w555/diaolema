# 登录拉回 / 评论上云 / 私聊 Realtime / 示例图

日期：2026-08-19  
规格：`docs/spec/PRD.md` FR-8/9/10；`docs/spec/SDD.md` 4d/4e

不做：约钓、商城支付、赛事报名、改 UI、地图渔获钉。

## 任务

1. **登录拉回**：纯函数 `unionNames` / `mergeAllowMap` + 行映射；`applyLikes` / `applyFollows` / `unionWishIds` / `applyBlocks` / `applyDmAllows`；`hydrateLocalFromCloud` 在 `SIGNED_IN` 与本机并集。
2. **评论上云**：`mapCommentCloudRow` / `mergeCommentLists` / `persistUserComments`；登录拉 `share_comments`；发表后 `pushComment`。示例评论仍 `seed`。
3. **私聊**：FanList 用 `canOpenFanChat`，不为非示例粉丝自动打开允许；`dmThreadIds` + `subscribeDmMessages`；SQL 双向 SELECT + Realtime。
4. **示例图**：`public/shares/`、`public/spot-photos/` 真实可显示；JSON 指向存在的文件。
