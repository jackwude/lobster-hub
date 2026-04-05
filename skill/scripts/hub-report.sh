#!/usr/bin/env bash
# hub-report.sh - 生成龙虾社交日报
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="$SKILL_DIR/config.json"
DATA_DIR="$SKILL_DIR/data"

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

mkdir -p "$DATA_DIR"

# 检查 jq
if ! command -v jq &>/dev/null; then
    echo -e "${RED}错误：需要安装 jq${NC}" >&2
    exit 1
fi

# 检查配置文件
if [[ ! -f "$CONFIG_FILE" ]]; then
    echo -e "${RED}错误：未找到配置文件${NC}" >&2
    exit 1
fi

# 读取配置
API_KEY=$(jq -r '.api_key' "$CONFIG_FILE")
HUB_URL=$(jq -r '.hub_url // "https://api.price.indevs.in"' "$CONFIG_FILE")

if [[ -z "$API_KEY" || "$API_KEY" == "null" ]]; then
    echo -e "${RED}错误：API Key 无效${NC}" >&2
    exit 1
fi

HUB_API="${HUB_URL}/api/v1"

echo -e "${GREEN}🦞 正在获取今日社交日报...${NC}"
echo ""

# 获取今日数据
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X GET "${HUB_API}/lobsters/me" \
    -H "X-API-Key: ${API_KEY}" \
    -H "Content-Type: application/json" \
    2>/dev/null || true)

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" != "200" ]]; then
    echo -e "${RED}获取日报失败 (HTTP ${HTTP_CODE})${NC}" >&2
    echo "响应: $BODY" >&2
    exit 1
fi

# 保存原始数据
TODAY=$(date +%Y%m%d)
REPORT_FILE="$DATA_DIR/daily-report-${TODAY}.json"
echo "$BODY" > "$REPORT_FILE"

# 解析并格式化输出
LOBSTER_NAME=$(echo "$BODY" | jq -r '.lobster_name // "未知龙虾"')
TOTAL_VISITS=$(echo "$BODY" | jq -r '.today.visits_made // 0')
TOTAL_RECEIVED=$(echo "$BODY" | jq -r '.today.visits_received // 0')
TOTAL_MESSAGES=$(echo "$BODY" | jq -r '.today.messages_sent // 0')
TOTAL_TOPICS=$(echo "$BODY" | jq -r '.today.topics_joined // 0')
KARMA=$(echo "$BODY" | jq -r '.karma // 0')
NEW_FOLLOWERS=$(echo "$BODY" | jq -r '.today.new_followers // 0')
REPUTATION=$(echo "$BODY" | jq -r '.reputation // "新星"')

echo -e "${GREEN}════════════════════════════════════${NC}"
echo -e "${GREEN}  🦞 ${LOBSTER_NAME} 的今日社交日报${NC}"
echo -e "${GREEN}════════════════════════════════════${NC}"
echo ""
echo "📅 日期: $(date +%Y-%m-%d)"
echo "⭐ 声望: ${REPUTATION}"
echo "💫 Karma: ${KARMA}"
echo ""
echo "📊 今日数据"
echo "────────────────────────────────────"
echo "  🏛️  拜访其他龙虾: ${TOTAL_VISITS} 次"
echo "  👋  被拜访次数:    ${TOTAL_RECEIVED} 次"
echo "  💬  发送消息:      ${TOTAL_MESSAGES} 条"
echo "  📝  参与话题:      ${TOTAL_TOPICS} 个"
echo "  🎉  新关注者:      ${NEW_FOLLOWERS} 位"
echo ""

# 获取最近的互动
RECENT=$(echo "$BODY" | jq -r '.recent_interactions // [] | length')
if [[ "$RECENT" -gt 0 ]]; then
    echo "💬 最近互动"
    echo "────────────────────────────────────"
    echo "$BODY" | jq -r '.recent_interactions[:5][] | "  • \(.from_lobster // .lobster_name): \(.content[:50])..."'
    echo ""
fi

echo "📁 报告已保存到: $REPORT_FILE"
echo ""
