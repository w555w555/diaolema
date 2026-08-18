# 钓了嘛 Software Design Document（SDD）

> 对应规格：`docs/spec/PRD.md`  
> 日期：2026-08-17

## 1. 系统概览

Vite + React + TypeScript 单页应用。浏览器内完成天气拉取、建议计算、地图渲染。

本机桌面模式再加一层 **本地 Node 入库服务**（无独立公网后端）：`save_post` 把分享文案 / 公开网页经 **Feishu CLI（`lark-cli`）** 写入飞书多维表格，再映射为 `CatchReport` 钉到地图。SQLite 不再作为渔获库。

```
[定位/选点] → WeatherClient(Open-Meteo)
                    ↓ WeatherSnapshot
              AdviceEngine（纯函数）
                    ↓ FishingAdvice
              WeatherPanel + AdvicePanel + FishIdPanel
              buildFishingIndex（纯函数，0–100）
              HomeScreen + BottomNav（地图在钓点 Tab；渔圈为第三主页面）

IntelStore (seed JSON + localStorage)
                    ↓ CatchReport[]
              CatchMap（高德优先 / Leaflet 降级）
                    ↓ 渔获附文 + 点评渔场标点 + 导航

桌面模式：
[启动钓了嘛.bat] → Vite :5174 + /api/ingest|/api/posts|/api/report|/api/daily-report|/api/fish-id
                    ↓ save_post → lark-cli base +record-*
              飞书多维表「钓了嘛 / 渔获情报」
                    ↓ CatchReport[]
              ShareImport / DailyReport / CatchMap
[scout:daily] → 手动链接 + 公开搜索摘要 → 飞书多维表 + posts 归档 + reports

云端（Zeabur）：
[npm run build] → dist 静态页
[npm start] → server/preview.mjs 监听 PORT（Vite preview + 同一套 /api）
                    ↓ HTTPS
              手机定位 / 实时取景 / 识鱼
```

## 2. 技术选型

| 层 | 选择 | 原因 |
|----|------|------|
| UI | React 19 + Vite | 启动快；首页壳 + 钓点地图 + 渔圈 |
| 语言 | TypeScript | 与 Spec 类型对齐 |
| 天气 | Open-Meteo Forecast API | 气压/湿度/风/降水，免 Key |
| 地图 | 高德 JS API 2.0 | 需求指定；`@amap/amap-jsapi-loader` |
| 降级地图 | Leaflet + OSM | 无 Key 时仍能演示标记 |
| 测试 | Vitest | 建议引擎 TDD |
| 持久化 | 飞书多维表（`lark-cli`）+ `fish_scout_data/posts/` + `reports/` | 渔获库在飞书；本机只留归档与日报 |
| 鱼情配置 | `fish_scout.config.yaml` | 地点、平台、关键词、AI |
| 公开发现 skill | baidu-search / multi-search-engine / defuddle | 合规公开检索与正文抽取 |
| 桌面窗口 | Edge/Chrome `--app=` 或系统浏览器 | 双击 bat，不要求手开终端 |
| 云端 | Zeabur Node：`zbpack.json` + `npm start` | GitHub 或 CLI 部署；HTTPS |

## 3. 核心类型

