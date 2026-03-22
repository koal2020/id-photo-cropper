import * as faceapi from 'face-api.js';

let modelsLoaded = false;

/**
 * 加载 face-api.js 模型
 */
export async function loadFaceDetectionModels(): Promise<void> {
  if (modelsLoaded) return;
  
  const modelUrl = '/models';
  
  await faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl);
  modelsLoaded = true;
  console.log('Face detection models loaded');
}

/**
 * 检测图片中的人脸位置
 * @param imageElement - HTMLImageElement 或 HTMLVideoElement
 * @returns 人脸位置信息或 null
 */
export async function detectFace(imageElement: HTMLImageElement | HTMLVideoElement): Promise<faceapi.FaceDetection | null> {
  if (!modelsLoaded) {
    await loadFaceDetectionModels();
  }
  
  const detection = await faceapi.detectSingleFace(
    imageElement,
    new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.5 })
  );
  
  return detection || null;
}

/**
 * 计算裁剪框位置（基于人脸中心）
 * @param faceDetection - 人脸检测结果
 * @param imageWidth - 原图宽度
 * @param imageHeight - 原图高度
 * @param aspectRatio - 裁剪框宽高比
 * @returns 裁剪框位置和尺寸
 */
export function calculateCropBox(
  faceDetection: faceapi.FaceDetection,
  imageWidth: number,
  imageHeight: number,
  aspectRatio: number
): { x: number; y: number; width: number; height: number } {
  const { box } = faceDetection;
  
  // 人脸中心点
  const faceCenterX = box.x + box.width / 2;
  const faceCenterY = box.y + box.height / 2;
  
  // 计算裁剪框尺寸
  // 证件照中头部应占一定比例（约70%高度）
  const headToPhotoRatio = 0.7;
  let cropHeight = box.height / headToPhotoRatio;
  let cropWidth = cropHeight * aspectRatio;
  
  // 确保裁剪框不超出图片边界
  const minSize = Math.min(imageWidth, imageHeight);
  if (cropWidth > imageWidth || cropHeight > imageHeight) {
    const scale = Math.min(imageWidth / cropWidth, imageHeight / cropHeight);
    cropWidth *= scale;
    cropHeight *= scale;
  }
  
  // 计算裁剪框左上角位置（以人脸为中心）
  let cropX = faceCenterX - cropWidth / 2;
  let cropY = faceCenterY - cropHeight / 2 - box.height * 0.1; // 稍微上移，符合证件照习惯
  
  // 边界检查
  cropX = Math.max(0, Math.min(cropX, imageWidth - cropWidth));
  cropY = Math.max(0, Math.min(cropY, imageHeight - cropHeight));
  
  return {
    x: cropX,
    y: cropY,
    width: cropWidth,
    height: cropHeight
  };
}

/**
 * 将裁剪框转换为百分比（用于 Cropper.js）
 */
export function cropBoxToPercentages(
  cropBox: { x: number; y: number; width: number; height: number },
  imageWidth: number,
  imageHeight: number
): { x: number; y: number; width: number; height: number } {
  return {
    x: (cropBox.x / imageWidth) * 100,
    y: (cropBox.y / imageHeight) * 100,
    width: (cropBox.width / imageWidth) * 100,
    height: (cropBox.height / imageHeight) * 100
  };
}