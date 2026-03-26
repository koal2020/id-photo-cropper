// ═══════════════════════════════════════════════════════════════════
// Cloudflare Worker — ID Photo Cropper 后端
// 负责：Google OAuth、JWT、配额校验、remove.bg 代理、用户中心 API
// ═══════════════════════════════════════════════════════════════════
import jwt from '@tsndr/cloudflare-worker-jwt';

// ─── remove.bg size 参数（按用户 plan）───────────────────────────
const REMOVE_BG_SIZE = {
  free:  'preview',   // 0.2 积分 ≈ ¥0.026/次
  basic: 'preview',   // 同上，Canvas 端负责放大到 3MP
  pro:   'regular',   // 1 积分 ≈ ¥0.128/次，原图质量
};

// ─── 月度配额上限 ─────────────────────────────────────────────────
const MONTHLY_QUOTA = {
  free:  { downloads: 5,  removeBg: 0  },  // removeBg 靠积分余额（含注册赠3次）
  basic: { downloads: -1, removeBg: 15 },  // -1 = 无限
  pro:   { downloads: -1, removeBg: 50 },
};

// ─── 注册赠送积分 ─────────────────────────────────────────────────
const SIGNUP_BONUS_CREDITS = 3;

// ─── 响应工具 ─────────────────────────────────────────────────────
function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}

// ═══════════════════════════════════════════════════════════════════
// 主入口
// ═══════════════════════════════════════════════════════════════════
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 给所有响应加 CORS 头的包装
    const withCors = (res) => {
      const headers = new Headers(res.headers);
      Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));
      return new Response(res.body, { status: res.status, headers });
    };

    try {
      let res;
      const p = url.pathname;

      if (p === '/api/auth/callback' && request.method === 'POST')
        res = await handleAuthCallback(request, env);
      else if (p === '/api/auth/me' && request.method === 'GET')
        res = await handleGetMe(request, env);
      else if (p === '/api/auth/logout')
        res = json({ success: true });
      else if (p === '/api/remove-bg' && request.method === 'POST')
        res = await handleRemoveBg(request, env);
      else if (p === '/api/user/profile' && request.method === 'GET')
        res = await handleUserProfile(request, env);
      else if (p === '/api/user/history' && request.method === 'GET')
        res = await handleUserHistory(request, env);
      else
        res = json({ error: 'Not Found' }, 404);

      return withCors(res);
    } catch (err) {
      console.error('Worker error:', err);
      return withCors(json({ error: 'Internal server error', message: err.message }, 500));
    }
  },
};

// ═══════════════════════════════════════════════════════════════════
// Auth — Google OAuth 回调
// ═══════════════════════════════════════════════════════════════════
async function handleAuthCallback(request, env) {
  const { credential } = await request.json();
  if (!credential) return json({ error: 'No credential provided' }, 400);

  const googleUser = await verifyGoogleToken(credential, env.GOOGLE_CLIENT_ID);
  if (!googleUser) return json({ error: 'Invalid Google token' }, 401);

  const user = await getOrCreateUser(env.DB, googleUser);

  const token = await jwt.sign({
    userId: user.id,
    email:  user.email,
    name:   user.name,
    avatar: user.avatar_url,
    plan:   user.plan,
  }, env.JWT_SECRET);

  return json({
    success: true,
    token,
    user: formatUser(user),
  });
}

// ─── 验证 Google JWT（检查 aud + exp）────────────────────────────
async function verifyGoogleToken(credential, clientId) {
  try {
    const parts   = credential.split('.');
    const payload = JSON.parse(atob(parts[1]));
    if (payload.aud !== clientId)        return null;
    if (payload.exp * 1000 < Date.now()) return null;
    return { sub: payload.sub, email: payload.email, name: payload.name, picture: payload.picture };
  } catch { return null; }
}

// ─── 查询或新建用户（新用户赠送 SIGNUP_BONUS_CREDITS 积分）────────
async function getOrCreateUser(db, googleUser) {
  let user = await db.prepare('SELECT * FROM users WHERE google_id = ?')
    .bind(googleUser.sub).first();

  if (user) {
    await db.prepare('UPDATE users SET last_login = datetime("now") WHERE id = ?')
      .bind(user.id).run();
    // 如果订阅已过期，降回 free
    if (user.plan !== 'free' && user.plan_expires_at) {
      if (new Date(user.plan_expires_at) < new Date()) {
        await db.prepare('UPDATE users SET plan = "free", plan_expires_at = NULL WHERE id = ?')
          .bind(user.id).run();
        user = { ...user, plan: 'free', plan_expires_at: null };
      }
    }
    return user;
  }

  // 新用户：credits 默认 3（注册赠送），schema 已设 DEFAULT 3
  await db.prepare(
    'INSERT INTO users (google_id, email, name, avatar_url, credits) VALUES (?, ?, ?, ?, ?)'
  ).bind(googleUser.sub, googleUser.email, googleUser.name, googleUser.picture, SIGNUP_BONUS_CREDITS).run();

  return db.prepare('SELECT * FROM users WHERE google_id = ?').bind(googleUser.sub).first();
}

