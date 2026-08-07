// models/Atividade.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const atividadeSchema = new Schema({
  titulo: { type: String, required: true },
  descricao: { type: String },
  fonte: { type: String },
  criadoPor: { type: Schema.Types.ObjectId, ref: 'User' },
  dataEntrega: { type: Date, required: true },
  turmaId: { type: Schema.Types.ObjectId, ref: 'Turma', required: true },
  alunosPendentes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  alunosEntregues: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  notificacoesEnviadas: [{
    usuario: { type: Schema.Types.ObjectId, ref: 'User' },
    janela: { type: String, enum: ['48h', '2h'] },
    enviadoEm: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Atividade', atividadeSchema);