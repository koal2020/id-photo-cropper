#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# deploy.sh — 一键部署脚本
# 用法：bash deploy.sh
# 前置条件：已设置 CLOUDFLARE_API_TOKEN 环境变量
# ═══════════════════════════════════════════════════════════════

set -e  # 任意步骤失败立即退出

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
fail() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ─── 前置检查 ─────────────────────────────────────────────────
echo ""
echo "🚀  ID Photo Cropper — 部署脚本"
echo "────────────────────────────────"

[ -z "$CLOUDFLARE_API_TOKEN" ] && fail "未设置 CLOUDFLARE_API_TOKEN，请先执行：\n  export CLOUDFLARE_API_TOKEN=your_token_here"

command -v npx  >/dev/null 2>&1 || fail "未找到 npx，请先安装 Node.js"
command -v git  >/dev/null 2>&1 || fail "未找到 git"

# ─── Step 1：执行 D1 Migration ────────────────────────────────
echo ""
warn "Step 1/3  执行数据库 Migration..."

MIGRATION_FILE="worker/migrations/migration_001_user_system.sql"
[ -f "$MIGRATION_FILE" ] || fail "Migration 文件不存在：$MIGRATION_FILE"

npx wrangler d1 execute id-photo-users --remote --file="$MIGRATION_FILE"
log "数据库 Migration 完成"

# ─── Step 2：部署 Worker ──────────────────────────────────────
echo ""
warn "Step 2/3  部署 Cloudflare Worker..."

npx wrangler deploy
log "Worker 部署完成"

# ─── Step 3：推送代码（触发 Pages 构建）─────────────────────
echo ""
warn "Step 3/3  推送代码到 GitHub..."

PENDING=$(git log origin/main..HEAD --oneline 2>/dev/null | wc -l | tr -d ' ')

if [ "$PENDING" -eq "0" ]; then
  warn "没有待推送的 commit，跳过 git push"
else
  git push origin main
  log "已推送 ${PENDING} 个 commit，Cloudflare Pages 将自动触发构建"
fi

# ─── 完成 ─────────────────────────────────────────────────────
echo ""
echo "────────────────────────────────"
log "全部完成！"
echo ""
echo "  Worker:  https://id-photo-cropper-worker.hanbsong94.workers.dev"
echo "  Pages:   https://id-photo-cropper.pages.dev  （构建约需 1-2 分钟）"
echo ""