```ts
type WeatherSnapshot = {
  at: string;
  lat: number;
  lon: number;
  temperatureC: number;
  apparentC: number;
  humidityPct: number;
  pressureHpa: number;
  pressureDelta3h: number; // 当前 - 3小时前，负值=气压下降
  windKmh: number;
  windDirDeg: number;
  precipitationMm: number;
  weatherCode: number;
  cloudPct: number;
};

type WaterLayer = '上层' | '中上层' | '中下层' | '底层';

type FishingAdvice = {
  layer: WaterLayer;
  baits: string[];
  method: string;
  tip: string;
  reasons: string[];
  targetFish: string[];
  flavor: string;
  form: string;
  baitLabel: string;
  spot: string;
  lure: string;
  lureNote: string;
  window: string;
};

type FishingVenue = {
  id: string;
  shopId: string;
  name: string;
  district: string;
  addressHint: string;
  kind: string;
  avgPriceYuan: number | null;
  feeLabel: string;
  status: 'open' | 'paused' | 'closed' | 'unknown';
  statusLabel: string;
  catalogSource?: 'dianping' | 'diaoyu' | 'kklure' | 'web';
  imageUrl?: string;
  lon: number;
  lat: number;
  url: string;
};

type FishIdResult = {
  species: string;
  confidence: number;
  alternatives: { species: string; confidence: number }[];
  cues: string[];
  inCatalog: boolean;
};

type FishingIndex = {
  score: number; // 0–100 整数
  label: '很高' | '较高' | '一般' | '偏低' | '不宜';
  reasons: string[];
};

type HubProduct = { id: string; name: string; kind: string; priceYuan: number; blurb: string };
type HubEvent = { id: string; title: string; when: string; place: string; kind: string; blurb: string };
type HubTip = { id: string; title: string; method: '台钓' | '路亚' | '兼钓'; summary: string; body: string };
type HubRoom = { id: string; name: string; topic: string; members: number };
type HubChatMessage = { id: string; roomId: string; author: string; body: string; createdAt: string; source: 'seed' | 'user' };
```

## 4. 建议引擎（FR-2）

纯函数 `buildAdvice(weather, at = Date)`。优先级从高到低：

1. **盛夏正午高温**（月∈{6,7,8,9} 且气温≥30 且小时∈[10,16]）→ 底层；清淡底饵；建议荫凉/夜钓。
2. **气压急降**（3h ΔP ≤ -1.5 hPa）→ 中上层；腥香雾化饵或活饵；台钓加快抛频 / 路亚搜上层。
3. **高气压稳定**（气压 ≥ 1022 且 |ΔP| < 1）→ 底层；蚯蚓红虫小钩细线；守底少动。
4. **低气压**（气压 ≤ 1008）→ 中上层；轻质 commerical 饵或表层路亚。
5. **默认** → 中下层；香腥各一；台钓找底后略离底。

附加修正：

- 降水中：偏腥、靠近进水口，层略升一档（底层→中下层，中下层→中上层）。
- 风 ≥ 25 km/h：饵加重、抗风钓组；路亚改侧风岸。
- 小时 ∈ [5,7]∪[17,19]：可并列推荐浅层对象鱼（白条/翘嘴）。

对象鱼池（上海）：鲫、鲤、草、鳊、黄颡、白条、翘嘴、鲈、黑鱼。

目标鱼按钓法筛选（`catalogForStyle`）：台钓饵钓对象鲫鲤草青鳊鲮黄颡黄鱼鲻；路亚掠食对象鲈翘黑鳜鳡红鳍鲌；兼钓白条罗非鲶塘鲺。来源：渔钓者路亚对象鱼、酷钓鱼拟饵对象表、饵料网台钓/路亚鱼种对比、酷钓鱼鲻鱼路亚效果差。运行时不联网。

`buildAdvice(weather, at, { targetFish, style })`。`src/lib/plan.ts` 给出味型、饵形、标点：

