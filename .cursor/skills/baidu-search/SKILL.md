---
name: baidu-search
description: 百度千帆网页搜索。钓了嘛每日鱼情发现优先用此 API，按平台域名 sites 过滤。无 Python 时由 Node 调用同一接口。用户搜索资讯、百科、最新新闻、或运行 scout:daily / 鱼情日报时使用。
homepage: https://github.com/countbot-ai/CountBot
---

# 百度 AI 搜索

基于百度千帆平台的 AI 搜索服务，支持多种搜索模式。

## 配置

编辑 `skills/baidu-search/scripts/config.json`，填写 API Key：

```json
{
  "api_key": "bce-v3/YOUR_API_KEY_HERE"
}
```

API Key 从 [百度千帆平台](https://console.bce.baidu.com/qianfan/ais/console/onlineService) 获取。

## 命令行调用

```bash
# 网页搜索（默认）
python3 skills/baidu-search/scripts/search.py "搜索关键词"

# JSON 输出（推荐 AI 使用）
python3 skills/baidu-search/scripts/search.py "人工智能最新进展" --json

# 限制结果数
python3 skills/baidu-search/scripts/search.py "Python教程" --limit 5

# 站点过滤
python3 skills/baidu-search/scripts/search.py "天气预报" --sites weather.com.cn

# 时间过滤（week/month/semiyear/year）
python3 skills/baidu-search/scripts/search.py "AI新闻" --recency week

# 百度百科
python3 skills/baidu-search/scripts/search.py "人工智能" --api-type baike

# 秒懂百科（视频）
python3 skills/baidu-search/scripts/search.py "深度学习" --api-type miaodong_baike

# AI 智能生成
python3 skills/baidu-search/scripts/search.py "什么是人工智能" --api-type ai_chat
```

## API 类型

| 类型 | 说明 |
|------|------|
| `web_search` | 网页搜索（默认） |
| `baike` | 百度百科 |
| `miaodong_baike` | 秒懂百科（视频） |
| `ai_chat` | AI 智能搜索生成 |

## 注意事项

- 免费额度：100 次/天
- 网页搜索查询最长 72 字符
- 自动包含当前日期上下文，方便处理时效性查询

## 钓了嘛用法

- 本机无 Python 时不要跑 `scripts/search.py`；日报任务走 `src/lib/scout/publicSearch.ts` 的千帆 `web_search`。
- API Key 优先级：`BAIDU_SEARCH_API_KEY` / `FISH_SCOUT_BAIDU_KEY` → 本目录 `scripts/config.json`（从 `config.json.example` 复制，勿提交真实 Key）。
- 每条查询带 `sites` 为当前平台域名及别名（如 `xiaohongshu.com` / `xhslink.com`）。
- 不要用本 skill 登录或抓取小红书/抖音/微信正文。
