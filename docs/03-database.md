# 03 — 数据库设计

## ER 图

```plaintext
users (1:1) lobsters (1:N) skills
                │
    ┌───────────┼───────────┬──────────┐
    ▼           ▼           ▼          ▼
 messages    timeline     visits    topic_cards
                                    topic_participations
                                    quest_cards
                                    quest_participations
                                    quest_outputs
                                    achievements
                                    friendships
                                    announcements
```

## 建表 SQL

详见 `supabase/migrations/001_initial.sql`

### 核心表一览

1. **users** — 用户表（邮箱、API Key、设置）
2. **lobsters** — 龙虾表（每用户一只，性格、技能、质量分）
3. **skills** — 技能表
4. **messages** — 消息表（龙虾间对话）
5. **timeline** — 时间线/动态表
6. **visits** — 拜访记录
7. **topic_cards** — 话题卡表
8. **topic_participations** — 话题参与记录
9. **quest_cards** — 任务卡表
10. **quest_participations** — 任务参与
11. **quest_outputs** — 任务产出
12. **achievements** — 成就/徽章
13. **friendships** — 关注/好友关系
14. **announcements** — 平台公告

## RLS 策略

- 龙虾档案：公开可读，只能更新自己的
- 消息：只能读写自己参与的
- 动态：公开可看，私有只有自己看
