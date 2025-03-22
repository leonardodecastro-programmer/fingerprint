import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { fingerprints } from './db/schema';
import { z } from 'zod';

const app = new Hono();

app.use(cors());
// Removendo a proteção JWT que não está integrada com Cloudflare Access
// app.use('/api/fingerprints', jwt({ secret: 'seu-secret' }));

// Schema de validação
const fingerprintSchema = z.object({
  fingerprint: z.string(),
  userAgent: z.string(),
});

// Rota para servir a página HTML
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Fingerprint Collector</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/fingerprintjs@2.1.0/dist/fingerprint2.min.js"></script>
      </head>
      <body>
        <div class="container mt-5">
          <h1>Fingerprint Collector</h1>
          <div id="status" class="alert alert-info">Coletando fingerprint...</div>
        </div>
        <script>
          Fingerprint2.get(function(components) {
            const fingerprint = Fingerprint2.x64hash128(components.map(pair => pair.value).join(), 31);

            fetch('/api/collect', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fingerprint: fingerprint,
                userAgent: navigator.userAgent
              })
            })
            .then(response => {
              document.getElementById('status').className = 'alert alert-success';
              document.getElementById('status').textContent = 'Fingerprint coletado com sucesso!';
            })
            .catch(error => {
              document.getElementById('status').className = 'alert alert-danger';
              document.getElementById('status').textContent = 'Erro ao coletar fingerprint.';
            });
          });
        </script>
      </body>
    </html>
  `);
});

// Rota para coletar fingerprint
app.post('/api/collect', async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json();

  try {
    const validatedData = fingerprintSchema.parse(body);

    await db.insert(fingerprints).values({
      fingerprint: validatedData.fingerprint,
      userAgent: validatedData.userAgent,
    });

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Dados inválidos' }, 400);
  }
});

// Rota protegida para visualizar fingerprints
app.get('/api/fingerprints', async (c) => {
  // Verificar o cabeçalho CF-Access-Authenticated-User-Email que o Cloudflare Access adiciona
  const userEmail = c.req.header('CF-Access-Authenticated-User-Email');

  // Se não houver cabeçalho de autenticação do Cloudflare Access, retornar erro
  if (!userEmail) {
    return c.json({ error: 'Acesso não autorizado' }, 401);
  }

  const db = drizzle(c.env.DB);
  const results = await db.select().from(fingerprints);
  return c.json(results);
});

export default app;