'use client';

// ─────────────────────────────────────────────────────────────────
// components/UserDrawer.tsx — 个人中心侧滑抽屉
// 点击头像触发，展示：用户信息、配额进度、操作历史、升级入口
// ─────────────────────────────────────────────────────────────────
import { useEffect, useState, useCallback } from 'react';
import { User, QuotaState, WORKER_URL, authHeaders } from '@/lib/auth';
import { PLAN_QUOTA, PRICING_PLANS } from '@/lib/config';

interface HistoryItem {
  id: number;
  action: 'download' | 'remove_bg' | 'batch_download';
  size_preset: string | null;
  bg_color: string | null;
  used_credit: number;
  created_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  user: User;
  quota: QuotaState | null;
  onLogout: () => void;
}

// ─── 工具：相对时间 ───────────────────────────────────────────────
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return '刚刚';
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} 天前`;
  return new Date(iso).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

// ─── 工具：操作类型文案 ───────────────────────────────────────────
const ACTION_LABEL: Record<string, string> = {
  download:       '下载证件照',
  remove_bg:      'AI 智能抠图',
  batch_download: '批量下载 ZIP',
};

const ACTION_ICON: Record<string, string> = {
  download:       '📥',
  remove_bg:      '🪄',
  batch_download: '📦',
};

const SIZE_LABEL: Record<string, string> = {
  'id-1':    '一寸照',
  'id-2':    '二寸照',
  passport:  '护照',
  avatar:    '微信头像',
};

const BG_LABEL: Record<string, string> = {
  '#ffffff': '白底',
  '#3b82f6': '蓝底',
  '#ef4444': '红底',
};

// ─── 配额进度条 ───────────────────────────────────────────────────
function QuotaBar({ used, limit, label }: { used: number; limit: number; label: string }) {
  if (limit === -1) {
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>{label}</span>
          <span className="text-green-600 font-medium">无限次</span>
        </div>
        <div className="h-1.5 bg-green-100 rounded-full">
          <div className="h-full bg-green-400 rounded-full w-full" />
        </div>
      </div>
    );
  }

  if (limit === 0) return null; // 纯积分制，不显示进度条

  const pct     = Math.min(used / limit, 1);
  const left    = Math.max(limit - used, 0);
  const isLow   = left <= Math.ceil(limit * 0.2);
  const barColor = pct >= 1 ? 'bg-red-400' : isLow ? 'bg-amber-400' : 'bg-blue-500';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{label}</span>
        <span className={pct >= 1 ? 'text-red-500 font-medium' : isLow ? 'text-amber-600 font-medium' : ''}>
          {left} / {limit} 次剩余
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
export default function UserDrawer({ open, onClose, user, quota, onLogout }: Props) {
  const [history,      setHistory]      = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // 打开时拉取历史记录
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/user/history?limit=10`, {
        headers: authHeaders() as HeadersInit,
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch { /* 静默失败 */ }
    finally { setHistoryLoading(false); }
  }, []);

  useEffect(() => {
    if (open) fetchHistory();
  }, [open, fetchHistory]);

  // ESC 关闭
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // 锁定 body 滚动
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const planLabel = ({ free: '免费版', basic: '基础版', pro: 'Pro' } as Record<string, string>)[user.plan] ?? '免费版';
  const isPro     = user.plan === 'pro';
  const isBasic   = user.plan === 'basic';
  const isFree    = user.plan === 'free';

  // 下月重置日期
  const resetDate = quota
    ? new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
        .toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
    : '';

  return (
    <>
      {/* 遮罩 */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* 抽屉主体 */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-white shadow-2xl
          flex flex-col transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* ── 顶部：用户信息 ─────────────────────────────────── */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 px-5 pt-5 pb-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium opacity-80">我的账户</span>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/20 transition"
              aria-label="关闭"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center gap-3">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-12 h-12 rounded-full border-2 border-white/50"
            />
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{user.name}</div>
              <div className="text-blue-200 text-xs truncate">{user.email}</div>
            </div>
            {/* 套餐徽章 */}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
              isPro   ? 'bg-yellow-400 text-yellow-900' :
              isBasic ? 'bg-blue-300 text-blue-900'    :
                        'bg-white/20 text-white'
            }`}>
              {planLabel}
            </span>
          </div>
        </div>

        {/* ── 滚动内容区 ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* ── 配额使用情况 ─────────────────────────────────── */}
          <section className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              本月用量
            </h3>

            <div className="space-y-3">
              {/* 下载配额 */}
              <QuotaBar
                label="高清下载"
                used={user.monthlyDownloads}
                limit={PLAN_QUOTA[user.plan].monthlyDownloads}
              />

              {/* AI 抠图配额 */}
              {PLAN_QUOTA[user.plan].monthlyRemoveBg !== 0 && (
                <QuotaBar
                  label="AI 智能抠图"
                  used={user.monthlyRemoveBg}
                  limit={PLAN_QUOTA[user.plan].monthlyRemoveBg}
                />
              )}

              {/* 积分余额 */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">积分余额</span>
                <span className={`font-semibold ${user.credits > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                  {user.credits} 次
                </span>
              </div>
            </div>

            {/* 重置提示 */}
            {resetDate && (
              <p className="mt-3 text-xs text-gray-400">
                月度配额将于 {resetDate} 重置
              </p>
            )}
          </section>

          {/* ── 升级引导（非 Pro 用户显示）────────────────────── */}
          {!isPro && (
            <section className="px-5 py-4 border-b border-gray-100">
              <div className={`rounded-xl p-4 ${isBasic ? 'bg-blue-50 border border-blue-200' : 'bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200'}`}>
                {isFree && (
                  <>
                    <div className="text-sm font-semibold text-gray-800 mb-1">
                      🚀 升级基础版，每月 15 次抠图
                    </div>
                    <div className="text-xs text-gray-500 mb-3">
                      ¥9.9/月 · 无限下载 · 3MP 高清输出
                    </div>
                    <a
                      href="/pricing"
                      className="block w-full text-center py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
                    >
                      查看套餐方案 →
                    </a>
                  </>
                )}
                {isBasic && (
                  <>
                    <div className="text-sm font-semibold text-gray-800 mb-1">
                      ⚡ 升级 Pro，每月 50 次抠图
                    </div>
                    <div className="text-xs text-gray-500 mb-3">
                      ¥19.9/月 · 5MP 超清 · 批量下载 ZIP
                    </div>
                    <a
                      href="/pricing"
                      className="block w-full text-center py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
                    >
                      升级到 Pro →
                    </a>
                  </>
                )}
              </div>

              {/* 积分包快捷入口 */}
              <a
                href="/pricing#credits"
                className="mt-2 flex items-center justify-between text-xs text-gray-500 hover:text-blue-600 transition py-1"
              >
                <span>💳 购买积分包（永不过期）</span>
                <span>→</span>
              </a>
            </section>
          )}

          {/* ── 最近操作历史 ─────────────────────────────────── */}
          <section className="px-5 py-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              最近操作
            </h3>

            {historyLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <div className="text-3xl mb-2">📋</div>
                <p className="text-sm">暂无操作记录</p>
              </div>
            ) : (
              <div className="space-y-1">
                {history.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition"
                  >
                    <span className="text-lg shrink-0">
                      {ACTION_ICON[item.action] ?? '📄'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-700 font-medium">
                        {ACTION_LABEL[item.action] ?? item.action}
                      </div>
                      <div className="text-xs text-gray-400 flex items-center gap-1.5">
                        {item.size_preset && (
                          <span>{SIZE_LABEL[item.size_preset] ?? item.size_preset}</span>
                        )}
                        {item.size_preset && item.bg_color && <span>·</span>}
                        {item.bg_color && (
                          <span className="flex items-center gap-1">
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-full border border-gray-200"
                              style={{ backgroundColor: item.bg_color }}
                            />
                            {BG_LABEL[item.bg_color] ?? item.bg_color}
                          </span>
                        )}
                        {item.used_credit === 1 && (
                          <span className="text-amber-500">· 消耗积分</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">
                      {relativeTime(item.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ── 底部：退出登录 ─────────────────────────────────── */}
        <div className="px-5 py-4 border-t border-gray-100">
          <button
            onClick={() => { onLogout(); onClose(); }}
            className="w-full py-2.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-700 transition"
          >
            退出登录
          </button>
        </div>
      </div>
    </>
  );
}
