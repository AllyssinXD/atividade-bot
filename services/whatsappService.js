// services/whatsappService.js
// Cliente HTTP para o gateway do WhatsApp (bot.js), acessado via túnel (BOT_URL).

const BOT_URL = process.env.BOT_URL || 'http://localhost:3001';

function normalizarNumero(num) {
  return String(num || '').replace(/[\s+]/g, '');
}

async function sendMessage(numero, mensagem) {
  const numeroLimpo = normalizarNumero(numero);
  if (!numeroLimpo) throw new Error('Número de WhatsApp vazio.');

  const res = await fetch(BOT_URL + '/api/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-bot-secret': process.env.BOT_WEBHOOK_SECRET || ''
    },
    body: JSON.stringify({ numero: numeroLimpo, mensagem })
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error('Erro do gateway do WhatsApp: ' + (data.message || res.status));
  }

  return true;
}

module.exports = { sendMessage, normalizarNumero };
