export interface SizePreset {
  id: string;
  name: string;
  width: number;
  height: number;
  ratio: number;
  description?: string;
}

export const SIZE_PRESETS: SizePreset[] = [
  {
    id: 'id-1',
    name: '一寸照',
    width: 295,
    height: 413,
    ratio: 295 / 413,
    description: '25×35mm'
  },
  {
    id: 'id-2',
    name: '二寸照',
    width: 413,
    height: 626,
    ratio: 413 / 626,
    description: '35×53mm'
  },
  {
    id: 'passport',
    name: '护照',
    width: 354,
    height: 472,
    ratio: 354 / 472,
    description: '33×48mm'
  },
  {
    id: 'avatar',
    name: '微信头像',
    width: 300,
    height: 300,
    ratio: 1,
    description: '正方形'
  }
];

export interface BackgroundColor {
  id: string;
  name: string;
  color: string;
  hex: string;
}

export const BACKGROUND_COLORS: BackgroundColor[] = [
  { id: 'white', name: '白色', color: 'bg-white', hex: '#ffffff' },
  { id: 'blue', name: '蓝色', color: 'bg-blue-500', hex: '#3b82f6' },
  { id: 'red', name: '红色', color: 'bg-red-500', hex: '#ef4444' }
];

export const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

// ─── 用户计划类型 ───────────────────────────────────────────────
export type UserPlan = 'guest' | 'free' | 'pro';

// ─── 输入限制（上传图片） ────────────────────────────────────────
export const INPUT_LIMITS: Record<UserPlan, { maxFileSizeMB: number; maxPixels: number; label: string }> = {
  guest: { maxFileSizeMB: 5,  maxPixels: 2000, label: '未登录用户' },
  free:  { maxFileSizeMB: 8,  maxPixels: 3000, label: '免费用户'   },
  pro:   { maxFileSizeMB: 20, maxPixels: 6000, label: 'Pro 用户'   },
};

// ─── 输出分辨率档位（按像素总量 MP 控制） ─────────────────────────
//
// 各尺寸在对应 MP 下的实际像素（保持原始宽高比，精确计算）：
//
// 档位        一寸照        二寸照        护照          头像
// ──────────────────────────────────────────────────────────
// 1MP (免费)  845×1183     812×1231     866×1155     1000×1000
// 3MP (Pro)  1464×2049    1407×2132    1500×2000    1732×1732
// 5MP (Pro+) 1890×2646    1816×2753    1937×2582    2236×2236
//
export interface OutputTier {
  /** 目标像素总数（百万像素） */
  targetMP: number;
  /** 显示名称 */
  label: string;
  /** remove.bg size 参数 */
  removeBgSize: 'preview' | 'regular' | 'hd';
  /** remove.bg 每次消耗积分数（估算） */
  removeBgCredits: number;
}

// remove.bg size 参数与输出 MP 的关系：
//   preview  → 短边约 625px，~0.5MP，消耗 0.2 积分
//   regular  → 原图尺寸，上限 4MP，消耗 1 积分
//   hd       → 原图尺寸，上限 25MP，消耗 5 积分（超出 regular 用 hd）
//
// 策略：
//   free 用 preview → 输出 1MP（Canvas 放大到目标尺寸，避免高积分消耗）
//   pro  用 hd      → 输出可达 25MP，足够覆盖我们的 5MP 上限
export const OUTPUT_TIERS: Record<UserPlan, OutputTier> = {
  guest: {
    targetMP:        1,
    label:           '标准（1MP）',
    removeBgSize:    'preview',  // 不可用抠图，仅占位
    removeBgCredits: 0.2,
  },
  free: {
    targetMP:        1,          // Canvas 输出 1MP，remove.bg 用 preview 节省成本
    label:           '标准（1MP）',
    removeBgSize:    'preview',  // ~0.2 积分/次
    removeBgCredits: 0.2,
  },
  pro: {
    targetMP:        5,          // Canvas 输出 5MP，remove.bg 用 hd 保证抠图质量
    label:           '高清（5MP）',
    removeBgSize:    'hd',       // ~5 积分/次，支持 ≤25MP 输出，完全覆盖 5MP
    removeBgCredits: 5,
  },
};

// ─── 月度配额 ────────────────────────────────────────────────────
export const MONTHLY_QUOTA: Record<UserPlan, { downloads: number; removeBg: number }> = {
  guest: { downloads: 0,        removeBg: 0        },
  free:  { downloads: 5,        removeBg: 3        },
  pro:   { downloads: Infinity, removeBg: Infinity },
};

// ─── 根据 SizePreset + targetMP 计算实际输出像素 ──────────────────
export function calcOutputSize(
  preset: SizePreset,
  targetMP: number
): { width: number; height: number } {
  const ratio = preset.width / preset.height;
  const h = Math.round(Math.sqrt((targetMP * 1_000_000) / ratio));
  const w = Math.round(h * ratio);
  return { width: w, height: h };
}

// ─── 上传校验（含文件大小 + 类型） ──────────────────────────────────
export function validateImage(
  file: File,
  plan: UserPlan = 'guest'
): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: '请上传 JPG 或 PNG 格式的图片' };
  }
  const { maxFileSizeMB } = INPUT_LIMITS[plan];
  if (file.size > maxFileSizeMB * 1024 * 1024) {
    return { valid: false, error: `图片大小不能超过 ${maxFileSizeMB}MB` };
  }
  return { valid: true };
}