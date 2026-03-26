'use client';

// ─────────────────────────────────────────────────────────────────
// components/LoginModal.tsx — 登录引导弹窗
// 触发时机：未登录用户点击「下载」或「AI 抠图」
// ─────────────────────────────────────────────────────────────────
import { useEffect } from 'react';
import { WORKER_URL } from '@/lib/auth';
import { User } from '@/lib/auth';

const GOOGLE_CLIENT_ID = '624931143932-k6lq1k4up4nd98qb21ptfc9h7th7k07b.apps.googleusercontent.com';

interface Props {
  open: boolean;
  onClose: () => void;
  /** 登录成功回调 */
  onLogin: (token: string, user: User) => void;
  /** 触发登录的场景，决定文案 */
  scene?: 'download' | 'removeBg';
}

export default function LoginModal({ open, onClose, onLogin, scene = 'removeBg' }: Props) {

  // 加载 Google Identity Services 并渲染按钮
  useEffect(() => {
    if (!open) return;

    const scriptId = 'gsi-script';
    const existing = document.getElementById(scriptId);

    const init = () => {
      // @ts-ignore
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredential,
        auto_select: false,
        cancel_on_tap_outside: false,
      });
      // @ts-ignore
      window.google?.accounts.id.renderButton(
        document.getElementById('login-modal-btn'),
        { theme: 'outline', size: 'large', width: 280, text: 'signin_with', shape: 'rectangular' }
      );
    };

    if (existing) {
      init();
    } else {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = init;
      document.body.appendChild(script);
    }
  }, [open]);

  const handleCredential = async (response: any) => {
    try {
      const res = await fetch(`${WORKER_URL}/api/auth/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (data.success) {
        // @ts-ignore
        window.google?.accounts.id.cancel();
        onLogin(data.token, data.user);
        onClose();
      }
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  if (!open) return null;

  const copy = scene === 'download'
    ? { title: '登录后即可下载高清证件照', sub: '注册免费获得 5 次高清下载 + 3 次 AI 抠图额度' }
    : { title: '登录后即可使用 AI 智能抠图', sub: '注册免费获得 3 次 AI 抠图额度，永不过期' };

  return (
    /* 遮罩层 */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* 顶部色块 */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 px-6 pt-8 pb-6 text-white text-center">
          <div className="text-4xl mb-3">🪄</div>
          <h2 className="text-lg font-semibold leading-snug">{copy.title}</h2>
          <p className="text-blue-100 text-sm mt-2">{copy.sub}</p>
        </div>

        {/* 权益列表 */}
        <div className="px-6 py-5 space-y-3">
          {[
            { icon: '🎁', text: '注册立送 3 次 AI 抠图额度' },
            { icon: '📥', text: '每月 5 次高清证件照下载' },
            { icon: '🔒', text: '图片仅在浏览器本地处理，不上传存储' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3 text-sm text-gray-700">
              <span className="text-lg">{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>

        {/* Google 登录按钮 */}
        <div className="px-6 pb-6 flex flex-col items-center gap-3">
          <div id="login-modal-btn" />
          <button
            onClick={onClose}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            暂不登录
          </button>
        </div>
      </div>
    </div>
  );
}
