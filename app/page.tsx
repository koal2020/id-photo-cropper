'use client';

import { useState, useCallback } from 'react';
import ImageUploader from '@/components/ImageUploader';
import ImageCropper from '@/components/ImageCropper';
import SizeSelector from '@/components/SizeSelector';
import BackgroundSelector from '@/components/BackgroundSelector';
import { SizePreset, SIZE_PRESETS, BackgroundColor, BACKGROUND_COLORS, validateImage } from '@/lib/config';
import { loadImage, createCanvas } from '@/lib/utils';

export default function Home() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<SizePreset>(SIZE_PRESETS[0]);
  const [selectedBg, setSelectedBg] = useState<BackgroundColor>(BACKGROUND_COLORS[0]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [step, setStep] = useState<'upload' | 'crop' | 'result'>('upload');

  const handleUpload = useCallback((file: File) => {
    const validation = validateImage(file);
    if (!validation.valid) {
      setError(validation.error || '上传失败');
      return;
    }

    setError('');
    setLoading(true);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
      setStep('crop');
      setLoading(false);
    };
    reader.onerror = () => {
      setError('读取图片失败');
      setLoading(false);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleCrop = useCallback((cropData: string) => {
    setCroppedImage(cropData);
    setStep('result');
  }, []);

  const handleDownload = useCallback(async () => {
    if (!croppedImage) return;

    setLoading(true);
    try {
      // Load cropped image
      const img = await loadImage(croppedImage);
      
      // Create canvas with background color
      const canvas = createCanvas(selectedSize.width, selectedSize.height);
      const ctx = canvas.getContext('2d')!;
      
      // Fill background
      ctx.fillStyle = selectedBg.hex;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw cropped image on top
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Download
      const link = document.createElement('a');
      link.download = `证件照_${selectedSize.name}_${Date.now()}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
    } catch (err) {
      setError('生成图片失败');
    } finally {
      setLoading(false);
    }
  }, [croppedImage, selectedSize, selectedBg]);

  const handleReset = useCallback(() => {
    setUploadedImage(null);
    setCroppedImage(null);
    setStep('upload');
    setError('');
  }, []);

  return (
    <main className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            证件照裁剪工具
          </h1>
          <p className="text-gray-600">
            上传照片，选择尺寸，一键生成标准证件照
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {['上传照片', '裁剪调整', '下载证件照'].map((label, index) => {
              const stepNames: ('upload' | 'crop' | 'result')[] = ['upload', 'crop', 'result'];
              const currentIndex = stepNames.indexOf(step);
              const isActive = index === currentIndex;
              const isCompleted = index < currentIndex;

              return (
                <div key={label} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    isActive ? 'bg-primary text-white' :
                    isCompleted ? 'bg-green-500 text-white' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {isCompleted ? '✓' : index + 1}
                  </div>
                  <span className={`ml-2 text-sm ${
                    isActive ? 'text-primary font-medium' :
                    isCompleted ? 'text-green-600' :
                    'text-gray-500'
                  }`}>
                    {label}
                  </span>
                  {index < 2 && (
                    <div className="w-8 h-px bg-gray-300 mx-4" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6">
            {step === 'upload' && (
              <div className="space-y-6">
                <ImageUploader onUpload={handleUpload} error={error} />
                {loading && (
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
                    <p className="mt-2 text-sm text-gray-600">正在处理...</p>
                  </div>
                )}
              </div>
            )}

            {step === 'crop' && uploadedImage && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <ImageCropper
                    src={uploadedImage}
                    sizePreset={selectedSize}
                    onCrop={handleCrop}
                  />
                </div>
                <div className="space-y-6">
                  <SizeSelector
                    selectedId={selectedSize.id}
                    onSelect={setSelectedSize}
                  />
                  <button
                    onClick={handleReset}
                    className="w-full py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    重新上传
                  </button>
                </div>
              </div>
            )}

            {step === 'result' && croppedImage && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center">
                    <img
                      src={croppedImage}
                      alt="裁剪结果"
                      className="max-w-full max-h-96 object-contain rounded-lg shadow-md"
                    />
                  </div>
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => setStep('crop')}
                      className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      重新裁剪
                    </button>
                    <button
                      onClick={handleDownload}
                      disabled={loading}
                      className="flex-1 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
                    >
                      {loading ? '生成中...' : '下载证件照'}
                    </button>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">当前设置</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">尺寸</span>
                        <span className="font-medium">{selectedSize.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">像素</span>
                        <span className="font-medium">{selectedSize.width}×{selectedSize.height}</span>
                      </div>
                    </div>
                  </div>
                  
                  <BackgroundSelector
                    selectedId={selectedBg.id}
                    onSelect={setSelectedBg}
                  />
                  
                  <button
                    onClick={handleReset}
                    className="w-full py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    制作新证件照
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-center">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>图片仅在浏览器中处理，不会上传到服务器</p>
        </div>
      </div>
    </main>
  );
}