import JSZip from 'jszip';
import { SIZE_PRESETS, BackgroundColor } from './config';

export function dataURLtoBlob(dataURL: string): Blob {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

export function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type });
}

export async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export async function removeBackgroundWithCanvas(
  imageData: ImageData,
  backgroundColor: string
): Promise<string> {
  const canvas = createCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d')!;
  
  // Fill background color
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Put image data on top
  ctx.putImageData(imageData, 0, 0);
  
  return canvas.toDataURL('image/jpeg', 0.9);
}

/**
 * 生成所有尺寸的证件照并打包成 ZIP 下载
 * @param sourceImage - 裁剪/抠图后的源图片（base64）
 * @param selectedBg - 选中的背景颜色
 */
export async function downloadAllSizes(
  sourceImage: string,
  selectedBg: BackgroundColor
): Promise<void> {
  const img = await loadImage(sourceImage);
  const zip = new JSZip();
  const folder = zip.folder('证件照');

  for (const preset of SIZE_PRESETS) {
    const canvas = createCanvas(preset.width, preset.height);
    const ctx = canvas.getContext('2d')!;

    // 填充背景色
    ctx.fillStyle = selectedBg.hex;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制图片（拉伸填满，保持裁剪结果）
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // 转为 Blob 加入 ZIP
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const base64Data = dataUrl.split(',')[1];
    folder?.file(`${preset.name}_${preset.width}x${preset.height}.jpg`, base64Data, { base64: true });
  }

  // 生成 ZIP 并触发下载
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `证件照全套_${Date.now()}.zip`;
  link.click();
  URL.revokeObjectURL(url);
}