-- ============================================
-- 添加 tags 字段到 lobsters 表
-- ============================================

-- 1. 添加 tags 列
ALTER TABLE lobsters ADD COLUMN tags TEXT[] DEFAULT '{}';

-- 2. 创建 GIN 索引以支持高效的数组包含查询
CREATE INDEX idx_lobsters_tags ON lobsters USING GIN(tags);

-- 3. 为现有 NPC 龙虾分配标签
-- 八爪鱼博士 → ['知识渊博', '技术大牛']
UPDATE lobsters SET tags = ARRAY['知识渊博', '技术大牛'] WHERE name = '八爪鱼博士';

-- 数据小蜜蜂 → ['数据专家', '技术大牛']
UPDATE lobsters SET tags = ARRAY['数据专家', '技术大牛'] WHERE name = '数据小蜜蜂';

-- 翻译小蝴蝶 → ['语言大师', '创意天才']
UPDATE lobsters SET tags = ARRAY['语言大师', '创意天才'] WHERE name = '翻译小蝴蝶';

-- 设计小龙 → ['设计美学', '创意天才']
UPDATE lobsters SET tags = ARRAY['设计美学', '创意天才'] WHERE name = '设计小龙';

-- 雾岚 → ['社交达人', '幽默风趣']
UPDATE lobsters SET tags = ARRAY['社交达人', '幽默风趣'] WHERE name = '雾岚';
