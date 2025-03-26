import { createHash } from 'node:crypto';

// Função para gerar um token JWT simples
function generateToken(username) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    username,
    exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hora
  };

  const headerBase64 = btoa(JSON.stringify(header));
  const payloadBase64 = btoa(JSON.stringify(payload));

  const signature = createHash('sha256')
    .update(`${headerBase64}.${payloadBase64}.secret-key`)
    .digest('base64');

  return `${headerBase64}.${payloadBase64}.${signature}`;
}

// Função para verificar um token JWT
function verifyToken(token) {
  try {
    const [headerBase64, payloadBase64, signature] = token.split('.');

    const expectedSignature = createHash('sha256')
      .update(`${headerBase64}.${payloadBase64}.secret-key`)
      .digest('base64');

    if (signature !== expectedSignature) {
      return null;
    }

    const payload = JSON.parse(atob(payloadBase64));

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch (e) {
    return null;
  }
}

// Função para configurar os cabeçalhos CORS
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

// Função para responder a requisições OPTIONS (preflight)
function handleOptions() {
  return new Response(null, {
    headers: {
      ...corsHeaders(),
      'Content-Type': 'application/json',
    },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Lidar com requisições preflight CORS
    if (request.method === 'OPTIONS') {
      return handleOptions();
    }

    // API para salvar o fingerprint
    if (path === '/api/fingerprint' && request.method === 'POST') {
      try {
        const data = await request.json();
        const userAgent = request.headers.get('User-Agent') || '';
        const ip = request.headers.get('CF-Connecting-IP') || '';

        await env.DB.prepare(
          'INSERT INTO fingerprints (fingerprint, userAgent, ip, timestamp) VALUES (?, ?, ?, ?)'
        ).bind(
          data.fingerprint,
          userAgent,
          ip,
          Date.now()
        ).run();

        return new Response(JSON.stringify({ success: true }), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(),
          },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(),
          },
        });
      }
    }

    // API de login
    if (path === '/api/login' && request.method === 'POST') {
      try {
        const { username, password } = await request.json();

        const user = await env.DB.prepare(
          'SELECT * FROM users WHERE username = ?'
        ).bind(username).first();

        if (!user) {
          return new Response(JSON.stringify({ error: 'Usuário não encontrado' }), {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders(),
            },
          });
        }

        const passwordMatch = (password === user.password);

        if (!passwordMatch) {
          return new Response(JSON.stringify({ error: 'Senha incorreta' }), {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders(),
            },
          });
        }

        const token = generateToken(username);

        return new Response(JSON.stringify({ token, username: user.username }), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(),
          },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(),
          },
        });
      }
    }

    // API para obter os fingerprints (protegida)
    if (path === '/api/fingerprints' && request.method === 'GET') {
      const authHeader = request.headers.get('Authorization') || '';
      const token = authHeader.replace('Bearer ', '');

      const payload = verifyToken(token);

      if (!payload) {
        return new Response(JSON.stringify({ error: 'Não autorizado' }), {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(),
          },
        });
      }

      try {
        const result = await env.DB.prepare(
          'SELECT * FROM fingerprints ORDER BY timestamp DESC'
        ).all();

        return new Response(JSON.stringify({ fingerprints: result.results }), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(),
          },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(),
          },
        });
      }
    }

    // API para verificar se o token é válido
    if (path === '/api/verify-token' && request.method === 'GET') {
      const authHeader = request.headers.get('Authorization') || '';
      const token = authHeader.replace('Bearer ', '');

      const payload = verifyToken(token);

      if (!payload) {
        return new Response(JSON.stringify({ valid: false }), {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(),
          },
        });
      }

      return new Response(JSON.stringify({
        valid: true,
        username: payload.username
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(),
        },
      });
    }

    // Rota 404 para qualquer outra solicitação
    return new Response(JSON.stringify({ error: 'Endpoint não encontrado' }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(),
      },
    });
  },
};