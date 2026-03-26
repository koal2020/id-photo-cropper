'use client';

import { useEffect, useRef } from 'react';
import { WORKER_URL, User } from '@/lib/auth';

const GOOGLE_CLIENT_ID = '624931143932-k6lq1k4up4nd98qb21ptfc9h7th7k07b.apps.googleusercontent.com';

interface Props {
  open: boolean;
  onClose: () => void;
  onLogin: (token: string, user: User) => void;
  scene?: 'download' | 'removeBg';
}

export default function LoginModal({ open, onClose, onLogin, scene = 'removeBg' }: Props) {
  const btnRef    = useRef<HTMLDivElement>(null);
  const onLoginRef = useRef(onLogin);
  useEffect(() => { onLoginRef.current = onLogin; }, [onLogin]);

  useEffect(() => {
    if (!open) return;

    const renderBtn = () => {
      if (!btnRef.current) return;
      // @ts-ignore
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response: any) => {
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
              onLoginRef.current(data.token, data.user);
              onClose();
            }
          } catch (err) {
            console.error('Login error:', err);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: false,
      });
      // @ts-ignore
      window.google?.accounts.id.renderButton(btnRef.current, {
        theme: 'outline',
        size: 'large',
        width: 280,
        text: 'signin_with',
        shape: 'rectangular',
      });
    };

    const scriptId = 'gsi-script';
    if (document.getElementById(scriptId)) {
      requestAnimationFrame(renderBtn);
    } else {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = renderBtn;
      document.body.appendChild(script);
    }
  }, [open]);

  if (!open) return null;

  const copy = scene === 'download'
    ? { title: '登录后即可下载高清证件照', sub: '注册免费获得 5 次高清下载 + 3 次 AI 抠图额度' }
    : { title: '登录后即可使用 AI 智能抠图', sub: '注册免费获得 3 次 AI 抠图额度，永不过期' };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 px-6 pt-8 pb-6 text-white text-center">
          <div className="text-4xl mb-3">🪄</div>
          <h2 className="text-lg font-semibold leading-snug">{copy.title}</h2>
          <p className="text-blue-100 text-sm mt-2">{copy.sub}</p>
        </div>

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

        <div className="px-6 pb-6 flex flex-col items-center gap-3">
          <div ref={btnRef} />
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
