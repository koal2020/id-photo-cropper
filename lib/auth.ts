// ─────────────────────────────────────────────────────────────────
// lib/auth.ts — 用户认证状态管理
// 统一管理 token 存储、用户信息获取、配额状态
// ─────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { UserPlan } from './config';

export const WORKER_URL = 'https://id-photo-cropper-worker.hanbsong94.workers.dev';
const TOKEN_KEY = 'auth_token';

export interface User {
  id: number;
  email: string;
  name: string;
  avatar: string;
  plan: UserPlan;
  planExpiresAt: string | null;
  // 积分余额（注册赠3次 + 购买积分包）
  credits: number;
  // 本月已用次数
  monthlyDownloads: number;
  monthlyRemoveBg: number;
  quotaResetAt: string;
}

export interface QuotaState {
  removeBg: {
    used: number;
    limit: number;   // -1 = 无限；0 = 纯积分制
    credits: number; // 积分余额
  };
  downloads: {
    used: number;
    limit: number;
  };
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── 核心 Hook ────────────────────────────────────────────────────
export function useAuth() {
  const [user, setUser]       = useState<User | null>(null);
  const [quota, setQuota]     = useState<QuotaState | null>(null);
  const [loading, setLoading] = useState(true);

  // 从 /api/user/profile 拉取完整用户+配额信息
  const fetchProfile = useCallback(async (token?: string) => {
    const t = token || getToken();
    if (!t) { setLoading(false); return; }

    try {
      const res = await fetch(`${WORKER_URL}/api/user/profile`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) { clearToken(); setUser(null); setQuota(null); return; }

      const data = await res.json();
      setUser(data.user);
      setQuota(data.quota);
    } catch {
      // 网络错误：保留 token，不强制登出
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // 登录成功后调用（保存 token + 刷新状态）
  const login = useCallback((token: string, userInfo: User) => {
    setToken(token);
    setUser(userInfo);
    fetchProfile(token);
  }, [fetchProfile]);

  // 登出
  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setQuota(null);
  }, []);

  // 抠图成功后刷新配额（Worker 已返回最新配额，直接更新）
  const updateQuotaAfterRemoveBg = useCallback((newQuota: QuotaState['removeBg']) => {
    setQuota(prev => prev ? { ...prev, removeBg: newQuota } : null);
    setUser(prev => prev ? {
      ...prev,
      monthlyRemoveBg: newQuota.used,
      credits: newQuota.credits,
    } : null);
  }, []);

  // 判断是否还能用 AI 抠图
  const canRemoveBg = useCallback((): boolean => {
    if (!user || !quota) return false;
    const { used, limit, credits } = quota.removeBg;
    if (limit === -1) return true;           // 无限
    if (limit > 0 && used < limit) return true; // 月度未耗尽
    return credits > 0;                      // 靠积分
  }, [user, quota]);

  // 剩余可用次数（月度 + 积分合计，-1 = 无限）
  const removeBgRemaining = useCallback((): number => {
    if (!quota) return 0;
    const { used, limit, credits } = quota.removeBg;
    if (limit === -1) return -1;
    const monthlyLeft = Math.max(0, limit - used);
    return monthlyLeft + credits;
  }, [quota]);

  return {
    user,
    quota,
    loading,
    login,
    logout,
    fetchProfile,
    updateQuotaAfterRemoveBg,
    canRemoveBg,
    removeBgRemaining,
  };
}
