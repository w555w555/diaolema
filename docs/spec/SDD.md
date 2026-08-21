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

群聊（已配 Supabase）：
HubScreen → getSupabase() → chat_messages SELECT / INSERT
                    ↓ Realtime INSERT
              同房间其它客户端追加一条
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
| 账号 | Supabase Auth（邮箱+密码） | 用户给的后台；前端只用 publishable key |
| 公网群聊 | Supabase `chat_messages` + Realtime | 已有 Auth；RLS：匿名可读、登录可写自己的行 |

## 3. 核心类型

```ts
type WaterTint = '偏清' | '微浑' | '浑浊'; // 降水推演浊度
type SightedWater = '清澈' | '微浑' | '浑浊' | '肥水';

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
  visibilityM?: number | null; // 空气能见度，不是水下
  uvIndex?: number | null;
  dewPointC?: number | null;
  windGustKmh?: number | null;
  precip6hMm?: number;
  precip24hMm?: number;
  waterTint?: WaterTint; // 近时降水推演，不是测站
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
  lureScent?: string;
  lureScentClass?: 'hard' | 'salt-pvc' | 'powerbait-like' | 'gulp-like';
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

纯函数 `buildAdvice(weather, at = Date)`。这是**公开经验手册检索**，不是今日鱼口/溶氧/水温实测。气压急降 / 高低压只作检索键；`tip` / `reasons` 必须以「经验」起句，禁止「鱼易开口」「上浮抢食」「低压氧薄」等因果句。`AdvicePanel` 写「经验主攻 {层}」，不写「鱼多半在」。

优先级从高到低：

1. **盛夏正午高温**（月∈{6,7,8,9} 且气温≥30 且小时∈[10,16]）→ 底层；清淡底饵；建议荫凉/夜钓。理由写空气温度，不写水温。
2. **气压急降**（3h ΔP ≤ -1.5 hPa）→ 中上层；腥香雾化饵或活饵；台钓加快抛频 / 路亚搜上层。文案标明经验倾向、方向有争议。
3. **高气压稳定**（气压 ≥ 1022 且 |ΔP| < 1）→ 底层；蚯蚓红虫小钩细线；守底少动。
4. **低气压**（气压 ≤ 1008）→ 中上层；轻质 commercial 饵或表层路亚。禁止「氧薄」。
5. **默认** → 中下层；香腥各一；台钓找底后略离底。

选了目标鱼之后，用 `clampLayerToHabit` 把水层夹到该鱼习性下限：白条不低于中上层；翘嘴/红鳍鲌/鳡/鳊/黑鱼不低于中下层。盛夏正午的底层守底只留给鲫鲤青等底栖对象。层已不在底层时，方法文案不得再写「守底」。路亚 `layerStance`：底层写「搜底层」，不写「守底」。

词表手册：`src/data/fish-handbook.json`（习性水层、下限、饵/拟饵关键词、公开来源）。`src/lib/fishHandbook.ts` 载入该表；`fishGuide` 的水层与常用饵只读这份数据。`src/lib/fishHandbookAudit.ts` 对每种鱼 × 其钓法 × 气象键跑 `buildAdvice`，对照手册。鱼类介绍展示来源、水层下限与核验条数。

附加修正：

- 降水中：偏腥、靠近进水口，层略升一档（底层→中下层，中下层→中上层）。
- 风 ≥ 25 km/h：饵加重、抗风钓组；路亚改侧风岸。
- 小时 ∈ [5,7]∪[17,19]：可并列推荐浅层对象鱼（白条/翘嘴）。
- **降水推演浊度**（`inferWaterTint`）：近 6/24 小时降水 → 偏清 / 微浑 / 浑浊。只作文气参考。
- **塘边目测**（`SightedWater`）：策略页点选，抬头「塘边水色」+ 怎么认。本机 `diaolema.sightedWater.v2`（旧七档读入时黄泥/乳白/黑浑→浑浊，藻绿/茶褐→肥水）。未选则 `sightedWater=null`，方案用降水推演并写「未目测」。已选则目测优先：清澈银白/本味；微浑香腥；浑浊红头金；肥水果酸+草黄。文案必须区分「目测」与「降水推演」。水色不计出钓适宜度分数。
- **水层柱**：三档 上 / 中 / 底。主攻档亮青绿渐变。`.col-tick` 细线按 `layerMarkerPct` 滑动，无鱼形 Logo。
- **鱼类详情**：标题下「鱼类介绍」打开 `FishGuidePanel`。本机 `fishGuide` 为词表库；缺外形/百科时请求 `/api/fish-guide`（维基摘要，失败则公开 SERP）。文案标公开来源，不编造溶氧与水温。
- 不渲染「同步方案」；钓法、水色、换鱼即时重算 `buildAdvice`。刷新天气走定位芯片。

对象鱼池（上海）：鲫、鲤、草、鳊、黄颡、白条、翘嘴、鲈、黑鱼。

目标鱼按钓法筛选（`catalogForStyle`）：台钓饵钓对象鲫鲤草青鳊鲮黄颡黄鱼鲻；路亚掠食对象鲈翘黑鳜鳡红鳍鲌；兼钓白条罗非鲶塘鲺。来源：渔钓者路亚对象鱼、酷钓鱼拟饵对象表、饵料网台钓/路亚鱼种对比、酷钓鱼鲻鱼路亚效果差。运行时不联网。

`buildAdvice(weather, at, { targetFish, style })`。`src/lib/plan.ts` 给出味型、饵形、标点：

- 味型：气温＜12 大腥；12–18 腥香；18–26 香腥；≥26 清香；盛夏正午或≥30 本味清淡。低压清淡改「清淡带果酸」。来源：公开台钓饵料文（冬春主腥、夏主清淡）。
- 饵形：鲫/鳊/白条偏拉饵（高压也不改搓饵）；鲤/草/青或高气压/大风偏搓饵；草/鳊高温可颗粒玉米；黄颡/鲶用虫饵；路亚为拟饵。
- 台钓标点：鲫→草边凹岸/草洞；鲤→凸岸缓坡亮水；草→草边；青→深潭桥墩；翘嘴/白条→深浅交界；黑鱼→草洞。雨天加进水口缓流；正午改荫凉桥洞；晨昏近岸浅滩。
- 路亚拟饵（`planLurePick`）：按对象鱼 + 气温/时段/降水。饵色词表 `src/data/lure-colors.json`，Postgres `public.lure_color_weights`（`supabase/lure_colors.sql`）同源。`recommendLureColors` 运行时只读 JSON。主色写入拟饵卡、`reasons[0]` 与 tip「饵色优先」。清水银白、浊水红头金、肥水草黄、夜钓橙红/暗色。不是上海渔获统计。
- 路亚诱鱼剂（`src/lib/lureScent.ts` → `pickLureScent` / `planLureScent`）：编译表 `BERKLEY_SCENT_BENCH` / `SCENT_MECHANISM` / `SCENT_HOLD_BARS` 锁住厂方数字（吐饵 0.25s、无味含 1s、表面加香 3s、PowerBait 含约 18s、Gulp 扩散宣称 400×、MaxScent 自称 +45%、油性喷剂不可闻）。`buildAdvice` 在路亚时写入 `lureScent` 与 `lureScentClass`，供方案引擎与单测，**不渲染到策略首页**。用户文案不把 400× / 45% 写成开口保证。Jones 缸测硬饵加香翻倍攻击不采纳为产品规则。运行时不联网。

运行时不联网。

## 4b. 出钓适宜度（FR-8）

纯函数 `buildFishingIndex(weather, at = Date)`。界面文案「出钓适宜度」，不是鱼口预测。起点 62 分，只按出门条件加减，最后夹紧到 0–100。**`pressureHpa` 与 `pressureDelta3h` 不参与计分**（模式海平面气压、网格点不在水里、小 ΔP 几乎不改溶氧、经验方向有争议）。气压仍出现在气象短卡。

| 信号 | 加减 |
|------|------|
| 盛夏正午高温 | -18 |
| 气温 18–26°C 且非正午高温 | +8 |
| 气温 < 8°C 或 ≥ 35°C | -18 / -14 |
| 风 ≥ 25 km/h | -12 |
| 轻降水 | +6 |
| 大雨/雷暴（降水 ≥ 5 mm 或天气代码 ≥ 95） | -30 |
| 晨昏窗口且非正午高温 | +8 |
| 紫外指数 ≥ 8 且小时 ∈ [10,16] | -6 |

档位：≥80 很高，≥65 较高，≥50 一般，≥35 偏低，否则不宜。理由 2–4 条，只用气温/风/降水/时段/紫外防晒解释，不写开口、贴底、溶氧。禁止用湿度凑条数冒充溶氧；不够两条时用体感温度补。同一气温/风/降水/时段下，改变气压或 ΔP，分数必须相同。水色倾向不计分。

## 4c. 窗口期倒计时（FR-8）

纯函数 `windowCountdown(at)`，与 `climateFlags.prime` 同一套钟点：

- 晨间窗口：当日 05:00 ≤ t < 08:00
- 黄昏窗口：当日 17:00 ≤ t < 20:00

窗口内 `phase=in`，倒计时到该窗结束；窗外 `phase=wait`，倒计时到下一窗开始（20:00 之后算次日晨间窗口）。文案：`晨间窗口剩余` / `黄昏窗口剩余` / `距晨间窗口` / `距黄昏窗口`。剩余时间格式 `HH:MM:SS`。首页天气条每秒刷新；不调模型、不联网。`fishGuide(name)` 返回习性介绍、水层/钓法/时节/常用饵与技巧条目，词表外回落通用说明。

## 4d. 渔圈（FR-9）

`HubScreen` 挂在底栏 `hub`（文案「渔圈」）。首页：发现四入口 + 分段「渔获 / 群聊 / 赛事」（默认渔获，不同时堆三块）。无实拍封面为浅纹底+底部小字鱼名。`src/data/hub.json` 静态示例：商品、赛事、技巧、评测、群；种子消息仅无云端时演示。`src/lib/hub.ts`：`toggleWish`、`messagesForRoom`、`persistGearReview` 可单测。想买 / 装备评测仍写 localStorage。商城无结算。

**公网群聊（已配 `getSupabase()`）**：表 `public.chat_messages`（`id, room_id, user_id, author, body, created_at`）。`room_id` 仅 `room-lure` / `room-ji` / `room-gear` / `room-match`。RLS：`SELECT` 匿名可读；`INSERT` 仅登录且 `user_id = auth.uid()`，`body` 1–200 字、`author` 1–12 字；无 UPDATE/DELETE。进入房间拉最近 200 条，Realtime 订该 `room_id` 的 INSERT。发送用资料昵称；未登录禁用输入并提示去「我的」。失败则提示并保留草稿。不写 `diaolema.hub.chat.v1`。未配 Supabase 时 `appendChatMessage` 仍走 localStorage。气泡左右分栏（自己靠右、不显示昵称），头像可点开名片：`toggleFollow`、把 `@昵称` 写入输入框、打开作者主页、**拉黑/举报**。按日插入「今天/昨天/日期」分隔。普通气泡点按复制正文。渔获转发正文为 `转发 · 作者 在钓点 钓到鱼种 #yj:报告id`（≤200 字）；`shareRepost.parseRepostBody` / `resolveRepost` 解析，先按 id 再按作者+钓点+鱼种匹配本机 `CatchReport`。`ChatLog` 把这类消息画成封面卡片，点开 `CatchShareDetail`；匹配失败则卡片标明「原分享已不在」。输入栏可发表情包（本机贴纸表，正文为短 glyph）、短语音（`MediaRecorder`，≤15s；正文为 `[语音 N″]`；登录后 `prepareChatVoice` 上传，公网 `media_url` 为 HTTPS）、图片（相册，压到最长边 720 的 JPEG；正文 `[图片]`）与**短视频**（≤15s、≤8MB；正文 `[视频]`）。未登录时语音/图片 data URL 留在本机；登录后图/语音/短视频都 `uploadUserMedia` 进公开桶。`fetchRoomMessages` 须选出 `kind, duration_ms, media_url`。公网行 `kind` 可为 `voice` / `sticker` / `share` / `image` / `video`，未跑 `supabase/social.sql` 时退回纯文本标记。`chatInbox`：按主题群 + `dm:` 私信线程建会话列表，预览用 `previewLine`（引用为「回复 · 正文」），未读为 `createdAt` 晚于 `lastRead` 且非自己的条数；进入会话 `markThreadRead`。再次进入且仍有未读时，`firstUnreadId` 在该条前插入「以下为新消息」并滚过去。`searchInbox` / `searchMessages` 按标题、作者、预览过滤。**引用回复**：`chatQuote.makeQuote` 生成 `{id, author, preview}`；点气泡旁「回复」写入输入栏引用条；发出去后气泡上方显示被引摘要，点摘要滚到原句。公网列 `reply_to_id` / `reply_author` / `reply_preview`；未跑 SQL 时正文前缀 `#yjq:id|作者|摘要`。底栏渔圈红点 = 未读合计。一对一私信仍走粉丝互关，也可从会话列表进入；私聊同样走表情、语音、图片、短视频、引用、搜索与转发卡片。`userSafety.hideByAuthor` 从群消息去掉已拉黑作者；`hideInboxFromBlocked` 去掉对方私信会话。配好云端后 `subscribeDmMessages` 订 `dm_messages` INSERT（与群聊 Realtime 同套路）；拉历史时同时读 `dm:{我}:{对方}` 与 `dm:{对方}:{我}`（须 RLS 允许双向 SELECT）。详情见 `docs/superpowers/specs/2026-08-18-public-chat-design.md`。

