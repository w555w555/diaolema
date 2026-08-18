# findings.md

## Product

- 仓库名仍为钓了嘛；产品对外名：渔见。
- 用户要三条能力：实时天气（气压、湿度等）、基于气象的水层/饵/钓法、上海渔获在高德地图上以附文展示。
- Spec + SDD 已作为项目规则开启。

## Data / Compliance

- 小红书探索技能依赖已登录 Chrome 自动化，不能作为本应用的后台数据源。
- 每日公开发现改用项目 skill：`baidu-search`、`multi-search-engine`、`defuddle`。
- Open-Meteo 提供 `pressure_msl` 与 `relative_humidity_2m`，满足 FR-1。
- 高德 JS API 需要用户自己的 Key。
- 点评网页搜索/App 几乎全是登录墙，公开 HTML 商户页只有少数能打开；上海路亚营地以钓鱼之家「上海收费路亚」五页目录为主。

## Shanghai spots (seed)

滴水湖、淀山湖、崇明北湖、明珠湖、金海湿地、南汇嘴、世纪公园、共青森林公园、大莲湖、杨浦滨江、奉贤海湾、金山城市沙滩。
