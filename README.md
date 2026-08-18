# 钓了嘛

上海钓鱼助手：实时天气（气压、湿度）、水层/鱼饵/钓法建议、渔获情报钉在高德地图上。

开发按 **Spec + SDD**：先看 `docs/spec/PRD.md` 与 `docs/spec/SDD.md`。

## 运行

```powershell
cd "F:\自开发设计软件\钓了嘛"
copy .env.example .env
npm install
npm test
npm run dev
```

浏览器打开终端里给出的本地地址。

## 高德地图

1. 在 [高德开放平台](https://console.amap.com/) 创建 Web 端（JS API）Key。
2. 写入 `.env`：

```
VITE_AMAP_KEY=你的key
VITE_AMAP_SECURITY_CODE=安全密钥可选
```

3. 重启 `npm run dev`。未配置时用地图降级底图，渔获标记仍可用。

## 部署到 Zeabur

控制台没有「上传 ZIP」。用下面两种方式之一。

### 方式 A：GitHub（控制台）

1. 把本仓库推到 GitHub（公开或私有均可）。
2. 打开 [Zeabur](https://zeabur.com) → 新建项目 → **Add Service** → **GitHub**。
3. 第一次点 **Configure GitHub**，授权后搜索仓库并 Deploy。
4. 在服务的 Variables 里配置下表变量后重新部署。

### 方式 B：本机 CLI（不用 GitHub）

在项目目录双击 `部署到Zeabur.bat`，或：

```powershell
cd "F:\自开发设计软件\钓了嘛"
npx zeabur@latest auth login
npx zeabur@latest deploy
```

第一次会打开浏览器登录。随后选择或新建项目，CLI 会把当前源码传上去构建。

| 变量 | 何时生效 | 说明 |
|------|----------|------|
| `VITE_AMAP_KEY` 或 `AMAP_KEY` | 构建或运行 | 高德 JS Key。也要在高德控制台把 `*.zeabur.app` 加到域名白名单 |
| `VITE_AMAP_SECURITY_CODE` 或 `AMAP_SECURITY_CODE` | 构建或运行 | 可选安全密钥 |
| `FISH_ID_API_KEY` | 运行 | 豆包识鱼；不配仍可手选鱼种 |

不要设置静态托管 `ZBPACK_OUTPUT_DIR=dist`，否则 `/api/fish-id` 不可用。绑定域名后用手机打开 HTTPS 地址，即可定位与拍照。

## 渔获数据

小红书等平台没有对第三方开放的渔获检索接口，本应用**不会**登录或爬取这些网站。地图上的钉是示例整理 + 你在本机上报的渔获。