## 4e. 我的（FR-10）

`MeScreen` 挂在底栏 `me`。资料 `loadProfile` / `saveProfile` 存 localStorage，含 `avatarUrl`（data URL 或 HTTPS，可空则用 Logo）。`normalizeProfile` 只保留 `data:image/` 与 `http(s)` 头像。登录后点头像打开编辑：改名字、换头像（相册，方形压缩 JPEG）；登录则 `prepareAvatar` 上传 `yj-media` `{uid}/avatar/avatar.jpg`，`pushProfile` 的 `avatar_url` 只写 HTTPS。未登录点头像去登录页。**登录成功后回到「我的」首页**（渔获/关注/粉丝/想买四列与分组菜单仍可点）；已登录时从群聊「去登录」进来也回首页，不停留在只有退出按钮的空白页。`MeScreen` 不以 `meStart` 为 React `key`，避免整页被卸掉。四列：渔获、`shareSocial.follows`、`mergeFanList`（`DEMO_FANS` 示例 + 额外粉丝名）、`loadWishIds`。点粉丝/关注打开名单或作者主页。粉丝名单常显「私聊」；是否可点由 `canOpenFanChat({ sample, mutual, myAllow, peerAllow, blocked })` 决定：示例粉丝默认可聊；非示例须互关且双方允许；已拉黑不可聊。**不得为非示例粉丝自动打开允许。** 本机私信写入 `diaolema.hub.chat.v1`（`roomId` 为 `dm:粉丝id`），与渔圈会话列表共用。分组菜单进渔获 / 想买 / 入库 / 天气 / 日报 / **已拉黑** / 关于 / **登录**，不再重复「我的粉丝」。已拉黑名单来自 `userSafety`，可解除。`userSafety` 按作者名拉黑与举报，localStorage 本机有效；登录后 `cloudWrite` 写 `user_blocks` / `user_reports`（表不存在则忽略），**再登录 `hydrateLocalFromCloud` 拉回并与本机合并**。不能拉黑自己。可选账号：`@supabase/supabase-js` + publishable key。Project URL 与 publishable key 来自 `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`（构建期）或运行时 `GET /api/public-config`（Zeabur 变量只在进程里、没打进前端时也能登录）。登录页只填邮箱密码，不出现项目地址。浏览器只走 publishable key；`SUPABASE_SECRET_KEY` 禁止 `VITE_` 前缀、禁止打进前端。登录页两个入口 **登录** / **注册**；`signInWithPassword` / `signUp` / `signOut`。注册须两次密码一致。会话 persist localStorage。已登录显示昵称与邮箱、**退出**。渔圈公网群聊发言必须登录，作者用当前资料昵称。未配 Key 时说明缺项，群聊回落本机演示，不崩溃。不强制登录即可看群。私聊：示例粉丝默认可进会话；非示例须互关且双方允许（FanList 用 `canOpenFanChat`，不可聊则禁用）。消息表 `dm_messages`，登录后 Realtime。未配云端时本机也可演示私聊。后台在 Supabase Authentication → Users 管理账号。视觉与渔圈同套金青绿层次，不是单色平铺。手机网页用 `100svh` 包住壳，避免浏览器底栏把「我的」菜单切掉。底部 `padding-bottom` 为 `calc(128px + 安全区)`，让「分享入库」等条目和入库表单滚出金色按钮、浏览器工具栏与系统键盘。菜单左侧色块用字标，不做成空图，避免像加载失败。

