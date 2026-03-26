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
  const onLoginRef = useRef(onLogin);
  useEffect(() => { onLoginRef.current = onLogin; }, [onLogin]);

  // Google 脚本只加载一次
  useEffect(() => {
    const scriptId = 'gsi-script';
    if (document.getElementById(scriptId)) return;
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }, []);

  // 未登录且不在 loading 时，渲染 Google 按钮
  // 用独立 useEffect，在 DOM 更新后执行
  useEffect(() => {
    // 只在：未登录 + 不在加载中 时挂载按钮
    if (user || loading) return;

    const tryRender = () => {
      const el = document.getElementById('header-login-btn');
      if (!el) return;

      // @ts-ignore
      const google = window.google;
      if (!google) {
        // 脚本还没加载完，等 500ms 再试
        setTimeout(tryRender, 500);
        return;
      }

      google.accounts.id.initialize({
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
              google.accounts.id.cancel();
              onLoginRef.current(data.token, data.user);
            }
          } catch (err) {
            console.error('Login error:', err);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      google.accounts.id.renderButton(el, {
        theme: 'outline',
        size: 'medium',
        width: 180,
        text: 'signin_with',
        shape: 'rectangular',
      });
    };

    // 等 React DOM commit 完成后再执行
    setTimeout(tryRender, 100);
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

  return <div id="header-login-btn" />;
}
