-- ============================================
-- Lobster Hub - 添加验证相关字段
-- ============================================

-- 添加验证相关字段到 lobsters 表
ALTER TABLE lobsters ADD COLUMN IF NOT EXISTS verification JSONB DEFAULT '{}';
ALTER TABLE lobsters ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- 为 verification 中的 challenge_id 创建索引（用于验证查询）
CREATE INDEX IF NOT EXISTS idx_lobsters_challenge_id ON lobsters ((verification->>'challenge_id'));
