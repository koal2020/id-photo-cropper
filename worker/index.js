// Cloudflare Worker - remove.bg API 代理
// 用于保护 API Key 并处理跨域

export default {
  async fetch(request, env, ctx) {
    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // 只接受 POST 请求
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    try {
      const { image } = await request.json();

      if (!image) {
        return new Response(JSON.stringify({ error: 'Image is required' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // 将 base64 转换为 Blob
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const blob = new Blob([binaryData], { type: 'image/png' });

      // 构建 FormData
      const formData = new FormData();
      formData.append('image_file', blob, 'image.png');
      formData.append('size', 'auto');

      // 调用 remove.bg API
      const response = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: {
          'X-Api-Key': env.REMOVE_BG_API_KEY || 'BWAmXQmNFVhdbPXozJzLBisJ',
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
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // 获取处理后的图片（PNG 格式，透明背景）
      const resultBuffer = await response.arrayBuffer();
      const resultBase64 = btoa(String.fromCharCode(...new Uint8Array(resultBuffer)));

      return new Response(JSON.stringify({
        success: true,
        image: `data:image/png;base64,${resultBase64}`,
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },
};