- 味型：气温＜12 大腥；12–18 腥香；18–26 香腥；≥26 清香；盛夏正午或≥30 本味清淡。低压清淡改「清淡带果酸」。来源：公开台钓饵料文（冬春主腥、夏主清淡）。
- 饵形：鲫/鳊/白条偏拉饵；鲤/草/青或高气压/大风偏搓饵；黄颡/鲶用虫饵；路亚为拟饵。
- 台钓标点：鲫→草边凹岸/草洞；鲤→凸岸缓坡亮水；草→草边；青→深潭桥墩；翘嘴/白条→深浅交界；黑鱼→草洞。雨天加进水口缓流；正午改荫凉桥洞；晨昏近岸浅滩。
- 路亚拟饵（`planLurePick`）：按对象鱼 + 气温/时段/降水。翘嘴夏 7–12g 斜切亮片、冬春 12–20g 远投、晨昏波扒、夜钓勺型 7–10g；黑鱼草区 10–14g 雷蛙、光水深潜米诺；鳜铅头钩卷尾 7–10g（晨昏 5–7g）/夜 VIB；鲈结构软虫或浅层米诺；白条瓜子亮片 1.5–3g；鲶胡须佬贴底。清水银白、浊水红头金、夜钓橙红。来源：渔夫者/钓鱼007、渔钓者、酷钓鱼、酷米网。运行时不联网。

运行时不联网。

## 4b. 钓鱼指数（FR-8）

纯函数 `buildFishingIndex(weather, at = Date)`，起点 62 分，再按与建议引擎相同的气象信号加减，最后夹紧到 0–100。

| 信号 | 加减 |
|------|------|
| 气压急降（3h ΔP ≤ -1.5） | +16 |
| 气压缓降（-1.5 < ΔP ≤ -0.5） | +8 |
| 气压急升（ΔP ≥ 1.5） | -10 |
| 高气压稳定 | -12 |
| 低气压（≤ 1008） | +8 |
| 盛夏正午高温 | -18 |
| 气温 18–26°C | +8 |
| 气温 < 8°C 或 ≥ 35°C | -18 / -14 |
| 风 ≥ 25 km/h | -12 |
| 轻降水 | +6 |
| 大雨/雷暴（降水 ≥ 5 mm 或天气代码 ≥ 95） | -30 |
| 晨昏窗口且非正午高温 | +8 |

档位：≥80 很高，≥65 较高，≥50 一般，≥35 偏低，否则不宜。理由 2–4 条，用气压/气温/风/降水解释。

## 4c. 窗口期倒计时（FR-8）

纯函数 `windowCountdown(at)`，与 `climateFlags.prime` 同一套钟点：

- 晨间窗口：当日 05:00 ≤ t < 08:00
- 黄昏窗口：当日 17:00 ≤ t < 20:00

窗口内 `phase=in`，倒计时到该窗结束；窗外 `phase=wait`，倒计时到下一窗开始（20:00 之后算次日晨间窗口）。文案：`晨间窗口剩余` / `黄昏窗口剩余` / `距晨间窗口` / `距黄昏窗口`。剩余时间格式 `HH:MM:SS`。首页天气条每秒刷新；不调模型、不联网。`fishGuide(name)` 返回习性介绍与技巧条目，词表外回落通用说明。

## 4d. 渔圈（FR-9）

`HubScreen` 挂在底栏 `hub`（文案「渔圈」）。首页不是五块空磁贴：顶栏 + 五入口条，下接赛事、装备、群聊、技巧预览，点预览进入对应列表。`src/data/hub.json` 静态示例：商品、赛事、技巧、评测、群与种子消息。`src/lib/hub.ts`：`toggleWish`、`messagesForRoom`、`appendChatMessage`、`persistGearReview` 可单测。想买 / 群聊用户消息 / 装备评测写 localStorage，不写飞书。商城无结算。群聊不是 WebSocket。

## 4e. 我的（FR-10）

`MeScreen` 挂在底栏 `me`。资料 `loadProfile` / `saveProfile` 存 localStorage。四列：渔获、`shareSocial.follows`、`DEMO_FANS`、`loadWishIds`。点粉丝打开示例名单。分组菜单进渔获 / 想买 / 入库 / 天气 / 日报 / 关于。不接登录与私信。视觉与渔圈同套金青绿层次，不是单色平铺。

## 5. 天气客户端（FR-1）

`GET https://api.open-meteo.com/v1/forecast`