## 5. 天气客户端（FR-1）

`GET https://api.open-meteo.com/v1/forecast`

Query：`latitude, longitude, timezone=Asia/Shanghai, current=…, hourly=temperature_2m,weather_code,precipitation,wind_speed_10m,wind_direction_10m,pressure_msl,relative_humidity_2m,visibility,uv_index,dew_point_2m,wind_gusts_10m, daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_direction_10m_dominant,pressure_msl_mean,relative_humidity_2m_mean,uv_index_max, past_hours=24, forecast_days=7`

`pressureDelta3h`：用 hourly `pressure_msl` 中最接近 3 小时前的点计算 `current - past`。`pressure_msl` 是模式海平面气压，坐标是网格点（默认人民广场或用户选点），**不是水体测点**。`precip6hMm` / `precip24hMm` 由 hourly `precipitation` 对当前时刻向前累计。`visibilityM` / `uvIndex` / `dewPointC` / `windGustKmh` 取最接近当前时刻的 hourly 点（缺测为 `null`）。`waterTint` 由 `inferWaterTint` 推演。`fetchWeatherBundle` 一次拉回当前快照、逐时、逐日；新字段请求失败时回落到旧查询，水色仍可用当前降水推。`pickUpcomingHours` 取当前时刻起约 24 条；`snapshotFromDaily` 用日均气温、日降水、日最大风、日均气压构建快照再 `buildFishingIndex`（`pressureDelta3h=0`，且气压本就不计分）。不编造水温溶氧；不用海洋 API 的海表温度冒充湖塘水温。`weatherPointNote(lat, lon)` 给出「模式海平面 · 网格点不是水体」。`planWindow`：避开正午 / 早晚优先 / 经验急降窗口 / 按气温与时段。

