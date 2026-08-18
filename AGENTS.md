# 渔见 — Agent 约定

本项目已开启 **Spec** 与 **SDD（Subagent-Driven Development）**。

- 产品规格：`docs/spec/PRD.md`
- 软件设计：`docs/spec/SDD.md`
- 实施计划：`docs/superpowers/plans/`
- 会话进度：`task_plan.md` / `findings.md` / `progress.md`

新功能必须先改规格，再改设计，再写代码。

## 鱼情发现 skill

每日公开发现只使用项目内这三个 skill，不要用小红书登录 / Chrome 自动化抓取：

- `.cursor/skills/baidu-search` — 千帆网页搜索，按平台域名 `sites` 过滤
- `.cursor/skills/multi-search-engine` — 无密钥公开 SERP（Bing 中国、百度、搜狗微信、DuckDuckGo）
- `.cursor/skills/defuddle` — 仅对非登录墙公开页抽取正文
