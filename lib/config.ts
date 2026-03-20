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

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

export function validateImage(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: '请上传 JPG 或 PNG 格式的图片' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: '图片大小不能超过 5MB' };
  }
  return { valid: true };
}