Query：`latitude, longitude, timezone=Asia/Shanghai, current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m,cloud_cover, hourly=pressure_msl, past_hours=6, forecast_hours=1`

`pressureDelta3h`：用 hourly `pressure_msl` 中最接近 3 小时前的点减去当前 `pressure_msl` 的相反数，即 `current - past`。

定位：`src/lib/geo.ts` 的 `requestCurrentPosition` / `geoErrorMessage`。开屏结束后、进入钓点、进入「+」调用 `navigator.geolocation`（`enableHighAccuracy`）。非安全上下文、拒绝、超时映射中文原因，坐标回落 `SHANGHAI_CENTER`。开发服务器 `host: true`，桌面启动绑定 `0.0.0.0`，手机可用局域网 IP 打开；定位与实时取景需 HTTPS 或 localhost。

## 6. 地图（FR-3）

- 环境变量：`VITE_AMAP_KEY` / `AMAP_KEY`，可选安全码。构建期可打进前端；运行期 `GET /api/map-config` 再读一遍，方便 Zeabur 只配运行变量。`CatchMap` 在钓点 Tab 显示时 `resize`，避免隐藏容器空白。无 Key 或 SDK 失败时 Leaflet 用高德栅格底图（国内可显示），不用 OSM。
- 高德加载成功：`AMap.Map` 中心上海，插件 `AMap.Scale` / `AMap.ToolBar` / `AMap.Geolocation` / `AMap.Driving` / `AMap.Walking`。附文含导航按钮。
- 失败或无 Key：Leaflet 地图 + 同样数据；仍提供 `uri.amap.com` 导航。
- 运行时向 UI 回报 `engine: 'amap' | 'leaflet'`，禁止仅凭 env 有 Key 就显示「高德已开启」。
- 附文格式函数：`formatCatchCaption(report, now)` → `沪上老张 3小时前 钓到了鲈鱼`（标点下方常显）。
- 分享解析：`src/lib/parseShare.ts`，支持小红书 / 抖音 / 微博口令。
- 入库流水线：`src/lib/ingest/savePost.ts`（对应用户提供的 `save_post`）。
  - `detectPlatform(url)`：按域名识别平台。
  - `fetchPageText(url)`：仅公开网页；小红书/抖音/微博域名直接返回空，不绕登录、不打验证码。
  - `extractInfo`：规则抽取地点/鱼种/钓法/饵/渔获量。
  - `aiExtractFishingInfo`：配置了 API Key 才调用；规则优先，AI 只补空字段。
  - 飞书表 `渔获情报` 以「链接」唯一；重复链接返回未插入。读写一律走 `lark-cli base +record-list / +record-upsert`，不直连 Open API。
  - 新入库同时写入 `fish_scout_data/posts/` 下的 `.json` 与 `.md`。
  - 每日公开发现：`buildSearchQueries` 按 `selected_locations × enabled platforms × 关键词` 生成 `site:` 检索。检索顺序：千帆 `baidu-search`（有 Key）→ Bing 中国 → 百度 HTML → 微信查询再走搜狗微信 → DuckDuckGo。只存 SERP 的标题/摘要/链接。命中 URL 必须匹配**当前查询**的 `site`/别名（`hitMatchesQuerySite`）。
  - 公开正文：登录墙域名不请求；非登录墙页先尝试本机 `defuddle parse --md`，失败再 `htmlToText`。
  - 原始发现写入 `fish_scout_data/discovery/YYYY-MM-DD.json`，再 `save_post` 入库，最后生成日报并可做 AI 综述。
  - Agent skill：`.cursor/skills/baidu-search`、`.cursor/skills/multi-search-engine`、`.cursor/skills/defuddle`。禁止使用小红书登录抓取类 skill。
