-- ═══════════════════════════════════════════════════════════════
-- schema.sql — ID Photo Cropper 数据库结构
-- ═══════════════════════════════════════════════════════════════

-- ─── 用户表 ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id               INTEGER  PRIMARY KEY AUTOINCREMENT,
  google_id        TEXT     UNIQUE NOT NULL,
  email            TEXT     UNIQUE NOT NULL,
  name             TEXT,
  avatar_url       TEXT,

  -- 订阅计划: 'free' | 'basic' | 'pro'
  plan             TEXT     NOT NULL DEFAULT 'free',
  -- 订阅到期时间（NULL = 免费用户）
  plan_expires_at  DATETIME,

  -- 积分余额（一次性购买 + 注册赠送 3 次 = 注册时写入 3）
  credits          INTEGER  NOT NULL DEFAULT 3,

  -- 月度配额使用计数（每月 1 日由 Worker scheduled 任务重置）
  monthly_downloads INTEGER NOT NULL DEFAULT 0,
  monthly_removebg  INTEGER NOT NULL DEFAULT 0,
  -- 本次配额周期开始时间（用于判断是否需要重置）
  quota_reset_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── 操作历史表 ───────────────────────────────────────────────────
-- 记录用户每次下载/抠图操作，用于个人中心"最近操作"展示
CREATE TABLE IF NOT EXISTS photo_history (
  id          INTEGER  PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- 操作类型: 'download' | 'remove_bg' | 'batch_download'
  action      TEXT     NOT NULL,
  size_preset TEXT,              -- 'id-1' | 'id-2' | 'passport' | 'avatar'
  bg_color    TEXT,              -- '#ffffff' | '#3b82f6' | '#ef4444'
  -- 是否消耗了积分（月度配额耗尽后走积分）
  used_credit INTEGER  NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── 订单表 ──────────────────────────────────────────────────────
-- 记录所有付款记录（积分包 + 月订阅 + 年订阅）
CREATE TABLE IF NOT EXISTS orders (
  id                INTEGER  PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER  NOT NULL REFERENCES users(id),

  -- 订单类型
  -- 积分包: 'credits_10' | 'credits_50' | 'credits_200'
  -- 月订阅: 'basic_monthly' | 'pro_monthly'
  -- 年订阅: 'basic_yearly'  | 'pro_yearly'
  order_type        TEXT     NOT NULL,

  -- 金额（单位：分，避免浮点误差）
  -- ¥9.9 → 990；¥19.9 → 1990；¥79 → 7900；¥149 → 14900
  amount_fen        INTEGER  NOT NULL,

  -- 积分包：充入的积分数；订阅类型：0
  credits_granted   INTEGER  NOT NULL DEFAULT 0,

  -- 订阅计划（仅订阅订单有值）
  plan_granted      TEXT,        -- 'basic' | 'pro'
  plan_duration_days INTEGER,    -- 月订阅=30，年订阅=365

  -- 支付状态: 'pending' | 'paid' | 'failed' | 'refunded'
  status            TEXT     NOT NULL DEFAULT 'pending',

  -- 支付渠道（预留，后期接入 PayPal / 支付宝 / 微信）
  payment_provider  TEXT,        -- 'paypal' | 'alipay' | 'wechat' | 'stripe'
  external_order_id TEXT,        -- 支付平台的订单号

  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at           DATETIME
);

-- ─── 索引 ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_photo_history_user_id
  ON photo_history(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_user_id
  ON orders(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_external_id
  ON orders(external_order_id)
  WHERE external_order_id IS NOT NULL;
