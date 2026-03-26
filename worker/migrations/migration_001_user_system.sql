-- ═══════════════════════════════════════════════════════════════
-- migration_001_user_system.sql
-- 执行：npx wrangler d1 execute id-photo-users --remote --file=worker/migrations/migration_001_user_system.sql
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. users 表新增字段 ──────────────────────────────────────
ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN plan_expires_at DATETIME;
ALTER TABLE users ADD COLUMN credits INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN monthly_downloads INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN monthly_removebg INTEGER NOT NULL DEFAULT 0;
-- SQLite 不支持 CURRENT_TIMESTAMP 作 ALTER TABLE 默认值，用固定占位
-- Worker 首次请求时会自动检测并重置为当前时间
ALTER TABLE users ADD COLUMN quota_reset_at DATETIME NOT NULL DEFAULT '2025-01-01 00:00:00';

-- ─── 2. 操作历史表 ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS photo_history (
  id          INTEGER  PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action      TEXT     NOT NULL,
  size_preset TEXT,
  bg_color    TEXT,
  used_credit INTEGER  NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── 3. 订单表 ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                 INTEGER  PRIMARY KEY AUTOINCREMENT,
  user_id            INTEGER  NOT NULL REFERENCES users(id),
  order_type         TEXT     NOT NULL,
  amount_fen         INTEGER  NOT NULL,
  credits_granted    INTEGER  NOT NULL DEFAULT 0,
  plan_granted       TEXT,
  plan_duration_days INTEGER,
  status             TEXT     NOT NULL DEFAULT 'pending',
  payment_provider   TEXT,
  external_order_id  TEXT,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at            DATETIME
);

-- ─── 4. 索引 ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_photo_history_user_id
  ON photo_history(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_user_id
  ON orders(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_external_id
  ON orders(external_order_id)
  WHERE external_order_id IS NOT NULL;