- 导航 URL：`src/lib/navigation.ts` 的 `buildAmapNavUrl`。
- 上海路亚/钓鱼营地：`src/data/dianping-venues.json` 静态目录。`CatchMap` 高德 `mapStyle` 为 `amap://styles/normal`，`setFeatures(['bg','road','building'])`。底栏进入钓点时 `locateVisit` 触发定位，视野 `NEARBY_MAP_ZOOM`（14）对准当前位置。`zoom < SPOT_PLATE_MIN_ZOOM` 用 `venueDotHtml` 小头像钉，靠近后用 `venuePinHtml` 铭牌。`searchVenues` 按店名/区县/路名/类型过滤；`rankVenues` 按渔见均分降序。地图仅一个「钓场」入口，`VenueList` 默认排行 + 搜索，名次取全量排行而非筛选后重排；每条展示 `reviewsForVenue` 条数。点条目 `onOpen` 打开本机 `VenueDetail`，列表与详情不以 `venue.url` 作为进入入口。从排行进详情后关闭回到排行。头像优先客户反馈图，否则 `/logo.svg`。客户反馈在 `src/data/spot-reviews.json` + localStorage；演示图在 `public/spot-photos/`（公开图库，虚拟星级）。`averageScore` 可单测。点钉打开 `VenueDetail`。不把点评星级直接当渔见分。不登录点评/钓鱼人 APP。
- 桌面入口：`启动钓了嘛.bat` → `desktop/start.mjs`（Vite 端口 5174 + 应用窗口）。

## 7. 目录

```
src/types.ts
src/lib/weather.ts
src/lib/advice.ts
src/lib/plan.ts
src/lib/fishingIndex.ts
src/lib/fishId/catalog.ts
src/lib/windowCountdown.ts
src/lib/fishGuide.ts
src/lib/catchThumb.ts
src/components/HomeScreen.tsx
src/components/BottomNav.tsx
src/components/Sheet.tsx
src/lib/caption.ts
src/lib/intel.ts
src/lib/navigation.ts
src/lib/parseShare.ts
src/lib/scout/*
.cursor/skills/baidu-search
.cursor/skills/multi-search-engine
.cursor/skills/defuddle
src/lib/ingest/store.ts
src/lib/ingest/feishuCli.ts
src/lib/ingest/memoryStore.ts
src/lib/ingest/provisionFeishu.ts
src/lib/ingest/*
src/vite-plugin-ingest.ts
desktop/start.mjs
启动钓了嘛.bat
src/data/catch-reports.json
src/data/spot-reviews.json
src/data/hub.json
src/lib/hub.ts
src/lib/meProfile.ts
src/components/HubScreen.tsx
src/components/MeScreen.tsx
src/lib/venues.ts
src/lib/venueIcons.ts
src/components/FishIdPanel.tsx
src/components/VenueList.tsx
src/components/WeatherPanel.tsx
src/components/AdvicePanel.tsx
src/components/CatchMap.tsx
src/components/ReportForm.tsx
src/components/ShareImport.tsx
src/App.tsx
```

## 8. 安全

- Key 仅存在于本地 `.env`。
- 不请求用户的小红书 Cookie。
- 用户上报内容只留在本机。
- 飞书 Base token / 表 ID 只在本机 `.env`；渔获正文进用户自己的多维表。
- 不抓取需要登录的小红书 / 抖音 / 微博 / 微信公众号正文。
- 识鱼 API Key 只在本机 `.env`；渔获照片不默认落盘、不写入飞书。

## 9. 测试

