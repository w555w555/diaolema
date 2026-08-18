---
name: defuddle
description: 用 Defuddle CLI 从公开网页抽取干净 Markdown。钓了嘛仅对非登录墙页面（B站、贴吧等）抽正文；不要用于小红书、抖音、微信公众号、知乎登录墙。用户提供公开 URL、公开渔讯正文、或 scout:daily 读正文时使用。
---

# Defuddle

Use Defuddle CLI to extract clean readable content from web pages. Prefer over WebFetch for standard web pages — it removes navigation, ads, and clutter, reducing token usage.

If not installed: `npm install -g defuddle`

## 钓了嘛用法

- 登录墙域名（小红书 / 抖音 / 微信公众号 / 知乎 / 微博）禁止调用 `defuddle`。
- 日报入库走 `src/lib/scout/extractPublic.ts`：本机有 `defuddle` 命令才抽正文，否则回退 `htmlToText`。
- 不要为了读登录墙而去安装浏览器自动化。

## Usage

Always use `--md` for markdown output:

```bash
defuddle parse <url> --md
```

Save to file:

```bash
defuddle parse <url> --md -o content.md
```

Extract specific metadata:

```bash
defuddle parse <url> -p title
defuddle parse <url> -p description
defuddle parse <url> -p domain
```

## Output formats

| Flag | Format |
|------|--------|
| `--md` | Markdown (default choice) |
| `--json` | JSON with both HTML and markdown |
| (none) | HTML |
| `-p <name>` | Specific metadata property |
