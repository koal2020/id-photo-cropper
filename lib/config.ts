// ─────────────────────────────────────────────────────────────────
// config.ts — 全局配置：尺寸、背景色、用户分层、定价、配额、分辨率
// ─────────────────────────────────────────────────────────────────

// ─── 证件照尺寸预设 ───────────────────────────────────────────────
export interface SizePreset {
  id: string;
  name: string;
  width: number;
  height: number;
  ratio: number;
  description?: string;
}

export const SIZE_PRESETS: SizePreset[] = [
  { id: 'id-1',    name: '一寸照', width: 295, height: 413, ratio: 295 / 413, description: '25×35mm' },
  { id: 'id-2',    name: '二寸照', width: 413, height: 626, ratio: 413 / 626, description: '35×53mm' },
  { id: 'passport',name: '护照',   width: 354, height: 472, ratio: 354 / 472, description: '33×48mm' },
  { id: 'avatar',  name: '微信头像',width: 300, height: 300, ratio: 1,         description: '正方形'  },
];

// ─── 背景色 ──────────────────────────────────────────────────────
export interface BackgroundColor {
  id: string;
  name: string;
  color: string;
  hex: string;
}

export const BACKGROUND_COLORS: BackgroundColor[] = [
  { id: 'white', name: '白色', color: 'bg-white',    hex: '#ffffff' },
  { id: 'blue',  name: '蓝色', color: 'bg-blue-500', hex: '#3b82f6' },
  { id: 'red',   name: '红色', color: 'bg-red-500',  hex: '#ef4444' },
];

// ─── 上传文件格式白名单 ───────────────────────────────────────────
export const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

// ═══════════════════════════════════════════════════════════════════
// 用户分层
// ═══════════════════════════════════════════════════════════════════

/**
 * guest  — 未登录访客
 * free   — 注册免费用户（一次性送 3 次 AI 抠图额度，月度免费配额）
 * basic  — 基础订阅 ¥9.9/月
 * pro    — 专业订阅 ¥19.9/月
 * credits— 积分包用户（plan=free/basic/pro，另有 credits 余额）
 */
export type UserPlan = 'guest' | 'free' | 'basic' | 'pro';

// ═══════════════════════════════════════════════════════════════════
// 输入限制（上传图片）
// ═══════════════════════════════════════════════════════════════════
export const INPUT_LIMITS: Record<UserPlan, {
  maxFileSizeMB: number;
  maxPixels: number;   // 短边最大像素（前端压缩用）
  label: string;
}> = {
  guest: { maxFileSizeMB: 5,  maxPixels: 2000, label: '未登录用户' },
  free:  { maxFileSizeMB: 8,  maxPixels: 3000, label: '免费用户'   },
  basic: { maxFileSizeMB: 10, maxPixels: 4000, label: '基础订阅'   },
  pro:   { maxFileSizeMB: 20, maxPixels: 6000, label: 'Pro 订阅'   },
};

// ═══════════════════════════════════════════════════════════════════
// 输出分辨率档位
// ═══════════════════════════════════════════════════════════════════
//
// 各尺寸在对应 MP 档下的实际像素（保持宽高比精确计算）：
//
// 档位       一寸照       二寸照       护照         头像
// ─────────────────────────────────────────────────────
// 1MP(free)  845×1183    812×1231    866×1155    1000×1000
// 3MP(basic) 1464×2049   1407×2132   1500×2000   1732×1732
// 5MP(pro)   1890×2646   1816×2753   1937×2582   2236×2236
//
// remove.bg size 参数与积分消耗：
//   preview → 短边约 625px，消耗 0.2 积分 ≈ ¥0.026（Vol+ 套餐）
//   regular → 原图，上限 4MP，消耗 1 积分 ≈ ¥0.128
//   hd      → 原图，上限 25MP，消耗 5 积分 ≈ ¥0.641
//
// 成本策略：
//   free/basic 统一用 preview，Canvas 放大到目标尺寸输出
//   pro 用 regular（4MP 足够覆盖 3MP 输出需求，hd 成本过高暂不开放）
//
export interface OutputTier {
  targetMP: number;
  label: string;
  removeBgSize: 'preview' | 'regular' | 'hd';
  /** remove.bg 每次消耗积分（估算，用于成本监控） */
  removeBgCredits: number;
  /** 对应 remove.bg Vol+ 套餐的人民币成本（¥） */
  costRMB: number;
}