// ─── 格式化用户对象（对外暴露的字段）────────────────────────────
function formatUser(user) {
  return {
    id:              user.id,
    email:           user.email,
    name:            user.name,
    avatar:          user.avatar_url,
    plan:            user.plan,
    planExpiresAt:   user.plan_expires_at,
    credits:         user.credits,
    monthlyDownloads: user.monthly_downloads,
    monthlyRemoveBg:  user.monthly_removebg,
    quotaResetAt:    user.quota_reset_at,
  };
}

// ═══════════════════════════════════════════════════════════════════
// Auth — 获取当前用户
// ═══════════════════════════════════════════════════════════════════
async function handleGetMe(request, env) {
  const user = await requireAuth(request, env);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  // 从 DB 取最新数据（含配额）
  const dbUser = await env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(user.userId).first();
  if (!dbUser) return json({ error: 'User not found' }, 404);

  // 检查是否需要重置月度配额
  const dbUserFresh = await maybeResetMonthlyQuota(env.DB, dbUser);

  return json({ user: formatUser(dbUserFresh) });
}

// ═══════════════════════════════════════════════════════════════════
// User — 个人中心详情（配额 + 套餐）
// ═══════════════════════════════════════════════════════════════════
async function handleUserProfile(request, env) {
  const auth = await requireAuth(request, env);
  if (!auth) return json({ error: 'Unauthorized' }, 401);

  const dbUser = await env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(auth.userId).first();
  if (!dbUser) return json({ error: 'User not found' }, 404);

  const user = await maybeResetMonthlyQuota(env.DB, dbUser);
  const quota = MONTHLY_QUOTA[user.plan] || MONTHLY_QUOTA.free;

  return json({
    user: formatUser(user),
    quota: {
      downloads: {
        used:  user.monthly_downloads,
        limit: quota.downloads,        // -1 = 无限
      },
      removeBg: {
        used:    user.monthly_removebg,
        limit:   quota.removeBg,       // -1 = 无限；0 = 靠积分
        credits: user.credits,         // 积分余额（注册赠+购买）
      },
    },
  });
}