定位：`src/lib/geo.ts` 的 `requestCurrentPosition` / `geoErrorMessage`。开屏结束后、进入钓点、进入「+」调用 `navigator.geolocation`（`enableHighAccuracy`）。非安全上下文、拒绝、超时映射中文原因，坐标回落 `SHANGHAI_CENTER`。开发服务器 `host: true`，桌面启动绑定 `0.0.0.0`，手机可用局域网 IP 打开；定位与实时取景需 HTTPS 或 localhost。`distanceKm` 用球面距离（可单测）；`formatDistanceKm` 写成「N米」或「N公里」。

## 6. 地图（FR-3）

- 环境变量：`VITE_AMAP_KEY` / `AMAP_KEY`，可选安全码。构建期可打进前端；**每次加载地图都** `GET /api/map-config`（4s 超时）再合并运行期变量（云端常只配 `AMAP_KEY`）。`CatchMap` 等到钓点 Tab 第一次显示后再加载 SDK，避免在 `visibility:hidden` 容器里高德一直转圈；显示后 `resize`。无 Key、SDK 8s 超时或失败时 Leaflet 用高德栅格底图（国内可显示），不用 OSM。
- 高德加载成功：`AMapLoader.load` 先只带 `AMap.Scale` / `AMap.ToolBar` 以便尽快出图；`AMap.Geolocation` / `AMap.Driving` / `AMap.Walking` 出图后再 `plugin`，失败不影响底图。
- 打开高德 App：`buildAmapNavUrl` + 详情/排行上的 `<a href>`（`uri.amap.com`，`callnative=1`）。不在 `useEffect` 里 `window.open`，避免手机拦截。失败或无 Key：Leaflet 底图仍可用同一链接。
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
- 上海路亚/钓鱼营地：`src/data/dianping-venues.json` 静态目录。`CatchMap` 高德 `mapStyle` 为 `amap://styles/normal`，`setFeatures(['bg','road','building'])`。底栏进入钓点时仍定位（只给列表距离）。钓点 Tab 默认全屏 `VenueList`；`.map-stage` 仅在点「导航」/「看路线」/「去钓点」或识鱼选点时显示，画驾车路线，顶栏可返回列表。`CatchMap` 第一次打开导航后再加载 SDK，切走钓点不卸载。`zoom < SPOT_PLATE_MIN_ZOOM` 用 `venueDotHtml` 小头像钉，靠近后用 `venuePinHtml` 铭牌。`searchVenues` 按店名/区县/路名/类型过滤；`filterVenues` 叠加类型芯片（`venueMarkerTone`：含海钓→海钓，含路亚→路亚，其余垂钓园/鱼塘/钓鱼营地→池塘）、营业中、`rankVenues` 或按 `distanceKm` 离我近。`nearbyPonds(from, venues, limit)` 取当前位置最近的池塘。`nearbyVenues` 按当前店坐标取最近 3 场。`catchesForVenue` 用店名、去括号简称、路名匹配渔获 `spotName`。`VenueList` 默认 `kind=pond`、`sort=near`，卡片为点评式（封面、店名、五星、收费、距离、标签），顶部横滑附近鱼塘。点条目 `onOpen` 打开本机 `VenueDetail`，列表与详情不以 `venue.url` 作为进入入口。从附近列表进详情后关闭回到钓点页。头像优先客户反馈图，否则 `/logo.svg`。客户反馈在 `src/data/spot-reviews.json` + localStorage；演示图在 `public/spot-photos/`（须真实存在、标明示例）；今日渔获示例封面在 `public/shares/`。`averageScore` 可单测。点钉打开 `VenueDetail`。不把点评星级直接当渔见分。不登录点评/钓鱼人 APP。渔获气泡不叠在钓点地图上。
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
src/components/AuthPanel.tsx
src/lib/supabase.ts
src/lib/supabaseConfig.ts
src/lib/venues.ts
src/lib/venueIcons.ts
src/lib/userSafety.ts
src/lib/catchMedia.ts
src/lib/userMedia.ts
src/lib/chatQuote.ts
src/lib/geo.ts
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
- 用户上报渔获仍以飞书/本机为主；公网群聊正文进 Supabase `chat_messages`（RLS：匿名可读、登录写自己的行）。短视频文件进 Storage 公开桶，行里只存 URL。secret 不进前端。
- 飞书 Base token / 表 ID 只在本机 `.env`；渔获正文进用户自己的多维表。
- 不抓取需要登录的小红书 / 抖音 / 微博 / 微信公众号正文。
- 识鱼 API Key 只在本机 `.env`；渔获照片不默认落盘、不写入飞书。

