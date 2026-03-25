'use client';

import { useEffect, useState } from 'react';

interface User {
  id: number;
  email: string;
  name: string;
  avatar: string;
}

export default function GoogleLogin() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const WORKER_URL = 'https://id-photo-cropper-worker.hanbsong94.workers.dev';
  const GOOGLE_CLIENT_ID = '624931143932-k6lq1k4up4nd98qb21ptfc9h7th7k07b.apps.googleusercontent.com';

  // 检查是否已登录
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      fetchUserInfo(token);
    } else {
      setLoading(false);
    }
  }, []);

  // 加载 Google Identity Services
  useEffect(() => {
    if (user) return; // 已登录不加载

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      // @ts-ignore
      if (window.google) {
        // @ts-ignore
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        // @ts-ignore
        window.google.accounts.id.renderButton(
          document.getElementById('google-login-button'),
          { 
            theme: 'outline', 
            size: 'large',
            width: 250,
            text: 'signin_with',
            shape: 'rectangular',
          }
        );
      }
    };

    return () => {
      document.body.removeChild(script);
    };
  }, [user]);

  const handleCredentialResponse = async (response: any) => {
    try {
      const res = await fetch(`${WORKER_URL}/api/auth/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });

      const data = await res.json();
      
      if (data.success) {
        localStorage.setItem('auth_token', data.token);
        setUser(data.user);
        // @ts-ignore
        window.google?.accounts.id.cancel();
      } else {
        alert('登录失败：' + data.error);
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('登录出错，请重试');
    }
  };

  const fetchUserInfo = async (token: string) => {
    try {
      const res = await fetch(`${WORKER_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        // Token 无效，清除
        localStorage.removeItem('auth_token');
      }
    } catch (error) {
      console.error('Fetch user error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    // 重新加载页面以重新渲染 Google 按钮
    window.location.reload();
  };

  if (loading) {
    return <div className="text-sm text-gray-500">加载中...</div>;
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <img 
          src={user.avatar} 
          alt={user.name} 
          className="w-8 h-8 rounded-full border"
        />
        <div className="text-sm">
          <div className="font-medium">{user.name}</div>
          <div className="text-gray-500 text-xs">{user.email}</div>
        </div>
        <button
          onClick={handleLogout}
          className="ml-2 px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition"
        >
          退出
        </button>
      </div>
    );
  }

  return (
    <div>
      <div id="google-login-button"></div>
    </div>
  );
}
