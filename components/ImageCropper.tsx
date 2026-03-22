'use client';

import { useRef, useEffect, useState } from 'react';
import Cropper from 'react-cropper';
import { SizePreset } from '@/lib/config';
import { detectFace, calculateCropBox, cropBoxToPercentages } from '@/lib/faceDetection';

interface ImageCropperProps {
  src: string;
  sizePreset: SizePreset;
  onCrop: (cropData: any) => void;
}

export default function ImageCropper({ src, sizePreset, onCrop }: ImageCropperProps) {
  const cropperRef = useRef<HTMLImageElement & { cropper?: any }>(null);
  const [scaleX, setScaleX] = useState(1);
  const [scaleY, setScaleY] = useState(1);
  const [faceDetecting, setFaceDetecting] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);

  useEffect(() => {
    // Reset scale when image changes
    setScaleX(1);
    setScaleY(1);
    setFaceDetected(false);
  }, [src]);

  const handleCrop = () => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      const canvas = cropper.getCroppedCanvas({
        width: sizePreset.width,
        height: sizePreset.height,
        fillColor: '#fff',
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      });
      if (canvas) {
        onCrop(canvas.toDataURL('image/jpeg', 0.9));
      }
    }
  };

  const rotate = (degree: number) => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      cropper.rotate(degree);
    }
  };

  const reset = () => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      cropper.reset();
      setScaleX(1);
      setScaleY(1);
    }
  };

  const zoom = (ratio: number) => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      cropper.zoom(ratio);
    }
  };

  /**
   * 自动检测人脸并调整裁剪框
   */
  const autoDetectFace = async () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;

    setFaceDetecting(true);
    try {
      // 获取当前图片元素
      const imageElement = cropper.getImageData();
      const img = new Image();
      img.src = src;
      await new Promise((resolve) => { img.onload = resolve; });

      // 检测人脸
      const detection = await detectFace(img);
      
      if (detection) {
        // 计算裁剪框位置
        const cropBox = calculateCropBox(
          detection,
          img.naturalWidth,
          img.naturalHeight,
          sizePreset.ratio
        );

        // 转换为相对坐标
        const containerData = cropper.getContainerData();
        const canvasData = cropper.getCanvasData();
        
        // 计算缩放比例
        const scaleX = canvasData.width / img.naturalWidth;
        const scaleY = canvasData.height / img.naturalHeight;

        // 设置裁剪框位置
        cropper.setCropBoxData({
          left: canvasData.left + cropBox.x * scaleX,
          top: canvasData.top + cropBox.y * scaleY,
          width: cropBox.width * scaleX,
          height: cropBox.height * scaleY
        });

        setFaceDetected(true);
      } else {
        // 未检测到人脸，提示用户
        alert('未检测到人脸，请手动调整裁剪框');
        setFaceDetected(false);
      }
    } catch (error) {
      console.error('Face detection failed:', error);
      alert('人脸检测失败，请手动调整裁剪框');
    } finally {
      setFaceDetecting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-100 rounded-lg overflow-hidden">
        <Cropper
          src={src}
          style={{ height: 400, width: '100%' }}
          initialAspectRatio={sizePreset.ratio}
          aspectRatio={sizePreset.ratio}
          guides={true}
          viewMode={1}
          dragMode="move"
          scalable={true}
          zoomable={true}
          zoomOnTouch={true}
          zoomOnWheel={true}
          cropBoxMovable={true}
          cropBoxResizable={true}
          toggleDragModeOnDblclick={false}
          ref={cropperRef}
          ready={() => {
            // Auto zoom to fit face area when ready
            const cropper = cropperRef.current?.cropper;
            if (cropper) {
              cropper.zoomTo(0.5);
            }
          }}
        />
      </div>
      
      <div className="flex flex-wrap gap-2 justify-center">
        <button
          onClick={autoDetectFace}
          disabled={faceDetecting}
          className={`px-3 py-2 rounded-md text-sm transition-colors ${
            faceDetected 
              ? 'bg-green-100 text-green-700 border border-green-300' 
              : 'bg-blue-50 text-blue-600 border border-blue-300 hover:bg-blue-100'
          } disabled:opacity-50`}
        >
          {faceDetecting ? '检测中...' : faceDetected ? '✓ 人脸已定位' : '😊 自动定位人脸'}
        </button>
        <button
          onClick={() => rotate(-90)}
          className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition-colors"
        >
          ↺ 向左旋转
        </button>
        <button
          onClick={() => rotate(90)}
          className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition-colors"
        >
          ↻ 向右旋转
        </button>
        <button
          onClick={() => zoom(0.1)}
          className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition-colors"
        >
          🔍+ 放大
        </button>
        <button
          onClick={() => zoom(-0.1)}
          className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition-colors"
        >
          🔍- 缩小
        </button>
        <button
          onClick={reset}
          className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition-colors"
        >
          ↺ 重置
        </button>
      </div>

      <button
        onClick={handleCrop}
        className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors"
      >
        确认裁剪
      </button>
    </div>
  );
}