## 9. 测试

- `buildAdvice`：高温正午、气压急降、高气压、低气压、降水修正；文案含「经验」、不含氧薄/开口。`clampLayerToHabit`：翘嘴正午不落到守底。`auditHandbook`：词表每种鱼 × 钓法 × 气象键与手册相符。
- `inferWaterTint`：少雨偏清、有雨微浑、大雨浑浊；文案含「不是测站」。
- `SIGHTED_WATER`：清澈/微浑/浑浊/肥水；未选回落降水推演；肥水改果酸，浑浊改红头金。水层柱上/中/底，鱼标按 `layerMarkerPct` 滑动。
- `planFlavor` / `planSpot`：低温大腥、鲫草边、雨天进水口、路亚黑鱼草洞。
- `buildFishingIndex`：气压不计分、盛夏正午压分、雷暴不宜、紫外防晒扣分、结果夹紧 0–100。
- `windowCountdown`：晨间/黄昏窗口倒计时文案。
- `fishGuide`：目标鱼外形/食性/体型/上海水域/技巧；词表外回落通用说明。
- `lookupFishPublic`：维基摘要，失败则公开搜索摘录。
- `formatCatchCaption`：分钟 / 小时 / 昨天。
- `buildAmapNavUrl`：高德导航 URI。
- `detectPlatform` / `extractInfo` / `mergeRuleAndAi`：入库识别与 AI 补空。
- `hitMatchesQuerySite` / `parseBaiduHtml` / `parseSogouWeixinHtml` / `parseBaiduApiResponse`：公开发现按查询站点过滤。
- `fetchPageTextWithDefuddle`：登录墙不抽正文。
- `formatVenueFee` / `parseDianpingShopSnippet`：点评公开人均与状态。
- `searchVenues` / `filterVenues` / `nearbyPonds` / `nearbyVenues` / `catchesForVenue` / `rankVenues` / `reviewCountLabel`：钓点页为点评附近卡片（默认池塘 + 离我近）；搜索 + 类型/营业中芯片；离我近按球面距离；`nearbyPonds` 只含池塘且由近到远。点条目打开本机 `VenueDetail`，不跳转钓鱼之家网页。点「导航」才打开全屏 `CatchMap` 并画驾车路线。`venuePinHtml` / `venueDotHtml` / `showSpotPlate`：导航地图拉远小钉、靠近铭牌。无照片用渔见 Logo。不展示数字分。渔获气泡不叠在钓点地图上。`venueMarkerTone`：海钓 / 路亚优先，其余为池塘。
- `distanceKm` / `formatDistanceKm`：钓场距离。
- `userSafety`：拉黑按作者名；举报须选原因；`hideByAuthor` / `hideInboxFromBlocked`；不能拉黑自己。
- `canOpenFanChat`：已拉黑不可私聊；FanList 用此开关，不为非示例粉丝自动打开允许。
- `unionNames` / `mergeAllowMap` / `hydrateLocalFromCloud`：登录拉回点赞、关注、想买、评测、拉黑、私聊开关、评论，与本机并集，不覆盖离线写入。
- `mapCommentCloudRow` / `persistUserComments`：`share_comments` 映射与本机合并；示例评论 `source: seed` 仍标明示例。
- `subscribeDmMessages` / `dmThreadIds`：私信 Realtime；历史同时读双方 thread_id。
- `catchImages` / `catchMediaBadge` / `catchVideoError` / `parsePackedImageUrls`：渔获最多 9 图；短视频须为视频、≤15 秒、≤8 MB；封面取第一张；云端 `image_urls` 只收 HTTPS。
- `mediaObjectPath` / `cloudMediaUrl` / `isVideoBody`：Storage 对象路径；拒绝把 data URL 写入云端行；群聊正文 `[视频]` / `[图片]` 登录后写公开 URL。
- `parseQuotedBody` / `makeQuote` / `searchInbox` / `firstUnreadId`：引用前缀与摘要；会话/群内搜索；未读分隔只在已有 lastRead 时出现。
- `toggleWish` / `messagesForRoom`：渔圈想买与房间过滤排序；公网发送走 Supabase，单测不打真实库。不接支付与私信。
- `loadProfile` / `saveProfile` / `DEMO_FANS`：我的页资料本机存储；粉丝为示例名单。HTTPS 头像保留。
- `pickUpcomingHours` / `weekdayLabel` / `snapshotFromDaily`：预报切片与日指数快照。
- `toggleVenueFav` / `unionVenueFavIds`：收藏钓场并集。
- `isOwnedCatch` / `removeReport`：只改删本机用户渔获。
- `isAudioMime` / `prepareChatVoice`：语音对象路径与拒绝 data URL 上云。
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
              FishIdPanel（底栏「+」识鱼页；可选 initialFile）
              ReportForm 同样用 PhotoCapture，封面走 packedToDataUrl
