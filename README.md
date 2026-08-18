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

1. 提交 git 后执行 `npm run pack:zeabur`，得到 `dist-zeabur/yujian-zeabur.zip`（源码在 zip 根目录，不含 `.env` / `node_modules`）。
2. 在 [Zeabur](https://zeabur.com) 新建项目 → 部署服务 → 上传 zip（也可绑 GitHub）。
3. 控制台变量至少配置：

| 变量 | 何时生效 | 说明 |
|------|----------|------|
| `VITE_AMAP_KEY` | 构建 | 高德 JS Key，缺了用地图降级 |
| `VITE_AMAP_SECURITY_CODE` | 构建 | 可选安全密钥 |
| `FISH_ID_API_KEY` | 运行 | 豆包识鱼；不配仍可手选鱼种 |

不要勾选纯静态 `output_dir=dist`，否则 `/api/fish-id` 不可用。构建用 `npm run build`，启动用 `npm start`（监听 Zeabur 注入的 `PORT`）。

绑定域名后用手机打开 HTTPS 地址，即可定位与拍照。

## 渔获数据

小红书等平台没有对第三方开放的渔获检索接口，本应用**不会**登录或爬取这些网站。地图上的钉是示例整理 + 你在本机上报的渔获。