// ═══════════════════════════════════════════════════════════════════
// User — 操作历史
// ═══════════════════════════════════════════════════════════════════
async function handleUserHistory(request, env) {
  const auth = await requireAuth(request, env);
  if (!auth) return json({ error: 'Unauthorized' }, 401);

  const url    = new URL(request.url);
  const limit  = Math.min(parseInt(url.searchParams.get('limit')  || '20'), 50);
  const offset = parseInt(url.searchParams.get('offset') || '0');

  const rows = await env.DB.prepare(
    `SELECT * FROM photo_history
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(auth.userId, limit, offset).all();

  return json({ history: rows.results || [] });
}

// ═══════════════════════════════════════════════════════════════════
// remove-bg — 带配额校验的抠图接口
// ═══════════════════════════════════════════════════════════════════
async function handleRemoveBg(request, env) {
  // 1. 必须登录
  const auth = await requireAuth(request, env);
  if (!auth) return json({ error: '请先登录后使用 AI 抠图功能', code: 'AUTH_REQUIRED' }, 401);

  // 2. 读取图片
  const body = await request.json();
  if (!body.image) return json({ error: 'Image is required' }, 400);

  // 3. 服务端文件大小校验（防绕过前端）
  const base64Data = body.image.replace(/^data:image\/\w+;base64,/, '');
  const byteSize   = Math.ceil(base64Data.length * 0.75);
  const MB_20      = 20 * 1024 * 1024;
  if (byteSize > MB_20) return json({ error: '图片过大，最大支持 20MB', code: 'IMAGE_TOO_LARGE' }, 413);

  // 4. 取 DB 用户并检查月度配额是否需要重置
  const dbUser = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(auth.userId).first();
  if (!dbUser) return json({ error: 'User not found' }, 404);

  const user  = await maybeResetMonthlyQuota(env.DB, dbUser);
  const plan  = user.plan;
  const quota = MONTHLY_QUOTA[plan] || MONTHLY_QUOTA.free;

  // 5. 配额检查
  //    - 月度配额 > 0 且未耗尽 → 走月度配额
  //    - 月度配额耗尽（或为 0）→ 走积分
  //    - 积分也为 0 → 拒绝
  let useCredits = false;
  if (quota.removeBg === -1) {
    // 无限（pro 未来可能）
  } else if (quota.removeBg > 0 && user.monthly_removebg < quota.removeBg) {
    // 月度配额未耗尽
  } else {
    // 月度配额耗尽，检查积分
    if (user.credits <= 0) {
      const resetDate = getNextResetDate();
      return json({
        error: quota.removeBg > 0
          ? `本月 AI 抠图次数已用完（${quota.removeBg}/${quota.removeBg}），可购买积分包继续使用`
          : '请购买积分包使用 AI 抠图功能',
        code:    'QUOTA_EXCEEDED',
        resetAt: resetDate,
      }, 429);
    }
    useCredits = true;
  }

  // 6. 确定 remove.bg size 参数
  const removeBgSize = REMOVE_BG_SIZE[plan] || 'preview';

  // 7. 调用 remove.bg
  const formData = new FormData();
  formData.append('image_base64', base64Data);
  formData.append('size', removeBgSize);

  const bgRes = await fetch('https://api.remove.bg/v1.0/removebg', {
    method:  'POST',
    headers: { 'X-Api-Key': env.REMOVE_BG_API_KEY },
    body:    formData,
  });

  if (!bgRes.ok) {
    const errText = await bgRes.text();
    console.error('remove.bg error:', errText);
    return json({ error: '抠图处理失败，请稍后重试', details: errText }, 500);
  }

  // 8. 扣减配额 / 积分，写操作历史（ctx.waitUntil 异步，不阻塞响应）
  const updatePromise = (async () => {
    if (useCredits) {
      await env.DB.prepare('UPDATE users SET credits = credits - 1 WHERE id = ?')
        .bind(user.id).run();
    } else {
      await env.DB.prepare('UPDATE users SET monthly_removebg = monthly_removebg + 1 WHERE id = ?')
        .bind(user.id).run();
    }
    // 写历史
    const preset  = body.sizePreset  || null;
    const bgColor = body.bgColor     || null;
    await env.DB.prepare(
      'INSERT INTO photo_history (user_id, action, size_preset, bg_color, used_credit) VALUES (?, ?, ?, ?, ?)'
    ).bind(user.id, 'remove_bg', preset, bgColor, useCredits ? 1 : 0).run();
  })();
  // 使用 waitUntil 让 D1 写入在响应发出后完成，不影响延迟
  // （如果 env.ctx 可用的话，这里简化为直接 await）
  await updatePromise;

  // 9. 转 base64 返回
  const buf      = await bgRes.arrayBuffer();
  const uint8    = new Uint8Array(buf);
  let b64        = '';
  const chunk    = 8192;
  for (let i = 0; i < uint8.length; i += chunk) {
    b64 += btoa(String.fromCharCode(...uint8.subarray(i, i + chunk)));
  }

  // 返回最新配额状态，前端可直接刷新 UI
  const updatedUser = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(user.id).first();

  return json({
    success: true,
    image:   `data:image/png;base64,${b64}`,
    quota: {
      removeBg: {
        used:    updatedUser.monthly_removebg,
        limit:   quota.removeBg,
        credits: updatedUser.credits,
      },
    },
  });
}

// ═══════════════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════════════

// ─── 从 Authorization header 解析 JWT ────────────────────────────
async function requireAuth(request, env) {
  const header = request.headers.get('Authorization') || '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7);
  try {
    const valid = await jwt.verify(token, env.JWT_SECRET);
    if (!valid) return null;
    return jwt.decode(token).payload;
  } catch { return null; }
}

// ─── 月度配额重置（每月 1 日）────────────────────────────────────
async function maybeResetMonthlyQuota(db, user) {
  const resetAt = new Date(user.quota_reset_at);
  const now     = new Date();

  // 判断是否已进入新的月份
  const needReset =
    now.getFullYear() > resetAt.getFullYear() ||
    now.getMonth()    > resetAt.getMonth();

  if (!needReset) return user;

  await db.prepare(
    `UPDATE users
     SET monthly_downloads = 0,
         monthly_removebg  = 0,
         quota_reset_at    = datetime("now")
     WHERE id = ?`
  ).bind(user.id).run();

  return {
    ...user,
    monthly_downloads: 0,
    monthly_removebg:  0,
    quota_reset_at:    now.toISOString(),
  };
}

// ─── 下月 1 日 00:00 UTC 的 ISO 字符串 ───────────────────────────
function getNextResetDate() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
}
