'use client';

import { useEffect, useRef } from 'react';
import { User, WORKER_URL } from '@/lib/auth';

const GOOGLE_CLIENT_ID = '624931143932-k6lq1k4up4nd98qb21ptfc9h7th7k07b.apps.googleusercontent.com';

interface Props {
  user: User | null;
  loading: boolean;
  onLogin: (token: string, user: User) => void;
  onLogout: () => void;
  onOpenDrawer?: () => void;
}

export default function GoogleLogin({ user, loading, onLogin, onLogout, onOpenDrawer }: Props) {
  const btnRef = useRef<HTMLDivElement>(null);
  // 用 ref 持有最新的 onLogin，避免 useEffect 闭包捕获旧值
  const onLoginRef = useRef(onLogin);
  useEffect(() => { onLoginRef.current = onLogin; }, [onLogin]);

  useEffect(() => {
    // 已登录或还在加载中，不挂载 Google 按钮
    if (user || loading) return;

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
            }
          } catch (err) {
            console.error('Login error:', err);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      // @ts-ignore
      window.google?.accounts.id.renderButton(btnRef.current, {
        theme: 'outline',
        size: 'medium',
        width: 180,
        text: 'signin_with',
        shape: 'rectangular',
      });
    };

    const scriptId = 'gsi-script';
    if (document.getElementById(scriptId)) {
      // 脚本已存在，等下一帧确保 DOM 就绪
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
  }, [user, loading]);

  if (loading) {
    return <div className="w-36 h-9 bg-gray-100 animate-pulse rounded-lg" />;
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <img
          src={user.avatar}
          alt={user.name}
          className="w-8 h-8 rounded-full border border-gray-200 cursor-pointer hover:ring-2 hover:ring-blue-400 transition"
          onClick={onOpenDrawer}
          title="个人中心"
        />
        <div className="hidden sm:block text-sm">
          <div className="font-medium text-gray-800 leading-tight">{user.name}</div>
          <div className="text-xs text-gray-400">
            {user.plan === 'pro' ? 'Pro' : user.plan === 'basic' ? '基础版' : '免费版'}
          </div>
        </div>
        <button
          onClick={onLogout}
          className="ml-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition"
        >
          退出
        </button>
      </div>
    );
  }

  // 未登录：挂载点，Google SDK 会往这里注入按钮
  return <div ref={btnRef} id="header-login-btn" />;
}
