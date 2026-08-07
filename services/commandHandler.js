// services/commandHandler.js
// Processa mensagens recebidas via webhook do gateway do WhatsApp.
// Responde através do whatsappService (API -> tunnel -> bot).

const Atividade = require('../models/Atividade');
const Turma = require('../models/Turma');
const User = require('../models/User');
const { normalizarTitulo, parseDataEntrega } = require('../utils/dateUtils');
const whatsappService = require('./whatsappService');

const confirmacoes = new Map();

function normalizarNumero(num) {
  return String(num || '').replace(/\D/g, '');
}

function numerosIguais(armazenado, from) {
  const a = normalizarNumero(armazenado);
  const b = normalizarNumero(from);
  if (!a || !b) return false;
  return a === b || b.endsWith(a) || a.endsWith(b);
}

function formatarData(d) {
  if (!d || isNaN(new Date(d).getTime())) return '';
  const date = new Date(d);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${date.getFullYear()} ${hh}:${mi}`;
}

function ajuda() {
  return '🤖 *Notifiqa — Comandos*\n\n' +
    '/ajuda — mostra os comandos\n' +
    '/atividades — lista as próximas atividades\n' +
    '/adicionar titulo | dd/mm/aaaa hh:mm [| fonte] — cadastra atividade\n' +
    '/lembretes on|off — ativa/desativa lembretes';
}

async function listarAtividades(from, user) {
  const turmas = await Turma.find({ $or: [{ alunos: user._id }, { liderId: user._id }] }).select('_id nome');
  if (!turmas.length) {
    return whatsappService.sendMessage(from, 'Você ainda não está em nenhuma turma. Entre com o código de convite no site.');
  }

  const turmaIds = turmas.map(t => t._id);
  const atividades = await Atividade.find({ turmaId: { $in: turmaIds } })
    .sort({ dataEntrega: 1 })
    .populate('turmaId', 'nome')
    .limit(10);

  if (!atividades.length) {
    return whatsappService.sendMessage(from, 'Nenhuma atividade cadastrada. Adicione com: /adicionar titulo | dd/mm/aaaa hh:mm');
  }

  const turmaMap = {};
  turmas.forEach(t => { turmaMap[t._id.toString()] = t.nome; });

  let msg = '📋 *Próximas atividades:*\n\n';
  atividades.forEach((a, i) => {
    const status = a.dataEntrega < new Date() ? '⚠️ vencida' : '⏳ pendente';
    msg += `${i + 1}. *${a.titulo}*\n`;
    msg += `   🏫 ${turmaMap[a.turmaId.toString()]}\n`;
    msg += `   ⏰ ${formatarData(a.dataEntrega)} — ${status}\n`;
    if (a.fonte) msg += `   🔗 ${a.fonte}\n`;
    msg += '\n';
  });

  await whatsappService.sendMessage(from, msg);
}

async function criarDeContexto(from, user, ctx) {
  const turma = await Turma.findById(ctx.turmaId).populate('alunos', '_id');
  if (!turma) return whatsappService.sendMessage(from, 'Turma não encontrada.');

  const atividade = await Atividade.create({
    titulo: ctx.titulo,
    descricao: ctx.descricao || '',
    fonte: ctx.fonte || '',
    criadoPor: user._id,
    dataEntrega: ctx.dataEntrega,
    turmaId: turma._id,
    alunosPendentes: [turma.liderId, ...turma.alunos.map(a => a._id)]
  });

  let msg = `✅ Atividade criada em *${turma.nome}*!\n\n`;
  msg += `📌 *${atividade.titulo}*\n`;
  msg += `⏰ ${formatarData(atividade.dataEntrega)}\n`;
  if (atividade.fonte) msg += `🔗 ${atividade.fonte}\n`;

  await whatsappService.sendMessage(from, msg);
}

async function adicionarAtividade(from, user, texto) {
  const pendente = confirmacoes.get(user._id.toString());

  if (pendente && /^(sim|s|ss|ok|pode)$/i.test(texto)) {
    confirmacoes.delete(user._id.toString());
    return criarDeContexto(from, user, pendente);
  }
  if (pendente && /^(nao|não|n|nope|cancelar|cancela)$/i.test(texto)) {
    confirmacoes.delete(user._id.toString());
    return whatsappService.sendMessage(from, 'Criação cancelada.');
  }

  const partes = texto.split('|').map(p => p.trim());
  if (partes.length < 2) {
    return whatsappService.sendMessage(from, 'Uso: /adicionar titulo | dd/mm/aaaa hh:mm [| fonte]\nEx.: /adicionar Prova de Cálculo | 15/08/2026 14:00 | Classroom');
  }

  const titulo = partes[0];
  const data = parseDataEntrega(partes[1]);
  const fonte = partes[2] || '';

  if (!titulo) return whatsappService.sendMessage(from, 'Informe o título da atividade.');
  if (!data) return whatsappService.sendMessage(from, 'Data inválida. Use o formato dd/mm/aaaa hh:mm.');

  const turmas = await Turma.find({ $or: [{ alunos: user._id }, { liderId: user._id }] }).populate('alunos', '_id');
  if (!turmas.length) {
    return whatsappService.sendMessage(from, 'Você ainda não está em nenhuma turma. Entre com o código de convite no site para adicionar atividades.');
  }
  const turma = turmas[0];

  const tituloNorm = normalizarTitulo(titulo);
  const fonteNorm = normalizarTitulo(fonte);
  const candidatas = await Atividade.find({ turmaId: turma._id });
  const similares = candidatas.filter(a => {
    if (tituloNorm && normalizarTitulo(a.titulo) === tituloNorm) return true;
    if (fonteNorm && a.fonte && normalizarTitulo(a.fonte) === fonteNorm) return true;
    return false;
  });

  if (similares.length) {
    let msg = '⚠️ Já existe atividade semelhante:\n\n';
    similares.forEach(a => {
      msg += `• *${a.titulo}* — ${formatarData(a.dataEntrega)}\n`;
    });
    msg += '\nCriar mesmo assim? (sim/não)';
    confirmacoes.set(user._id.toString(), { titulo, descricao: '', fonte, dataEntrega: data, turmaId: turma._id });
    setTimeout(() => confirmacoes.delete(user._id.toString()), 5 * 60 * 1000);
    return whatsappService.sendMessage(from, msg);
  }

  await criarDeContexto(from, user, { titulo, descricao: '', fonte, dataEntrega: data, turmaId: turma._id });
}

async function alternarLembretes(from, user, resto) {
  const valor = resto.toLowerCase();
  if (['on', 'sim', 'ativar', 'true', '1'].includes(valor)) {
    user.receberNotificacoes = true;
    await user.save();
    return whatsappService.sendMessage(from, '✅ Lembretes ativados. Você receberá avisos 48h e 2h antes dos prazos.');
  }
  if (['off', 'nao', 'não', 'desativar', 'false', '0'].includes(valor)) {
    user.receberNotificacoes = false;
    await user.save();
    return whatsappService.sendMessage(from, '🔕 Lembretes desativados.');
  }
  return whatsappService.sendMessage(from, 'Uso: /lembretes on ou /lembretes off');
}

async function processarMensagem(numero, body) {
  if (!numero || !body || !body.trim().startsWith('/')) return;

  const users = await User.find({ whatsappVerificado: true }).select('nome whatsapp receberNotificacoes');
  const user = users.find(u => numerosIguais(u.whatsapp, numero));
  if (!user) {
    return whatsappService.sendMessage(numero, '⚠️ Seu número não está cadastrado como usuário verificado do Notifiqa. Entre no site e verifique seu WhatsApp para usar os comandos.');
  }

  const comando = body.trim().split(/\s+/)[0].toLowerCase();
  const resto = body.slice(body.indexOf(comando) + comando.length).trim();

  switch (comando) {
    case '/ajuda':
      await whatsappService.sendMessage(numero, ajuda());
      break;
    case '/atividades':
      await listarAtividades(numero, user);
      break;
    case '/adicionar':
      await adicionarAtividade(numero, user, resto);
      break;
    case '/lembretes':
      await alternarLembretes(numero, user, resto);
      break;
    default:
      await whatsappService.sendMessage(numero, 'Comando não reconhecido. Envie /ajuda para ver os comandos disponíveis.');
  }
}

module.exports = { processarMensagem };
