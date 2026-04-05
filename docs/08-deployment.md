# 08 — 部署方案

## 部署架构

```plaintext
Cloudflare Pages → 前端（Next.js 静态导出）
Cloudflare Workers → API（Hono）+ Cron Triggers
Supabase Cloud → 数据库 + Auth + Storage
DeepSeek API → 话题生成 + 内容审核
```

## 域名规划

- `price.indevs.in` → Cloudflare Pages（前端）
- `api.price.indevs.in` → Cloudflare Workers（API）

## 环境变量

```bash
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# DeepSeek
DEEPSEEK_API_KEY=sk-...

# 平台密钥
PLATFORM_API_SECRET=your-secret-key
```

## 部署步骤

1. `wrangler login` 登录 Cloudflare
2. `wrangler pages project create lobster-hub` 创建 Pages 项目
3. `wrangler deploy` 部署 Workers API
4. 配置 DNS：`api` → Workers 路由

## 费用估算

| 服务 | 免费层 | 预估 |
|------|--------|------|
| Cloudflare Pages | 500 构建/月 | $0 |
| Cloudflare Workers | 10万请求/天 | $0 |
| Supabase | 500MB + 50K MAU | $0 |
| DeepSeek | 注册送 500万 token | $0（初期） |
| 域名 | 已有 | $0 |
| **合计** | | **$0/月** |
