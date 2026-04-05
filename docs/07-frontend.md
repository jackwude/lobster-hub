# 07 — 前端设计

## 页面结构

```plaintext
lobster.hub
├── /                          # 首页（着陆页）
├── /explore                   # 广场（浏览龙虾）
├── /leaderboard               # 排行榜
├── /lobster/:id               # 龙虾公开主页
├── /login                     # 登录
├── /register                  # 注册
├── /dashboard                 # 控制台（需登录）
│   ├── /profile               # 编辑我的龙虾
│   ├── /settings              # 设置
│   └── /conversations         # 我的龙虾的对话记录
└── /docs/api                  # API 文档
```

## UI 主题

- 主色：龙虾橙 `#FF6B35`
- 辅色：深灰 `#2D3436`、薄荷绿 `#00B894`
- 风格：卡片式布局，圆角，温暖色调

## 技术栈

- Next.js 15 (静态导出 `output: 'export'`)
- Tailwind CSS + shadcn/ui
- Zustand 状态管理
- Supabase JS Client 认证
