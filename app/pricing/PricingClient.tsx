'use client';

import { useState } from 'react';
import { PRICING_PLANS, CREDIT_PACKS, PLAN_QUOTA, OUTPUT_TIERS } from '@/lib/config';

// ─── 功能对比数据 ─────────────────────────────────────────────────
const FEATURES = [
  {
    label: '高清下载',
    free:  '5 次/月',
    basic: '无限次',
    pro:   '无限次',
  },
  {
    label: 'AI 智能抠图',
    free:  '积分制（注册送 3 次）',
    basic: '15 次/月',
    pro:   '50 次/月',
  },
  {
    label: '输出分辨率',
    free:  '1MP 标准',
    basic: '3MP 高清',
    pro:   '5MP 超清',
  },
  {
    label: '批量下载 ZIP',
    free:  false,
    basic: false,
    pro:   true,
  },
  {
    label: '历史记录',
    free:  '最近 10 条',
    basic: '最近 50 条',
    pro:   '无限',
  },
  {
    label: '积分包叠加',
    free:  true,
    basic: true,
    pro:   true,
  },
];

// ─── FAQ 数据 ─────────────────────────────────────────────────────
const FAQS = [
  {
    q: '免费用户每月能用多少次？',
    a: '注册登录后每月免费获得 5 次高清下载。AI 抠图功能采用积分制，注册时一次性赠送 3 次，用完后需购买积分包或升级订阅。',
  },
  {
    q: '注册赠送的 3 次抠图会过期吗？',
    a: '不会过期。注册赠送的 3 次积分永久有效，购买的积分包同样永不过期，可以放心慢慢用。',
  },
  {
    q: '积分包和订阅有什么区别？',
    a: '积分包按次购买、永不过期，适合偶尔有需求的用户；订阅每月自动续费，享有月度配额重置，适合频繁使用的用户。两者可以叠加：月度配额用完后自动消耗积分余额。',
  },
  {
    q: '月度配额什么时候重置？',
    a: '每月 1 日 00:00（UTC）自动重置，未使用的月度配额不会累积到下月。积分余额不受影响，永久保留。',
  },
  {
    q: '图片会上传到服务器保存吗？',
    a: '不会。裁剪、调整等操作完全在浏览器本地完成，不上传任何图片。只有使用 AI 抠图时，图片会临时传输到 API 处理，处理完成后立即丢弃，不做任何存储。',
  },
  {
    q: '支持哪些支付方式？',
    a: '目前支持 PayPal 国际支付（即将上线）。如有其他支付需求，欢迎联系我们。',
  },
  {
    q: '订阅可以随时取消吗？',
    a: '可以随时取消，取消后当前计费周期内仍可正常使用所有功能，到期后自动降回免费版。',
  },
  {
    q: '升级后可以立即使用吗？',
    a: '是的，支付成功后配额立即生效，无需等待或刷新。',
  },
];

// ─── 单元格渲染 ───────────────────────────────────────────────────
function Cell({ value }: { value: string | boolean }) {
  if (value === true)  return <span className="text-green-500 text-lg">✓</span>;
  if (value === false) return <span className="text-gray-300 text-lg">—</span>;
  return <span className="text-sm text-gray-700">{value}</span>;
}