export const OUTPUT_TIERS: Record<UserPlan, OutputTier> = {
  guest: {
    targetMP:        1,
    label:           '标准（1MP）',
    removeBgSize:    'preview',  // 占位，guest 不可用抠图
    removeBgCredits: 0.2,
    costRMB:         0.026,
  },
  free: {
    targetMP:        1,          // Canvas 输出 1MP
    label:           '标准（1MP）',
    removeBgSize:    'preview',  // 0.2 积分，成本最低
    removeBgCredits: 0.2,
    costRMB:         0.026,      // 0.2 × (89/500) × 7.2 ≈ ¥0.026
  },
  basic: {
    targetMP:        3,          // Canvas 输出 3MP
    label:           '高清（3MP）',
    removeBgSize:    'preview',  // 仍用 preview 控成本，Canvas 负责放大
    removeBgCredits: 0.2,
    costRMB:         0.026,
  },
  pro: {
    targetMP:        5,          // Canvas 输出 5MP
    label:           '超清（5MP）',
    removeBgSize:    'regular',  // 1 积分，原图质量，4MP 覆盖 5MP 输出已足够
    removeBgCredits: 1,
    costRMB:         0.128,      // 1 × (89/500) × 7.2 ≈ ¥0.128
  },
};

// ═══════════════════════════════════════════════════════════════════
// 月度配额（每月 1 日重置）
// ═══════════════════════════════════════════════════════════════════
//
// AI 抠图配额说明：
//   free  — 注册一次性赠送 3 次（SIGNUP_BONUS），用完即止，无月度重置
//   basic — 每月 15 次（重置）
//   pro   — 每月 50 次（重置）
//   超出后需购买积分包
//
export const SIGNUP_BONUS = 3; // 注册赠送次数（一次性）

export interface PlanQuota {
  /** 每月高清下载次数（-1 = 无限） */
  monthlyDownloads: number;
  /** 每月 AI 抠图次数（-1 = 无限；0 = 仅靠注册赠送/积分包） */
  monthlyRemoveBg: number;
  /** 是否支持批量下载 ZIP */
  batchDownload: boolean;
  /** 历史记录保留条数（-1 = 无限） */
  historyLimit: number;
}

export const PLAN_QUOTA: Record<UserPlan, PlanQuota> = {
  guest: {
    monthlyDownloads: 0,    // 须登录才能下载
    monthlyRemoveBg:  0,    // 须登录才能抠图
    batchDownload:    false,
    historyLimit:     0,
  },
  free: {
    monthlyDownloads: 5,    // 每月 5 次高清下载
    monthlyRemoveBg:  0,    // 无月度配额，靠注册赠送 3 次 + 积分包
    batchDownload:    false,
    historyLimit:     10,
  },
  basic: {
    monthlyDownloads: -1,   // 无限下载
    monthlyRemoveBg:  15,   // 每月 15 次 AI 抠图
    batchDownload:    false,
    historyLimit:     50,
  },
  pro: {
    monthlyDownloads: -1,   // 无限下载
    monthlyRemoveBg:  50,   // 每月 50 次 AI 抠图
    batchDownload:    true,
    historyLimit:     -1,
  },
};

// ═══════════════════════════════════════════════════════════════════
// 定价方案
// ═══════════════════════════════════════════════════════════════════
//
// 成本参考（remove.bg Vol+ $89/月，500 积分）：
//   preview 每次 ≈ ¥0.026；regular 每次 ≈ ¥0.128
//
// 月度 API 成本上限估算（最大配额全用满）：
//   basic  15次 × ¥0.026 = ¥0.39  → 定价 ¥9.9，毛利 96%
//   pro    50次 × ¥0.128 = ¥6.40  → 定价 ¥19.9，毛利 68%
//
// 注：实际用户平均使用率远低于上限，真实毛利更高
//
export interface PricingPlan {
  id: string;
  name: string;
  monthlyPriceCNY: number;    // 月付价格（元）
  yearlyPriceCNY: number;     // 年付价格（元，一次性）
  yearlyMonthEquiv: number;   // 年付折合月单价
  plan: UserPlan;
  highlight?: boolean;        // 是否高亮推荐
  badge?: string;             // 徽章文案
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: '免费',
    monthlyPriceCNY: 0,
    yearlyPriceCNY:  0,
    yearlyMonthEquiv: 0,
    plan: 'free',
  },
  {
    id: 'basic',
    name: '基础版',
    monthlyPriceCNY: 9.9,
    yearlyPriceCNY:  79,       // 折合 ¥6.6/月，省 33%
    yearlyMonthEquiv: 6.6,
    plan: 'basic',
    badge: '省 33%',
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPriceCNY: 19.9,
    yearlyPriceCNY:  149,      // 折合 ¥12.4/月，省 38%
    yearlyMonthEquiv: 12.4,
    plan: 'pro',
    highlight: true,
    badge: '最受欢迎',
  },
];

