// services/remindersService.js
// Lembretes automáticos: escaneia atividades próximas e notifica via gateway do WhatsApp.

const cron = require('node-cron');
const Atividade = require('../models/Atividade');
const whatsappService = require('./whatsappService');

const JANELAS = [
  { janela: '48h', horas: 48 },
  { janela: '2h', horas: 2 }
];

function formatarData(d) {
  if (!d || isNaN(new Date(d).getTime())) return '';
  const date = new Date(d);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${date.getFullYear()} ${hh}:${mi}`;
}

function montarMensagemLembrete(atividade, janela) {
  let msg = `🔔 *Notifiqa* — Faltam ${janela} para o prazo!\n\n`;
  msg += `📌 *${atividade.titulo}*\n`;
  if (atividade.turmaId && atividade.turmaId.nome) msg += `🏫 Turma: ${atividade.turmaId.nome}\n`;
  msg += `⏰ Entrega: ${formatarData(atividade.dataEntrega)}\n`;
  if (atividade.fonte) msg += `🔗 Fonte: ${atividade.fonte}\n`;
  msg += `\nAcesse o Notifiqa para ver detalhes e marcar como entregue.`;
  return msg;
}

async function enviarLembretes() {
  const now = new Date();
  const ate48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const atividades = await Atividade.find({
    dataEntrega: { $gt: now, $lte: ate48h }
  })
    .populate('turmaId', 'nome')
    .populate('alunosPendentes', 'nome whatsapp whatsappVerificado receberNotificacoes');

  for (const atividade of atividades) {
    const diffHoras = (atividade.dataEntrega.getTime() - now.getTime()) / (1000 * 60 * 60);
    const janelasAplicaveis = JANELAS.filter(j => diffHoras <= j.horas);

    for (const { janela } of janelasAplicaveis) {
      for (const aluno of atividade.alunosPendentes) {
        if (!aluno.whatsappVerificado || aluno.receberNotificacoes === false) continue;

        const jaNotificado = atividade.notificacoesEnviadas.some(
          n => n.usuario && n.usuario.equals(aluno._id) && n.janela === janela
        );
        if (jaNotificado) continue;

        try {
          await whatsappService.sendMessage(aluno.whatsapp, montarMensagemLembrete(atividade, janela));
          atividade.notificacoesEnviadas.push({ usuario: aluno._id, janela, enviadoEm: new Date() });
          console.log(`📢 Lembrete (${janela}) enviado para ${aluno.nome} — ${atividade.titulo}`);
        } catch (err) {
          console.log(`❌ Erro ao enviar lembrete para ${aluno.nome}: ${err.message}`);
        }
      }
    }
    await atividade.save();
  }
}

function startReminders() {
  cron.schedule('* * * * *', () => {
    enviarLembretes().catch(err => console.log('❌ Erro no lembrete: ' + err.message));
  });

  enviarLembretes().catch(err => console.log('❌ Erro no lembrete: ' + err.message));
  console.log('⏰ Serviço de lembretes iniciado (a cada minuto).');
}

module.exports = { startReminders, enviarLembretes };