```

| 项 | 选择 |
|----|------|
| 传输 | 本机 `POST /api/fish-id`，JSON：`{ imageBase64, mime }` |
| 上游 | 豆包识图 `https://ark.cn-beijing.volces.com/api/v3`；`thinking.type=disabled`；图最长边 1280、高质量 JPEG；提示含易混种外形核对 |
| 解析 | `parseFishReply`：JSON 或从中文回复里抽词表鱼名 |
| 归一化 | `src/lib/fishId/catalog.ts` 的 `normalizeFishName` |
| UI | `PhotoCapture` + `FishIdPanel`。已配置时无豆包文案；识别弹窗为搞笑钓者把渔见 Logo 从水里钓起：表情轻微用力（不伸舌、不大喊脸），旁白「嘿呀」；扫描时 Logo 在水下轻晃，成功则随线升起并打钩。右上角 X 取消。不使用雷达、扫光线、英文闪字。 |
| 未配置 Key | 503 `not_configured`，UI 改手动词表点选；提示不出现「打开豆包」 |

拍照：点「拍照」先尝试 `getUserMedia` 后置取景；失败或不在安全上下文则触发 `<input type=file accept=image/* capture=environment>`。相册输入不加 `capture`，报渔获相册可 `multiple` 最多 9 张。压缩图可作本机 `CatchReport.imageUrl` / `imageUrls`；短视频 `videoUrl`（≤15s、≤8MB）。登录后 `uploadUserMedia` 把文件放到公开桶 `yj-media`（路径 `{uid}/catch|chat|avatar/{id}.ext`，允许 jpeg/png/webp/gif、短视频与 `audio/webm|ogg|mpeg|mp4`），渔获表写 `image_urls`（JSON 数组）与 `video_url`，群聊/私聊写 `media_url`，资料写 `avatar_url`。`removeReport` 删本机用户行；`deleteCatch` 按 `client_id` 删自己的云端行（须 `catch_delete` RLS）。收藏表 `venue_favs`。`stripInlineImage` 去掉 data URL 后才 `persistReportToServer`。不把原图/视频二进制写入飞书或 Postgres 行。前端只用 publishable key。