// ─── 积分包（一次性购买，永不过期） ──────────────────────────────────
//
// 积分 1 次 = 1 次 AI 抠图（preview 档），可叠加在任意 plan 上
// 月度配额耗尽后自动扣积分；注册赠送 3 次也计入积分余额
//
// 成本：每次 ¥0.026，定价 ¥0.5~¥1/次，毛利 74%~98%
//
export interface CreditPack {
  id: string;
  credits: number;
  priceCNY: number;
  perCreditCNY: number;   // 单次均价
  badge?: string;
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'pack-10',
    credits:       10,
    priceCNY:      9.9,
    perCreditCNY:  0.99,
    badge:         '尝鲜',
  },
  {
    id: 'pack-50',
    credits:       50,
    priceCNY:      39,
    perCreditCNY:  0.78,
    badge:         '推荐',
  },
  {
    id: 'pack-200',
    credits:       200,
    priceCNY:      99,
    perCreditCNY:  0.50,
    badge:         '最划算',
  },
];

// ═══════════════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════════════

/**
 * 根据 SizePreset + targetMP 计算实际输出像素（保持宽高比）
 */
export function calcOutputSize(
  preset: SizePreset,
  targetMP: number,
): { width: number; height: number } {
  const ratio = preset.width / preset.height;
  const h = Math.round(Math.sqrt((targetMP * 1_000_000) / ratio));
  const w = Math.round(h * ratio);
  return { width: w, height: h };
}

/**
 * 上传文件校验（类型 + 文件大小）
 * plan 默认 'guest'，按用户等级给出对应的大小限制和错误提示
 */
export function validateImage(
  file: File,
  plan: UserPlan = 'guest',
): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: '请上传 JPG 或 PNG 格式的图片' };
  }
  const { maxFileSizeMB } = INPUT_LIMITS[plan];
  if (file.size > maxFileSizeMB * 1024 * 1024) {
    return {
      valid: false,
      error: `图片大小不能超过 ${maxFileSizeMB}MB${plan === 'guest' ? '（登录后可上传更大文件）' : ''}`,
    };
  }
  return { valid: true };
}

/**
 * 判断某项操作是否在配额内
 * credits: 用户当前积分余额（可叠加在月度配额之上）
 */
export function checkQuota(
  plan: UserPlan,
  action: 'download' | 'removeBg',
  used: number,           // 本月已用次数
  credits: number = 0,    // 积分余额
): { allowed: boolean; useCredits: boolean; reason?: string } {
  const quota = PLAN_QUOTA[plan];

  if (action === 'download') {
    if (plan === 'guest') return { allowed: false, useCredits: false, reason: '请先登录' };
    const limit = quota.monthlyDownloads;
    if (limit === -1 || used < limit) return { allowed: true, useCredits: false };
    return { allowed: false, useCredits: false, reason: '本月下载次数已用完，请升级套餐' };
  }

  if (action === 'removeBg') {
    if (plan === 'guest') return { allowed: false, useCredits: false, reason: '请先登录后使用 AI 抠图' };
    const limit = quota.monthlyRemoveBg;
    // 月度配额未耗尽
    if (limit === -1 || used < limit) return { allowed: true, useCredits: false };
    // 月度耗尽，看积分余额
    if (credits > 0) return { allowed: true, useCredits: true };
    return { allowed: false, useCredits: false, reason: '本月 AI 抠图次数已用完，可购买积分包继续使用' };
  }

  return { allowed: false, useCredits: false, reason: '未知操作' };
}
