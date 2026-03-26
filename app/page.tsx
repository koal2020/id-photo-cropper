'use client';

import { useState, useCallback } from 'react';
import ImageUploader from '@/components/ImageUploader';
import ImageCropper from '@/components/ImageCropper';
import SizeSelector from '@/components/SizeSelector';
import BackgroundSelector from '@/components/BackgroundSelector';
import GoogleLogin from '@/components/GoogleLogin';
import LoginModal from '@/components/LoginModal';
import { SizePreset, SIZE_PRESETS, BackgroundColor, BACKGROUND_COLORS, validateImage, calcOutputSize, OUTPUT_TIERS } from '@/lib/config';
import { loadImage, createCanvas, downloadAllSizes } from '@/lib/utils';
import { useAuth, WORKER_URL, authHeaders } from '@/lib/auth';

export default function Home() {
  // ─── 认证状态（统一从 useAuth 取）────────────────────────────
  const { user, quota, loading: authLoading, login, logout, updateQuotaAfterRemoveBg, canRemoveBg, removeBgRemaining } = useAuth();

  // ─── 图片流程状态 ─────────────────────────────────────────────
  const [uploadedImage,  setUploadedImage]  = useState<string | null>(null);
  const [croppedImage,   setCroppedImage]   = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [selectedSize,   setSelectedSize]   = useState<SizePreset>(SIZE_PRESETS[0]);
  const [selectedBg,     setSelectedBg]     = useState<BackgroundColor>(BACKGROUND_COLORS[0]);
  const [step,           setStep]           = useState<'upload' | 'crop' | 'result'>('upload');

  // ─── UI 状态 ──────────────────────────────────────────────────
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [removingBg,   setRemovingBg]   = useState(false);

  // ─── 登录弹窗 ─────────────────────────────────────────────────
  const [loginModal, setLoginModal] = useState<{ open: boolean; scene: 'download' | 'removeBg' }>({
    open: false, scene: 'removeBg',
  });

  const openLoginModal = (scene: 'download' | 'removeBg') =>
    setLoginModal({ open: true, scene });

  // ─── 上传 ─────────────────────────────────────────────────────
  const handleUpload = useCallback((file: File) => {
    const plan = user?.plan ?? 'guest';
    const validation = validateImage(file, plan);
    if (!validation.valid) { setError(validation.error || '上传失败'); return; }

    setError('');
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
      setStep('crop');
      setLoading(false);
    };
    reader.onerror = () => { setError('读取图片失败'); setLoading(false); };
    reader.readAsDataURL(file);
  }, [user]);

  // ─── 裁剪 ─────────────────────────────────────────────────────
  const handleCrop = useCallback((cropData: string) => {
    setCroppedImage(cropData);
    setProcessedImage(null);
    setStep('result');
  }, []);

  // ─── AI 抠图 ──────────────────────────────────────────────────
  const removeBackground = useCallback(async () => {
    // 1. 未登录 → 弹登录框
    if (!user) {
      openLoginModal('removeBg');
      return;
    }

    // 2. 配额耗尽（月度 + 积分都为 0）
    if (!canRemoveBg()) {
      const plan = user.plan;
      if (plan === 'free') {
        setError('AI 抠图次数已用完，可购买积分包继续使用');
      } else {
        const remaining = removeBgRemaining();
        setError(`本月 AI 抠图次数已用完，剩余积分：${remaining === -1 ? '无限' : remaining}`);
      }
      return;
    }

    if (!croppedImage) return;
    setRemovingBg(true);
    setError('');

    try {
      const res = await fetch(`${WORKER_URL}/api/remove-bg`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body:    JSON.stringify({
          image:      croppedImage,
          sizePreset: selectedSize.id,
          bgColor:    selectedBg.hex,
        }),
      });

      const data = await res.json();

      if (res.status === 429) {
        // 配额耗尽（理论上前端已拦截，这里是兜底）
        setError(data.error || '次数已用完');
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || '处理失败');
      }

      setProcessedImage(data.image);

      // 刷新配额显示
      if (data.quota?.removeBg) {
        updateQuotaAfterRemoveBg(data.quota.removeBg);
      }
    } catch (err: any) {
      console.error('Remove background error:', err);
      setError(err.message || '去除背景失败，请稍后重试');
    } finally {
      setRemovingBg(false);
    }
  }, [user, croppedImage, selectedSize, selectedBg, canRemoveBg, removeBgRemaining, updateQuotaAfterRemoveBg]);

  // ─── 下载单张 ─────────────────────────────────────────────────
  const handleDownload = useCallback(async () => {
    // 未登录 → 弹登录框
    if (!user) {
      openLoginModal('download');
      return;
    }

    const sourceImage = processedImage || croppedImage;
    if (!sourceImage) return;

    setLoading(true);
    try {
      const plan       = user.plan ?? 'free';
      const tier       = OUTPUT_TIERS[plan];
      const outputSize = calcOutputSize(selectedSize, tier.targetMP);

      const img    = await loadImage(sourceImage);
      const canvas = createCanvas(outputSize.width, outputSize.height);
      const ctx    = canvas.getContext('2d')!;

      ctx.fillStyle = selectedBg.hex;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const link = document.createElement('a');
      link.download = `证件照_${selectedSize.name}_${outputSize.width}x${outputSize.height}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.92);
      link.click();
    } catch {
      setError('生成图片失败');
    } finally {
      setLoading(false);
    }
  }, [user, croppedImage, processedImage, selectedSize, selectedBg]);

  // ─── 批量下载（Pro 专属）─────────────────────────────────────
  const handleBatchDownload = useCallback(async () => {
    if (!user) { openLoginModal('download'); return; }

    const sourceImage = processedImage || croppedImage;
    if (!sourceImage) return;
    setBatchLoading(true);
    try {
      await downloadAllSizes(sourceImage, selectedBg);
    } catch {
      setError('批量生成失败，请重试');
    } finally {
      setBatchLoading(false);
    }
  }, [user, croppedImage, processedImage, selectedBg]);

  // ─── 重置 ─────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setCroppedImage(null);
    setProcessedImage(null);
    setStep('upload');
    setError('');
  }, []);

  // ─── 配额展示文案 ─────────────────────────────────────────────
  const quotaBadge = () => {
    if (!user || !quota) return null;
    const { used, limit, credits } = quota.removeBg;
    if (limit === -1) return '无限次';
    const monthlyLeft = Math.max(0, limit - used);
    if (limit === 0) return `积分 ${credits} 次`;
    return `本月剩余 ${monthlyLeft} 次${credits > 0 ? ` + 积分 ${credits} 次` : ''}`;
  };

  const previewImage = processedImage || croppedImage;

  return (
    <main className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      {/* ─── 登录弹窗 ─────────────────────────────────────────── */}
      <LoginModal
        open={loginModal.open}
        scene={loginModal.scene}
        onClose={() => setLoginModal(p => ({ ...p, open: false }))}
        onLogin={(token, userInfo) => login(token, userInfo as any)}
      />

      <div className="max-w-4xl mx-auto">
        {/* ─── Header ─────────────────────────────────────────── */}
        <div className="flex justify-between items-start mb-8">
          <div className="text-center flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">证件照裁剪工具</h1>
            <p className="text-gray-600">上传照片，智能裁剪，一键生成标准证件照</p>
          </div>
          <div className="ml-4">
            <GoogleLogin
              user={user}
              loading={authLoading}
              onLogin={login}
              onLogout={logout}
            />
          </div>
        </div>

        {/* ─── 进度步骤 ────────────────────────────────────────── */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {(['upload', 'crop', 'result'] as const).map((s, index) => {
              const labels  = ['上传照片', '裁剪调整', '下载证件照'];
              const current = ['upload', 'crop', 'result'].indexOf(step);
              const isActive    = index === current;
              const isCompleted = index < current;
              return (
                <div key={s} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    isActive    ? 'bg-blue-600 text-white'  :
                    isCompleted ? 'bg-green-500 text-white' :
                                  'bg-gray-200 text-gray-600'
                  }`}>
                    {isCompleted ? '✓' : index + 1}
                  </div>
                  <span className={`ml-2 text-sm ${
                    isActive    ? 'text-blue-600 font-medium' :
                    isCompleted ? 'text-green-600'            :
                                  'text-gray-500'
                  }`}>
                    {labels[index]}
                  </span>
                  {index < 2 && <div className="w-8 h-px bg-gray-300 mx-4" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── 主内容区 ────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6">
            {/* Step 1: 上传 */}
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

            {/* Step 2: 裁剪 */}
            {step === 'crop' && uploadedImage && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <ImageCropper src={uploadedImage} sizePreset={selectedSize} onCrop={handleCrop} />
                </div>
                <div className="space-y-6">
                  <SizeSelector selectedId={selectedSize.id} onSelect={setSelectedSize} />
                  <button
                    onClick={handleReset}
                    className="w-full py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    重新上传
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: 结果 */}
            {step === 'result' && previewImage && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 左：预览 */}
                <div className="lg:col-span-2">
                  <div
                    className="rounded-lg p-4 flex items-center justify-center"
                    style={{ backgroundColor: processedImage ? selectedBg.hex : '#f3f4f6' }}
                  >
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
                      {loading ? '生成中...' : !user ? '登录后下载 🔒' : '下载证件照'}
                    </button>
                  </div>

                  {/* 批量下载（所有登录用户均可，Pro 解锁更多尺寸后续扩展） */}
                  <button
                    onClick={handleBatchDownload}
                    disabled={batchLoading || loading}
                    className="w-full mt-2 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {batchLoading
                      ? <span className="flex items-center justify-center gap-2">
                          <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                          正在生成全套尺寸...
                        </span>
                      : !user ? '登录后批量下载 🔒' : '📦 下载全部尺寸（ZIP）'}
                  </button>
                </div>

                {/* 右：操作面板 */}
                <div className="space-y-4">
                  {/* 当前设置 */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">当前设置</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">尺寸</span>
                        <span className="font-medium">{selectedSize.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">像素</span>
                        <span className="font-medium">
                          {(() => {
                            const plan = user?.plan ?? 'guest';
                            const tier = OUTPUT_TIERS[plan];
                            const s    = calcOutputSize(selectedSize, tier.targetMP);
                            return `${s.width}×${s.height}`;
                          })()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">背景</span>
                        <span className="font-medium">{processedImage ? '✓ 已抠图' : '纯色背景'}</span>
                      </div>
                    </div>
                  </div>

                  {/* AI 抠图卡片 */}
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="text-sm font-medium text-blue-900">AI 智能抠图</h3>
                      {/* 配额徽章 */}
                      {user && (
                        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                          {quotaBadge()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-blue-700 mb-3">
                      {user
                        ? '自动去除原背景，替换为纯色证件照背景'
                        : '登录后可免费获得 3 次 AI 抠图额度'}
                    </p>
                    <button
                      onClick={removeBackground}
                      disabled={removingBg || !!processedImage || (!!user && !canRemoveBg())}
                      className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {removingBg
                        ? <span className="flex items-center justify-center gap-2">
                            <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                            处理中...
                          </span>
                        : processedImage     ? '✓ 已完成抠图'
                        : !user              ? '🔒 登录后使用'
                        : !canRemoveBg()     ? '次数已用完，购买积分包'
                        :                      '🪄 一键去除背景'}
                    </button>

                    {/* 配额耗尽时的升级引导 */}
                    {user && !canRemoveBg() && (
                      <p className="mt-2 text-xs text-center text-blue-700">
                        <a href="/pricing" className="underline hover:text-blue-900">查看积分包 / 升级订阅 →</a>
                      </p>
                    )}
                  </div>

                  <BackgroundSelector selectedId={selectedBg.id} onSelect={setSelectedBg} />

                  <button
                    onClick={handleReset}
                    className="w-full py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    制作新证件照
                  </button>
                </div>
              </div>
            )}

            {/* 错误提示 */}
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <span className="text-red-500 mt-0.5">⚠</span>
                <p className="text-red-600 text-sm">{error}</p>
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
