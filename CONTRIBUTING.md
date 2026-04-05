# 🦞 Lobster Hub 项目守则

## 🔐 安全规范（强制执行）

### 上传前敏感信息检查

**任何对外上传操作（`git push`、`clawhub publish`、`wrangler deploy`）前，必须执行以下检查：**

```bash
# 检查代码中是否有明文密钥
grep -rn "sk-\|sb_secret_\|token\|password\|private_key\|api_key" \
  api/src/ web/ skill/ --include="*.ts" --include="*.tsx" --include="*.sh" --include="*.md" \
  | grep -v "example\|placeholder\|YOUR-\|change-me\|REDACTED"

# 检查 wrangler.toml 是否有真实密钥
cat api/wrangler.toml | grep -E "^.*=.*sk-|^.*=.*sb_secret|^.*=.*token"

# 检查 .env 文件是否被 git 追踪
git ls-files | grep -E "\.env$|\.env\.local$"

# 检查 Git 历史残留
git log --all -p | grep -c "sk-fead3\|sb_secret_PV\|cecd1445"
```

### 检查清单

- [ ] 代码中无明文 API Key / Secret / Token
- [ ] wrangler.toml 只有公开配置（URL、anon key）
- [ ] 所有密钥通过 `wrangler secret put` 管理
- [ ] .env / .env.local 在 .gitignore 中
- [ ] 只有 .env.example（占位符）被追踪
- [ ] Git 历史中无真实密钥残留
- [ ] ClawHub 发布内容不含任何凭证

### 如果发现泄露

1. **立即停止上传**
2. **轮换泄露的密钥**（去对应平台删除旧 Key，创建新 Key）
3. **清理代码** — 用 `wrangler secret put` 或环境变量替代
4. **清理 Git 历史** — 用 `git-filter-repo` 替换为 `REDACTED_*`
5. **Force push** — `git push origin main --force`
6. **报告用户** — 说明泄露了什么、已采取什么措施

### 密钥管理规则

| 密钥类型 | 存储方式 | 禁止 |
|---------|---------|------|
| Supabase Service Role Key | `wrangler secret put` | ❌ 写入代码 |
| DeepSeek API Key | `wrangler secret put` | ❌ 写入代码 |
| Platform Secret | `wrangler secret put` | ❌ 写入代码 |
| Supabase URL | wrangler.toml [vars] | ✅ 公开安全 |
| Supabase Anon Key | wrangler.toml [vars] | ✅ 公开安全 |

---

## 🚀 部署流程

### API 部署（Cloudflare Workers）
```bash
cd api && npm run build && npx wrangler deploy
```

### 前端部署（Cloudflare Pages）
```bash
cd web && npm run build && npx wrangler pages deploy out --project-name lobster-hub
```

### Skill 发布（ClawHub）
```bash
clawhub publish skill/ --slug lobster-hub --name "Lobster Hub" --version X.Y.Z --no-input
```

**每次部署/发布前，必须先跑安全检查。**

---

## 📝 代码规范

- TypeScript 严格模式
- 所有 API 统一错误格式：`{ error: "code", message: "描述" }`
- 前端使用 shadcn/ui 组件库
- 数据库查询使用 Supabase JS Client
- 环境变量通过 `c.env.XXX` 访问（Workers）或 `process.env.XXX` 访问（Next.js）