// ─── FAQ 折叠项 ───────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-4 text-left gap-4"
      >
        <span className="text-sm font-medium text-gray-800">{q}</span>
        <span className={`text-gray-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>
      {open && (
        <p className="pb-4 text-sm text-gray-500 leading-relaxed">{a}</p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
export default function PricingClient() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly');

  return (
    <main className="min-h-screen bg-gray-50">

      {/* ── 顶部导航 ─────────────────────────────────────────── */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <a href="/" className="text-sm text-gray-500 hover:text-gray-800 transition flex items-center gap-1">
            ← 返回工具
          </a>
          <span className="text-sm font-semibold text-gray-800">证件照裁剪工具</span>
          <div className="w-16" />
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-12">

        {/* ── Hero ─────────────────────────────────────────────── */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">选择适合你的方案</h1>
          <p className="text-gray-500 text-base">
            注册即免费使用，无需信用卡。升级解锁更多次数和更高分辨率。
          </p>

          {/* 月付 / 年付切换 */}
          <div className="inline-flex items-center mt-6 bg-gray-100 rounded-full p-1 gap-1">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                billing === 'monthly' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              月付
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition flex items-center gap-1.5 ${
                billing === 'yearly' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              年付
              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">
                省 33%+
              </span>
            </button>
          </div>
        </div>

        {/* ── 套餐卡片 ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {PRICING_PLANS.map(plan => {
            const price  = billing === 'yearly' ? plan.yearlyMonthEquiv : plan.monthlyPriceCNY;
            const total  = billing === 'yearly' ? plan.yearlyPriceCNY   : null;
            const isFree = plan.id === 'free';
            const quota  = PLAN_QUOTA[plan.plan];
            const tier   = OUTPUT_TIERS[plan.plan];

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl border-2 p-6 flex flex-col transition-shadow hover:shadow-lg ${
                  plan.highlight ? 'border-blue-500 shadow-blue-100 shadow-md' : 'border-gray-200'
                }`}
              >
                {plan.badge && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                    plan.highlight ? 'bg-blue-500 text-white' : 'bg-gray-700 text-white'
                  }`}>
                    {plan.badge}
                  </div>
                )}

                <div className="mb-4">
                  <h2 className="text-lg font-bold text-gray-900">{plan.name}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {isFree ? '永久免费，无需信用卡' : plan.id === 'pro' ? '适合频繁使用的用户' : '轻度使用的最佳选择'}
                  </p>
                </div>

                <div className="mb-6">
                  {isFree ? (
                    <div className="text-4xl font-bold text-gray-900">¥0</div>
                  ) : (
                    <>
                      <div className="flex items-end gap-1">
                        <span className="text-4xl font-bold text-gray-900">
                          ¥{price % 1 === 0 ? price : price.toFixed(1)}
                        </span>
                        <span className="text-gray-400 text-sm mb-1">/月</span>
                      </div>
                      {billing === 'yearly' && total && (
                        <p className="text-xs text-gray-400 mt-1">
                          按年付 ¥{total}，
                          <span className="text-green-600 font-medium">
                            比月付省 ¥{(plan.monthlyPriceCNY * 12 - total).toFixed(0)}
                          </span>
                        </p>
                      )}
                      {billing === 'monthly' && (
                        <p className="text-xs text-gray-400 mt-1">
                          年付仅 ¥{plan.yearlyMonthEquiv.toFixed(1)}/月
                        </p>
                      )}
                    </>
                  )}
                </div>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {[
                    quota.monthlyDownloads === -1 ? '无限次高清下载' : `${quota.monthlyDownloads} 次高清下载/月`,
                    isFree ? '注册送 3 次 AI 抠图（积分）' : `${quota.monthlyRemoveBg} 次 AI 抠图/月`,
                    `${tier.label} 输出`,
                    quota.batchDownload ? '批量下载全套尺寸 ZIP' : null,
                    quota.historyLimit === -1 ? '无限历史记录' : `最近 ${quota.historyLimit} 条历史记录`,
                    '积分包可叠加使用',
                  ].filter(Boolean).map(item => (
                    <li key={item as string} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-green-500 shrink-0 mt-0.5">✓</span>
                      <span>{item as string}</span>
                    </li>
                  ))}
                </ul>

                <button
                  disabled={isFree}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition ${
                    isFree
                      ? 'bg-gray-100 text-gray-400 cursor-default'
                      : plan.highlight
                        ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                        : 'bg-gray-900 text-white hover:bg-gray-700 active:scale-95'
                  }`}
                  onClick={() => { if (!isFree) alert('支付功能即将上线，敬请期待！'); }}
                >
                  {isFree ? '免费使用' : `升级${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>

        {/* ── 功能对比表 ───────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-12">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-800">功能详细对比</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-1/2">功能</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">免费</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">基础版</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-blue-600 uppercase tracking-wide">Pro</th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((f, i) => (
                  <tr key={f.label} className={i % 2 === 0 ? 'bg-gray-50/50' : ''}>
                    <td className="px-6 py-3.5 text-sm text-gray-700">{f.label}</td>
                    <td className="px-4 py-3.5 text-center"><Cell value={f.free} /></td>
                    <td className="px-4 py-3.5 text-center"><Cell value={f.basic} /></td>
                    <td className="px-4 py-3.5 text-center"><Cell value={f.pro} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 积分包 ───────────────────────────────────────────── */}
        <div id="credits" className="mb-12">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">积分包</h2>
            <p className="text-gray-500 text-sm mt-1">按次购买，永不过期，可叠加在任意套餐上</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {CREDIT_PACKS.map(pack => (
              <div
                key={pack.id}
                className={`bg-white rounded-xl border-2 p-5 flex flex-col items-center text-center transition hover:shadow-md ${
                  pack.badge === '推荐' ? 'border-blue-400' : 'border-gray-200'
                }`}
              >
                {pack.badge && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mb-3 ${
                    pack.badge === '推荐'   ? 'bg-blue-100 text-blue-700'   :
                    pack.badge === '最划算' ? 'bg-green-100 text-green-700' :
                                              'bg-gray-100 text-gray-600'
                  }`}>
                    {pack.badge}
                  </span>
                )}
                <div className="text-3xl font-bold text-gray-900 mb-1">{pack.credits} 次</div>
                <div className="text-2xl font-semibold text-blue-600 mb-1">¥{pack.priceCNY}</div>
                <div className="text-xs text-gray-400 mb-4">¥{pack.perCreditCNY.toFixed(2)}/次</div>
                <button
                  className="w-full py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition active:scale-95"
                  onClick={() => alert('支付功能即将上线，敬请期待！')}
                >
                  立即购买
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── FAQ ──────────────────────────────────────────────── */}
        <div className="max-w-2xl mx-auto mb-12">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-6">常见问题</h2>
          <div className="bg-white rounded-2xl border border-gray-200 px-6 divide-y divide-gray-100">
            {FAQS.map(faq => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>

        {/* ── 底部 CTA ─────────────────────────────────────────── */}
        <div className="text-center bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl px-6 py-10 text-white">
          <h2 className="text-2xl font-bold mb-2">立即开始，免费使用</h2>
          <p className="text-blue-200 text-sm mb-6">注册即送 3 次 AI 抠图额度，无需信用卡</p>
          <a
            href="/"
            className="inline-block px-8 py-3 bg-white text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition active:scale-95"
          >
            免费制作证件照 →
          </a>
        </div>

      </div>

      <footer className="text-center text-xs text-gray-400 py-8">
        <p>图片仅在浏览器本地处理，不上传存储 · AI 抠图通过 remove.bg API 处理</p>
      </footer>
    </main>
  );
}
