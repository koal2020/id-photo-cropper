'use client';

import { useRef, useEffect, useState } from 'react';
import Cropper from 'react-cropper';
import { SizePreset } from '@/lib/config';

interface ImageCropperProps {
  src: string;
  sizePreset: SizePreset;
  onCrop: (cropData: any) => void;
}

export default function ImageCropper({ src, sizePreset, onCrop }: ImageCropperProps) {
  const cropperRef = useRef<HTMLImageElement & { cropper?: any }>(null);
  const [scaleX, setScaleX] = useState(1);
  const [scaleY, setScaleY] = useState(1);

  useEffect(() => {
    // Reset scale when image changes
    setScaleX(1);
    setScaleY(1);
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