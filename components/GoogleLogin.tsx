'use client';

// ─────────────────────────────────────────────────────────────────
// components/GoogleLogin.tsx — Header 右上角用户状态组件
// 已登录：显示头像 + 姓名 + 配额徽章，点击头像打开个人中心（后续）
// 未登录：渲染 Google 登录按钮
// ─────────────────────────────────────────────────────────────────
import { useEffect } from 'react';
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

  // 未登录时挂载 Google 按钮
  useEffect(() => {
    if (user || loading) return;

    const scriptId = 'gsi-script';
    const init = () => {
      // @ts-ignore
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      // @ts-ignore
      window.google?.accounts.id.renderButton(
        document.getElementById('header-login-btn'),
        { theme: 'outline', size: 'medium', width: 180, text: 'signin_with', shape: 'rectangular' }
      );
    };

    if (document.getElementById(scriptId)) {
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
  }, [user, loading]);

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
      }
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  if (loading) {
    return <div className="w-32 h-9 bg-gray-100 animate-pulse rounded-lg" />;
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
          <div className="text-xs text-gray-400 capitalize">{user.plan === 'free' ? '免费版' : user.plan === 'basic' ? '基础版' : 'Pro'}</div>
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
