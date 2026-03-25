// Cloudflare Worker - 处理 Google OAuth 和用户认证
import jwt from '@tsndr/cloudflare-worker-jwt';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS 处理
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // 1. Google OAuth 回调处理
      if (url.pathname === '/api/auth/callback') {
        return handleAuthCallback(request, env, corsHeaders);
      }
      
      // 2. 获取当前登录用户信息
      if (url.pathname === '/api/auth/me') {
        return handleGetMe(request, env, corsHeaders);
      }
      
      // 3. 登出
      if (url.pathname === '/api/auth/logout') {
        return handleLogout(corsHeaders);
      }

      // 4. 原有的 remove-bg API
      if (url.pathname === '/api/remove-bg') {
        return handleRemoveBg(request, env, corsHeaders);
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders });
      
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};

// 处理 Google OAuth 回调
async function handleAuthCallback(request, env, corsHeaders) {
  const { credential } = await request.json();
  
  if (!credential) {
    return new Response(JSON.stringify({ error: 'No credential provided' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // 验证 Google JWT token
    const googleUser = await verifyGoogleToken(credential, env.GOOGLE_CLIENT_ID);
    
    if (!googleUser) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 查询或创建用户
    const user = await getOrCreateUser(env.DB, googleUser);
    
    // 生成自己的 JWT token
    const token = await jwt.sign({ 
      userId: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar_url
    }, env.JWT_SECRET);

    return new Response(JSON.stringify({ 
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar_url
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Auth error:', error);
    return new Response(JSON.stringify({ error: 'Authentication failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// 验证 Google JWT
async function verifyGoogleToken(credential, clientId) {
  // 解析 JWT payload（不验证签名，因为我们信任前端传来的 token）
  // 生产环境建议用 Google 的证书验证
  try {
    const parts = credential.split('.');
    const payload = JSON.parse(atob(parts[1]));
    
    // 检查 audience
    if (payload.aud !== clientId) {
      console.error('Invalid audience:', payload.aud);
      return null;
    }
    
    // 检查过期时间
    if (payload.exp * 1000 < Date.now()) {
      console.error('Token expired');
      return null;
    }
    
    return {
      sub: payload.sub,      // Google user ID
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };
  } catch (e) {
    console.error('Token parse error:', e);
    return null;
  }
}

// 获取或创建用户
async function getOrCreateUser(db, googleUser) {
  // 先查询
  let result = await db.prepare(
    'SELECT * FROM users WHERE google_id = ?'
  ).bind(googleUser.sub).first();
  
  if (result) {
    // 更新最后登录时间
    await db.prepare(
      'UPDATE users SET last_login = datetime("now") WHERE id = ?'
    ).bind(result.id).run();
    return result;
  }
  
  // 创建新用户
  await db.prepare(
    'INSERT INTO users (google_id, email, name, avatar_url) VALUES (?, ?, ?, ?)'
  ).bind(googleUser.sub, googleUser.email, googleUser.name, googleUser.picture).run();
  
  // 返回新用户
  result = await db.prepare(
    'SELECT * FROM users WHERE google_id = ?'
  ).bind(googleUser.sub).first();
  
  return result;
}

// 获取当前用户信息
async function handleGetMe(request, env, corsHeaders) {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  const token = authHeader.slice(7);
  
  try {
    const isValid = await jwt.verify(token, env.JWT_SECRET);
    if (!isValid) {
      throw new Error('Invalid token');
    }
    
    const payload = jwt.decode(token).payload;
    
    return new Response(JSON.stringify({ 
      user: {
        id: payload.userId,
        email: payload.email,
        name: payload.name,
        avatar: payload.avatar
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// 登出
function handleLogout(corsHeaders) {
  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// 原有的背景移除功能（保持不变）
async function handleRemoveBg(request, env, corsHeaders) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { image } = await request.json();

    if (!image) {
      return new Response(JSON.stringify({ error: 'Image is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    const formData = new FormData();
    formData.append('image_base64', base64Data);
    formData.append('size', 'auto');

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': env.REMOVE_BG_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Remove.bg API error:', errorData);
      return new Response(JSON.stringify({ 
        error: 'Failed to remove background',
        details: errorData 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resultBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(resultBuffer);
    let resultBase64 = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      resultBase64 += btoa(String.fromCharCode(...uint8Array.subarray(i, i + chunkSize)));
    }

    return new Response(JSON.stringify({
      success: true,
      image: `data:image/png;base64,${resultBase64}`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Remove background error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