- `buildAdvice`：高温正午、气压急降、高气压、低气压、降水修正。
- `planFlavor` / `planSpot`：低温大腥、鲫草边、雨天进水口、路亚黑鱼草洞。
- `buildFishingIndex`：气压急降抬分、盛夏正午压分、雷暴不宜、结果夹紧 0–100。
- `windowCountdown`：晨间/黄昏窗口倒计时文案。
- `fishGuide`：目标鱼介绍与技巧；词表外回落通用说明。
- `formatCatchCaption`：分钟 / 小时 / 昨天。
- `buildAmapNavUrl`：高德导航 URI。
- `detectPlatform` / `extractInfo` / `mergeRuleAndAi`：入库识别与 AI 补空。
- `hitMatchesQuerySite` / `parseBaiduHtml` / `parseSogouWeixinHtml` / `parseBaiduApiResponse`：公开发现按查询站点过滤。
- `fetchPageTextWithDefuddle`：登录墙不抽正文。
- `formatVenueFee` / `parseDianpingShopSnippet`：点评公开人均与状态。
- `searchVenues` / `rankVenues` / `reviewCountLabel`：钓场列表整合为排行 + 搜索（均分高到低，无分最后；筛选保留原名次）；排行展示反馈条数。点条目打开本机 `VenueDetail`，不跳转钓鱼之家网页。`venuePinHtml` / `venueDotHtml` / `showSpotPlate`：进入先定位；拉远小钉、靠近铭牌。无照片用渔见 Logo。不展示数字分。点钉打开 `VenueDetail`。渔获气泡不叠在钓点地图上。
- `toggleWish` / `messagesForRoom` / `appendChatMessage`：渔圈想买与本机群聊；不接支付与公网 IM。
- `loadProfile` / `saveProfile` / `DEMO_FANS`：我的页资料本机存储；粉丝为示例名单。
- `normalizeFishName`：乌鳢→黑鱼，黄辣丁→黄颡鱼，花鲈→鲈鱼；未知→不确定。主名不确定时采用第一词表候选。
- `createMemoryStore` / `savePost`：重复链接不插入；单测不调用真实飞书。
- `parseFeishuRecords`：把 lark-cli JSON 解析成 `PostRow`。

## 11. 飞书渔获库

对应 PRD 渔获数据策略。本机通过项目依赖 `@larksuite/cli` 调用 `lark-cli`，把「渔获情报」表当数据库。

| 项 | 选择 |
|----|------|
| 工具 | `lark-cli base +record-list` / `+record-upsert` / `+record-search` |
| 身份 | `--as user`（用户自己的多维表） |
| 配置 | `.env` 的 `FEISHU_BASE_TOKEN`、`FEISHU_TABLE_ID` |
| 唯一键 | 字段「链接」 |
| 未登录/未配表 | `/api/posts` 返回空列表；写入返回 503 |
| 测试 | `createMemoryStore` 内存库，不打飞书 |

首次：`npm run feishu:login` 完成 `lark-cli config init --new`，再 `npm run feishu:provision` 创建「钓了嘛」Base 与「渔获情报」表。


## 10. AI 识鱼（FR-7）

对应规格：`docs/spec/FR-7-fish-id.md`。

```
[系统相机 / 实时取景 / 相册] → PhotoCapture → 浏览器压缩 JPEG
                    ↓ POST /api/fish-id  { imageBase64, mime }
              fishIdServer（本机）
                    ↓ 豆包 ARK POST /api/v3/chat/completions
              解析回复 → normalizeFishName
                    ↓ FishIdResult
              FishIdPanel（首页可带 initialFile）
              ReportForm 同样用 PhotoCapture，封面走 packedToDataUrl
```

| 项 | 选择 |
|----|------|
| 传输 | 本机 `POST /api/fish-id`，JSON：`{ imageBase64, mime }` |
| 上游 | 豆包识图 `https://ark.cn-beijing.volces.com/api/v3`；`thinking.type=disabled`；图最长边 1280、高质量 JPEG；提示含易混种外形核对 |
| 解析 | `parseFishReply`：JSON 或从中文回复里抽词表鱼名 |
| 归一化 | `src/lib/fishId/catalog.ts` 的 `normalizeFishName` |
| UI | `PhotoCapture`（识鱼与「+」报渔获共用）+ `FishIdPanel` |
| 未配置 Key | 503 `not_configured`，UI 改手动词表点选 |

