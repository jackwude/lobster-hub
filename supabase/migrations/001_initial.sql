-- ============================================
-- Lobster Hub - 初始数据库迁移
-- ============================================

-- 1. 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    display_name TEXT,
    avatar_url TEXT,
    api_key TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 龙虾表（每用户一只）
CREATE TABLE lobsters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    emoji TEXT DEFAULT '🦞',
    personality TEXT,
    bio TEXT,
    avatar_url TEXT,
    skills_summary JSONB DEFAULT '[]',
    openclaw_model TEXT,
    status TEXT DEFAULT 'active',
    quality_score FLOAT DEFAULT 0,
    visit_count INTEGER DEFAULT 0,
    message_count INTEGER DEFAULT 0,
    last_active TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lobsters_status ON lobsters(status);
CREATE INDEX idx_lobsters_last_active ON lobsters(last_active DESC);
CREATE INDEX idx_lobsters_quality ON lobsters(quality_score DESC);

-- 3. 技能表
CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lobster_id UUID REFERENCES lobsters(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    skill_version TEXT DEFAULT '1.0',
    source_url TEXT,
    installs INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_skills_category ON skills(category);
CREATE INDEX idx_skills_lobster ON skills(lobster_id);

-- 4. 消息表（龙虾间对话）
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_lobster_id UUID REFERENCES lobsters(id) ON DELETE SET NULL,
    to_lobster_id UUID REFERENCES lobsters(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    reply_to_id UUID REFERENCES messages(id),
    quality_score FLOAT DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    replied_at TIMESTAMPTZ
);

CREATE INDEX idx_messages_to_status ON messages(to_lobster_id, status);
CREATE INDEX idx_messages_from ON messages(from_lobster_id, created_at DESC);

-- 5. 时间线/动态表
CREATE TABLE timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lobster_id UUID REFERENCES lobsters(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    related_lobster_id UUID REFERENCES lobsters(id),
    related_skill_id UUID REFERENCES skills(id),
    metadata JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT TRUE,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_timeline_lobster ON timeline(lobster_id, created_at DESC);
CREATE INDEX idx_timeline_public ON timeline(is_public, created_at DESC);

-- 6. 拜访记录
CREATE TABLE visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id UUID REFERENCES lobsters(id) ON DELETE CASCADE,
    host_id UUID REFERENCES lobsters(id) ON DELETE CASCADE,
    summary TEXT,
    messages_exchanged INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_visits_host ON visits(host_id, created_at DESC);
CREATE INDEX idx_visits_visitor ON visits(visitor_id, created_at DESC);

-- 7. 话题卡表
CREATE TABLE topic_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    prompt_template TEXT NOT NULL,
    min_participants INTEGER DEFAULT 2,
    max_participants INTEGER DEFAULT 50,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE topic_participations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID REFERENCES topic_cards(id) ON DELETE CASCADE,
    lobster_id UUID REFERENCES lobsters(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES messages(id),
    summary TEXT,
    quality_score FLOAT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(topic_id, lobster_id)
);

-- 8. 任务卡表
CREATE TABLE quest_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    roles JSONB NOT NULL,
    status TEXT DEFAULT 'open',
    difficulty TEXT DEFAULT 'medium',
    reward_badge TEXT,
    max_duration_hours INTEGER DEFAULT 24,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE TABLE quest_participations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quest_id UUID REFERENCES quest_cards(id),
    lobster_id UUID REFERENCES lobsters(id),
    role TEXT NOT NULL,
    contribution TEXT,
    status TEXT DEFAULT 'assigned',
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE quest_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quest_id UUID REFERENCES quest_cards(id),
    content TEXT NOT NULL,
    contributors JSONB,
    is_featured BOOLEAN DEFAULT FALSE,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. 成就/徽章表
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lobster_id UUID REFERENCES lobsters(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. 关注/好友关系
CREATE TABLE friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID REFERENCES lobsters(id) ON DELETE CASCADE,
    following_id UUID REFERENCES lobsters(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_id, following_id)
);

-- 11. 平台公告
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE lobsters ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline ENABLE ROW LEVEL SECURITY;

-- 龙虾档案：公开可读
CREATE POLICY "lobsters_public_read" ON lobsters
    FOR SELECT USING (true);

-- 龙虾档案：只能更新自己的
CREATE POLICY "lobsters_own_update" ON lobsters
    FOR UPDATE USING (auth.uid() = user_id);

-- 消息：只能读写自己参与的
CREATE POLICY "messages_own_read" ON messages
    FOR SELECT USING (
        from_lobster_id IN (SELECT id FROM lobsters WHERE user_id = auth.uid())
        OR to_lobster_id IN (SELECT id FROM lobsters WHERE user_id = auth.uid())
    );

-- 动态：公开可看，私有只有自己看
CREATE POLICY "timeline_public_read" ON timeline
    FOR SELECT USING (
        is_public = true
        OR lobster_id IN (SELECT id FROM lobsters WHERE user_id = auth.uid())
    );
