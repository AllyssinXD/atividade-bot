// server.js

require('dotenv').config(); // Variáveis de ambiente
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { startReminders } = require('./services/remindersService');
const { processarMensagem } = require('./services/commandHandler');

// Rotas
const userRoutes = require('./routes/userRoutes')
const authRoutes = require('./routes/authRoutes');
const turmaRoutes = require('./routes/turmaRoutes');
const atividadeRoutes = require('./routes/atividadeRoutes');
const postsPublicosRoutes = require('./routes/PostPublicoRoutes');
const replyRoutes = require('./routes/ReplyRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');

// Inicializando o app
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Conectando ao MongoDB
const MONGO_URI = process.env.MONGO_URI;

// Usando as rotas
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/turmas', turmaRoutes);
app.use('/api/atividades', atividadeRoutes);
app.use('/api/publicPosts', postsPublicosRoutes);
app.use('/api/reply', replyRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Webhook recebe mensagens do WhatsApp encaminhadas pelo gateway (bot.js)
app.post('/api/whatsapp/webhook', async (req, res) => {
  const secret = process.env.BOT_WEBHOOK_SECRET;
  if (secret && req.headers['x-bot-secret'] !== secret) {
    return res.status(401).json({ message: 'Secret inválido.' });
  }

  const { numero, body } = req.body || {};
  if (!numero || !body) return res.status(400).json({ message: 'numero e body são obrigatórios.' });

  try {
    await processarMensagem(numero, body);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao processar mensagem.', error: error.message });
  }
});

// Rota raiz
app.get('/', (req, res) => {
  res.send('Sistema de Lembretes Estudantis Online 📚');
});

// Mongoose Connection
async function dnsOverHttps(name, type) {
  const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`, {
    headers: { accept: 'application/dns-json' }
  });
  const data = await res.json();
  if (data.Status !== 0 || !data.Answer) throw new Error(`DNS sem resposta para ${name} (${type})`);
  return data.Answer;
}

// Converte mongodb+srv:// em mongodb:// direta, resolvendo SRV/TXT via DNS-over-HTTPS
// (contorna resolvedores DNS locais que recusam consultas SRV — querySrv ECONNREFUSED)
async function montarUriDireta(srvUri) {
  const m = srvUri.match(/^mongodb\+srv:\/\/([^@]+)@([^/?]+)/);
  if (!m) throw new Error('URI SRV no formato esperado (mongodb+srv://usuario:senha@host).');
  const creds = m[1];
  const host = m[2];

  const [srv, txt] = await Promise.all([
    dnsOverHttps(`_mongodb._tcp.${host}`, 'SRV'),
    dnsOverHttps(host, 'TXT')
  ]);

  const seeds = srv.map(a => {
    const [, , port, target] = a.data.trim().split(/\s+/);
    return `${target.replace(/\.$/, '')}:${port}`;
  });

  const params = txt
    .flatMap(a => a.data.split('&'))
    .map(p => p.replace(/"/g, ''))
    .filter(p => /^[a-zA-Z]+=/.test(p));

  const query = [...new Set([...params, 'retryWrites=true', 'w=majority', 'tls=true'])].join('&');
  return `mongodb://${creds}@${seeds.join(',')}/?${query}`;
}

async function tentarConectar(uri) {
  try {
    await mongoose.connect(uri, {
      serverApi: { version: '1', strict: true, deprecationErrors: true },
      dbName: 'estudant-whatsapp-reminder'
    });
    await mongoose.connection.db?.admin().command({ ping: 1 });
    return null;
  } catch (err) {
    return err;
  }
}

async function connectDB() {
  let err = await tentarConectar(MONGO_URI);

  if (err && /querySrv|ECONNREFUSED|ENOTFOUND/i.test(err.message)) {
    console.log('⚠️  Falha de DNS SRV (' + err.message + '). Tentando URI direta sem SRV...');
    try {
      const direta = await montarUriDireta(MONGO_URI);
      await mongoose.disconnect();
      err = await tentarConectar(direta);
    } catch (e) {
      console.log('Erro ao montar/conectar URI direta: ' + e.message);
    }
  }

  if (err) {
    console.log('Error connecting with Mongo : ' + err);
    return false;
  }

  console.log('Pinged your deployment. You successfully connected to MongoDB!');
  return true;
}

// Inicializar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  connectDB().then(ok => {
    if (ok) startReminders();
  });
});