拍照：点「拍照」先尝试 `getUserMedia` 后置取景；失败或不在安全上下文则触发 `<input type=file accept=image/* capture=environment>`。相册输入不加 `capture`。压缩图可作本机 `CatchReport.imageUrl`；`stripInlineImage` 后才 `persistReportToServer`。不把原图写入飞书。

## 12. 首页壳（FR-8）

```
[天气] → buildAdvice + buildFishingIndex
              ↓
        HomeScreen（策略：天气条 / 最佳方案 / 识鱼入口 / 钓友分享）
              ↓ 底栏
        钓点：CatchMap 常驻 visibility
        发布：FishIdPanel + ReportForm（均可拍照；进入时定位）
        渔圈：HubScreen（商城 / 赛事 / 技巧 / 评测 / 群聊）
        我的：MeScreen 个人中心（资料 / 菜单 / 渔获记录）
        抽屉：VenueList / AdvicePanel / DailyReport / ShareImport / 词表换鱼 / 识鱼
```

桌面端 `.phone` 列宽 430px、圆角 44px、深底金青绿。产品名「渔见」。首页品牌行用 `public/logo.svg` + `.brand-name`（MiSans/苹方/Noto 栈、字色 `#EAF5EF–#B9CAC3`、辅文 `#69BBA7`）。启动时 `Splash` 盖住手机壳：深底金青绿光晕与水纹，Logo 淡入上浮，点按或 2.4s 后淡出，随后请求定位。切到钓点时 `CatchMap` 不卸载。首页 AI 识鱼卡带拍照，选图后打开识鱼抽屉并识别。地图选点时强制切到钓点 Tab。风力用 `windScaleLabel` 转成几级；出钓文案用 `outingLabel` 映射指数档位。天气条用 `windowCountdown` 显示晨昏窗口倒计时。方案格只放味形/拟饵与标点；点鱼名换目标鱼（列表按当前钓法筛选）；点天气条开天气抽屉。首页上半 `.home-main` 按内容撑开（不设 58% 上限），避免今日方案被压扁；下半 `CatchShareFeed` 独立滑动且不显示滚动条。拍照取景左上角「‹ 返回」关闭镜头。区头「今日渔获 · N / 全部 ›」带细金线。双列瀑布流：`coverRatio(id)` 给出 3/4、4/5、1/1 等，卡片 `break-inside: avoid`。图上鱼种胶囊、示例黑底白字；图下标题、作者、点赞。`shareSocial`：点赞/关注存 localStorage，种子赞数由 id 哈希，点赞 +1 / 取消还原；关注按作者名切换。`CatchShareDetail` 同步同一状态，顶图叠作者/时间，「去钓点」全宽青绿。不把策略顶出屏幕。`shareCover`：有 `imageUrl` 用图，否则 `catchThumb` 深色底 + 鱼名。点卡片打开全文，再去地图。不展示未测的溶氧与水温。首页不堆常用工具与目标鱼说明卡。不写飞书粉丝关系、无私信。

## 13. Zeabur 部署

控制台**没有**上传 ZIP 入口。用 GitHub 仓库，或本机 CLI 把当前目录推上去。不要设 `output_dir`，否则只会静态托管、识鱼 API 失效。

| 项 | 约定 |
|----|------|
| 控制台 | 项目里 **Add Service → GitHub**，选本仓库 |
| 本机 CLI | `npx zeabur@latest auth login` 后 `npx zeabur@latest deploy`，或双击 `部署到Zeabur.bat` |
| 构建 | `zbpack.json`：`npx vite build` → `dist/` |
| 启动 | `node server/preview.mjs`，监听 `process.env.PORT`、`0.0.0.0` |
| 构建期变量 | `VITE_AMAP_KEY`、`VITE_AMAP_SECURITY_CODE`（打进前端） |
| 运行期变量 | `FISH_ID_API_KEY` 等，与 `.env.example` 相同；不要提交 `.env` |

