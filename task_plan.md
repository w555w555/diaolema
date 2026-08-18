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
| 20. 我的个人中心 | complete | 常规资料卡 + 分组菜单 |
| 21. 手机定位与拍照 | complete | 开屏/+ 定位；识鱼与报渔获拍照 |
| 22. Zeabur 打包 | complete | zbpack + start + git archive zip |

## Decisions

- 天气用 Open-Meteo，不强制用户先申请天气 Key。
- 地图以高德为准，无 Key 时 Leaflet 降级，避免空白页。
- 小红书等平台不做未授权爬取；渔获 = 示例整理 + 本机上报。

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
| | | |
