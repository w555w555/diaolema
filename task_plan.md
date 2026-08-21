# task_plan.md — 钓了嘛 MVP

## Goal

交付可演示的「钓了嘛」：实时天气（气压/湿度）、作钓建议、上海渔获高德地图附文；并开启 Spec + SDD。

## Phases

| Phase | Status | Notes |
|-------|--------|-------|
| 1. Spec + SDD + Cursor 规则 | complete | PRD / SDD / spec-sdd.mdc |
| 2. 脚手架 + 建议引擎测试 | complete | 8 tests passed |
| 3. 天气 / 渔获 / 地图 UI | complete | 首页壳 + 钓点 Tab；高德优先 Leaflet 降级 |
| 4. test + build | complete | vitest + vite build OK |
| 5. 本机 save_post 桌面端 | complete | 双击启动；现改为飞书多维表 |
| 11. 飞书 CLI 当渔获库 | in_progress | 替换 SQLite；需 feishu:login |
| 6. 每日鱼情日报 | complete | 公开线索 + 手动链接 → fish_scout_data/reports |
| 8. 上海点评渔场 | complete | 公开商户人均 + 地图「场」标点 |
| 8b. 上海路亚/钓鱼营地扩目录 | complete | 钓鱼之家收费路亚 + 路亚塘公开页 |
| 9. AI 识鱼 Spec + SDD | complete | FR-7 |
| 10. AI 识鱼实现 | complete | 词表/本机 API/识鱼面板 |
| 12. 首页 UI 排版 | complete | FR-8；指数可测；71 tests |
| 13. 路亚拟饵按鱼种 | complete | 克数/颜色/操法；公开文编译 |
| 14. 窗口期倒计时 | complete | 天气条晨昏窗 HH:MM:SS |
| 15. 首页精简 | complete | 去工具卡/目标鱼卡；方案两格 |
| 16. 目标鱼按钓法筛选 | complete | 台钓/路亚/兼钓；公开文编译 |
| 17. 钓友分享 | complete | 瀑布流 + 本机点赞/关注 |
| 18. 钓点评分与反馈 | complete | 稀疏评分钉 + VenueDetail |
| 20. 我的个人中心 | complete | 登录后改昵称/头像；群聊用昵称 |
| 26. 内容互动 + 语音表情 | complete | 评论/转发卡片可点开/真关注/主页；聊天表情与 15s 语音 |
| 27. 聊天发图 + 会话未读 | complete | `[图片]` 本机图；渔圈会话列表与底栏红点 |
| 28. 钓点筛选距离 + 举报拉黑 | complete | 类型/营业中/离我近；拉黑隐藏渔获评论私聊 |
| 29. 渔获多图与短视频 | complete | 最多 9 图；短视频 ≤15 秒；列表角标 |
| 30. 短视频上传云端 | complete | Storage 公开桶；群聊/分享只存 URL，别人可播 |
| 31. 聊天引用 + 已读/搜索 | complete | 回复引用；会话/群内搜索；未读「以下为新消息」 |
| 25. 粉丝互关私聊 | complete | 互关 + 双方允许开关；dm_allows / dm_messages |
| 21. 手机定位与拍照 | complete | 开屏/+ 定位；识鱼与报渔获拍照 |
| 22. Zeabur 打包 | complete | GitHub 或 CLI 部署；zbpack + start |
| 32. 登录拉回 + 评论上云 + 私聊 Realtime + 示例图 | complete | 点赞/关注/想买/评测/拉黑/私聊开关登录合并；share_comments；FanList 用 canOpenFanChat；DM Realtime；public/shares 与 spot-photos |
| 33. 理由入口 + 选点天气 + 图上云 | complete | 方案「理由」；选点改天气；渔获/聊天图上传 Storage |
| 34. 预报 + 头像语音上云 + 收藏 + 渔获改删 | complete | 天气 24h/7d；头像/语音 HTTPS；venue_favs；自己的渔获可改删；不做地图渔获钉 |
| 35. OLED 仪器盘 UI | complete | 金青绿存档 `_archive/ui-gold-green/`；策略页指数环+气象短卡+今日怎么钓；今日渔获迁渔圈 |
| 36. 气压不再写成鱼情因果 | complete | 指数=出钓适宜度，气压不计分；方案标经验；网格点不是水体 |
| 37. 水色与气象新字段 | complete | 降水推水色（非测站）；能见度/紫外/露点/阵风；浑浊改饵色 |
| 38. 塘边目测水色 | complete | 策略页点选清澈/微浑/黄泥/藻绿/茶褐/乳白/黑浑；目测优先于降水推演 |
| 39. 钓点点评附近鱼塘 | complete | 列表默认附近鱼塘；点导航才打开地图 |
| 40. 路亚诱鱼剂对标贝克力 | complete | 厂方数字锁在 `lureScent.ts` 进方案引擎；首页不展示诱鱼剂卡 |
| 41. 策略首页完整方案 | complete | 点选钓法/水色/对象鱼立刻重算；首页 `.plan-sheet` 展示水层/饵/标点/窗口 |
| 42. 手机电脑网页核 + 钓点完整页 | complete | 底栏不再挡钓点列表；窄屏全宽；电脑居中列 |
| 43. 词表手册进程序并逐条核验 | complete | `fishHandbook` + `auditHandbook`；鱼类介绍展示来源与 7 个气象键对照 |
| 44. 路亚饵色水色×鱼种加权 | complete | `lureColor.ts` 输出分数；拟饵卡展示前三色；标经验 |
| 45. 开屏产品宣言 | complete | Logo + 两句宣言；仪器盘配色；约 4.2s / 轻触进入 |
| 46. 饵色词表入库并写入建议 | complete | JSON + Postgres；tip/reasons 含饵色；窄屏折行 |

## Decisions

- 天气用 Open-Meteo，不强制用户先申请天气 Key。
- 地图以高德为准，无 Key 时 Leaflet 降级，避免空白页。
- 小红书等平台不做未授权爬取；渔获 = 示例整理 + 本机上报。
- 海平面气压只作文气读数，不计入出钓适宜度，也不写成开口/溶氧因果；水层饵料仍按公开经验手册，标「经验」。
- 水色由近 6/24 小时降水推演（偏清/微浑/浑浊），标明不是测站；能见度是空气视程。不编造溶氧，不用海表温度冒充湖塘水温。
- 塘边水色由钓友目测点选（色相+能否见底），优先改饵；未选才用降水浊度。肥塘无雨也可以是藻绿或茶褐。
- 路亚诱鱼剂对标贝克力：主效是咬住后含饵更久（厂方缸测约 18 秒 vs 无味约 1 秒），不是远诱开口。油性喷剂鱼闻不到。400× / 45% 只锁在数据表，不写进方案文案。

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
| | | |
