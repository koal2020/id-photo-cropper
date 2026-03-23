'use client';

import { useState, useCallback } from 'react';
import ImageUploader from '@/components/ImageUploader';
import ImageCropper from '@/components/ImageCropper';
import SizeSelector from '@/components/SizeSelector';
import BackgroundSelector from '@/components/BackgroundSelector';
import { SizePreset, SIZE_PRESETS, BackgroundColor, BACKGROUND_COLORS, validateImage } from '@/lib/config';
import { loadImage, createCanvas, downloadAllSizes } from '@/lib/utils';

// Worker API 地址
const WORKER_URL = 'https://id-photo-cropper-worker.hanbsong94.workers.dev';

export default function Home() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null); // 去背景后的图片
  const [selectedSize, setSelectedSize] = useState<SizePreset>(SIZE_PRESETS[0]);
  const [selectedBg, setSelectedBg] = useState<BackgroundColor>(BACKGROUND_COLORS[0]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [batchLoading, setBatchLoading] = useState<boolean>(false);
  const [removingBg, setRemovingBg] = useState<boolean>(false);
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
    setProcessedImage(null); // 重置处理后的图片
    setStep('result');
  }, []);

  // 去除背景
  const removeBackground = useCallback(async () => {
    if (!croppedImage) return;

    setRemovingBg(true);
    setError('');

    try {
      const response = await fetch(`${WORKER_URL}/api/remove-bg`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: croppedImage }),
      });

      if (!response.ok) {
        throw new Error('去除背景失败');
      }

      const data = await response.json();
      if (data.success) {
        setProcessedImage(data.image);
      } else {
        throw new Error(data.error || '处理失败');
      }
    } catch (err) {
      console.error('Remove background error:', err);
      setError('去除背景失败，请稍后重试或使用纯色背景');
    } finally {
      setRemovingBg(false);
    }
  }, [croppedImage]);

  const handleDownload = useCallback(async () => {
    const sourceImage = processedImage || croppedImage;
    if (!sourceImage) return;

    setLoading(true);
    try {
      // Load image
      const img = await loadImage(sourceImage);
      
      // Create canvas with target size
      const canvas = createCanvas(selectedSize.width, selectedSize.height);
      const ctx = canvas.getContext('2d')!;
      
      // Fill background color (if processedImage exists, it's transparent PNG)
      ctx.fillStyle = selectedBg.hex;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw image on top
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
  }, [croppedImage, processedImage, selectedSize, selectedBg]);

  const handleBatchDownload = useCallback(async () => {
    const sourceImage = processedImage || croppedImage;
    if (!sourceImage) return;
    setBatchLoading(true);
    try {
      await downloadAllSizes(sourceImage, selectedBg);
    } catch (err) {
      setError('批量生成失败，请重试');
    } finally {
      setBatchLoading(false);
    }
  }, [croppedImage, processedImage, selectedBg]);

  const handleReset = useCallback(() => {
    setCroppedImage(null);
    setProcessedImage(null);
    setStep('upload');
    setError('');
  }, []);

  // 预览用的图片（优先显示处理后的透明图+背景色，否则显示裁剪图）
  const previewImage = processedImage || croppedImage;

  return (
    <main className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            证件照裁剪工具
          </h1>
          <p className="text-gray-600">
            上传照片，智能裁剪，一键生成标准证件照
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
                    isActive ? 'bg-blue-600 text-white' :
                    isCompleted ? 'bg-green-500 text-white' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {isCompleted ? '✓' : index + 1}
                  </div>
                  <span className={`ml-2 text-sm ${
                    isActive ? 'text-blue-600 font-medium' :
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
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
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

            {step === 'result' && previewImage && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center" style={{ backgroundColor: processedImage ? selectedBg.hex : '#f3f4f6' }}>
                    <img
                      src={previewImage}
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
                      className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? '生成中...' : '下载证件照'}
                    </button>
                  </div>
                  <button
                    onClick={handleBatchDownload}
                    disabled={batchLoading || loading}
                    className="w-full mt-2 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {batchLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        正在生成全套尺寸...
                      </span>
                    ) : '📦 下载全部尺寸（ZIP）'}
                  </button>
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
                      <div className="flex justify-between">
                        <span className="text-gray-500">背景处理</span>
                        <span className="font-medium">{processedImage ? '✓ 已抠图' : '纯色背景'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 背景移除按钮 */}
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h3 className="text-sm font-medium text-blue-900 mb-2">AI 智能抠图</h3>
                    <p className="text-xs text-blue-700 mb-3">
                      自动去除原背景，替换为纯色证件照背景
                    </p>
                    <button
                      onClick={removeBackground}
                      disabled={removingBg || !!processedImage}
                      className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {removingBg ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                          处理中...
                        </span>
                      ) : processedImage ? (
                        '✓ 已完成抠图'
                      ) : (
                        '🪄 一键去除背景'
                      )}
                    </button>
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
        <div className="mt-8 text-center text-sm text-gray-500 space-y-1">
          <p>图片仅在浏览器中处理，不会上传到服务器</p>
          <p>AI 抠图功能通过 Cloudflare Worker 调用 remove.bg API</p>
        </div>
      </div>
    </main>
  );
}