## 12. 首页壳（FR-8）

```
[天气] → buildAdvice + buildFishingIndex
              ↓
        HomeScreen（策略：出钓适宜度环 / 气象短卡 / 今日怎么钓）
              ↓ 底栏
        钓点：VenueList 点评附近卡片（默认附近鱼塘）；CatchMap 仅导航/选点时全屏
        识鱼（底栏金色「AI 识鱼」）：FishIdPanel + ReportForm（均可拍照；进入时定位）
        渔圈：HubScreen（发现入口 + 渔获/群聊/赛事分段）
        我的：MeScreen 个人中心（资料 / 菜单 / 渔获记录）
        抽屉：AdvicePanel / DailyReport / ShareImport / 词表换鱼 / VenueDetail
```

桌面端 `.phone` 居中一列（约 430–480px）、高度铺满视口；**手机网页全宽、去掉大圆角**，避免切字。`html/body` `overflow-x: clip`。钓点 `.spots-feed` 底部留白避开底栏。产品名「渔见」。首页品牌行用 `public/logo.svg` + `.brand-name`（Noto/苹方栈）。启动时 `Splash` 盖住手机壳：Logo、渔见、宣言两句、绿钮「进入」；点按或 4.2s 后淡出，随后请求定位。宣言原文见 `src/lib/brand.ts`，「关于渔见」页同样展示。切到钓点时默认列表；`CatchMap` 首次导航后不卸载。AI 识鱼在底栏中间绿钮（文案「AI 识鱼」，无 + 号、无下方小字），不占首页。地图选点时强制切到钓点 Tab。风力用 `windScaleLabel` 转成几级；出钓文案用 `outingLabel` 映射指数档位。气象短卡点开天气抽屉。方案区锁仪器盘：`.board` 水层柱 + `.logic` 为什么 + `.moves` 味形与标点。水色只在钓法下点选，立刻重算 `buildAdvice`。不展示诱鱼剂。点「换鱼」换目标鱼；标题下「鱼类介绍」打开详情。无「同步方案」。作钓窗口倒计时在方案卡下。`CatchShareFeed` 放在渔圈首页渔获分段。拍照取景左上角「‹ 返回」。区头「今日渔获」加条数。双列网格封面限高约 108px，无实拍不用巨大居中鱼名。图下露出钓点名与点赞，卡片上不放关注。`shareSocial`：点赞/关注/额外粉丝名存 localStorage，种子赞数由 id 哈希，点赞 +1 / 取消还原；关注按作者名切换。`shareComments` 评论本机存储，示例帖带种子评论并标明示例。`CatchShareDetail` 同步同一状态，顶图叠作者/时间，多图可滑、有视频则播放，可评论、转发到主题群或复制文案（群内以 `#yj:id` 卡片展示，点开同一详情），「去钓点」全宽青绿。点作者打开 `AuthorProfile`。不展示未测的溶氧与水温。首页不堆常用工具与目标鱼说明卡。不写飞书粉丝关系、无私信。上一版金青绿界面存档 `_archive/ui-gold-green/`。

## 13. Zeabur 部署

控制台**没有**上传 ZIP 入口。用 GitHub 仓库，或本机 CLI 把当前目录推上去。不要设 `output_dir`，否则只会静态托管、识鱼 API 失效。

| 项 | 约定 |
|----|------|
| 控制台 | 项目里 **Add Service → GitHub**，选本仓库 |
| 本机 CLI | `npx zeabur@latest auth login` 后 `npx zeabur@latest deploy`，或双击 `部署到Zeabur.bat` |
| 构建 | `zbpack.json`：`npx vite build` → `dist/` |
| 启动 | `node server/preview.mjs`，监听 `process.env.PORT`、`0.0.0.0` |
| 构建期变量 | `VITE_AMAP_KEY`、`VITE_AMAP_SECURITY_CODE`、`VITE_SUPABASE_URL`、`VITE_SUPABASE_PUBLISHABLE_KEY`（打进前端） |
| 运行期变量 | `FISH_ID_API_KEY` 等，与 `.env.example` 相同；不要提交 `.env` |
| 禁止进前端 | `SUPABASE_SECRET_KEY`（secret 等同旧 service_role，只放服务器） |

