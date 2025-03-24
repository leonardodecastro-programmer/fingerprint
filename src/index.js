import { createHash } from 'node:crypto';
import { fingerprintCollectorHTML } from './templates/fingerprint-collector.js';
import { loginHTML } from './templates/login.js';
import { dashboardHTML } from './templates/dashboard.js';

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

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Rota principal que coleta o fingerprint
    if (path === '/' || path === '/index.html') {
      return new Response(fingerprintCollectorHTML, {
        headers: { 'Content-Type': 'text/html' },
      });
    }
    
    // Rota para salvar o fingerprint
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
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    
    // Rota de login
    if (path === '/login') {
      return new Response(loginHTML, {
        headers: { 'Content-Type': 'text/html' },
      });
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
            headers: { 'Content-Type': 'application/json' },
          });
        }
        
        const passwordMatch = (password === user.password);
        
        if (!passwordMatch) {
          return new Response(JSON.stringify({ error: 'Senha incorreta' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        
        const token = generateToken(username);
        
        return new Response(JSON.stringify({ token }), {
          headers: { 'Content-Type': 'application/json' },
        });
  } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    
    // Rota do dashboard
    if (path === '/dashboard') {
      return new Response(dashboardHTML, {
        headers: { 'Content-Type': 'text/html' },
      });
    }
    
    // API para obter os fingerprints (protegida)
    if (path === '/api/fingerprints') {
      const authHeader = request.headers.get('Authorization') || '';
      const token = authHeader.replace('Bearer ', '');
      
      const payload = verifyToken(token);
      
      if (!payload) {
        return new Response(JSON.stringify({ error: 'Não autorizado' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      try {
        const result = await env.DB.prepare(
          'SELECT * FROM fingerprints ORDER BY timestamp DESC'
        ).all();
        
        return new Response(JSON.stringify({ fingerprints: result.results }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    
    // Rota 404 para qualquer outra solicitação
    return new Response('Não encontrado', { status: 404 });
  },
}; 