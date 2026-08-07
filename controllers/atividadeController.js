// controllers/atividadeController.js

const Atividade = require('../models/Atividade');
const Turma = require('../models/Turma');
const { normalizarTitulo, parseDataEntrega } = require('../utils/dateUtils');

async function ehMembroDaTurma(turma, userId) {
  return turma.liderId.equals(userId) || turma.alunos.some(a => a.equals(userId));
}

// Criar atividade
exports.criarAtividade = async (req, res) => {
  try {
    const { titulo, descricao, fonte, dataEntrega, turmaId, force } = req.body;

    if (!titulo || !dataEntrega || !turmaId) {
      return res.status(400).json({ message: 'Titulo, data de entrega e turma são obrigatórios.' });
    }

    const turma = await Turma.findById(turmaId).populate('alunos');
    if (!turma) return res.status(404).json({ message: 'Turma não encontrada.' });

    if (!(await ehMembroDaTurma(turma, req.user.id))) {
      return res.status(403).json({ message: 'Você não participa dessa turma. Entre com o código de convite.' });
    }

    const date = parseDataEntrega(dataEntrega);
    if (!date) return res.status(400).json({ message: 'Data de entrega inválida. Use o formato DD/MM/AAAA HH:mm.' });

    // Checagem de duplicidade
    const tituloNormalizado = normalizarTitulo(titulo);
    const fonteNormalizada = normalizarTitulo(fonte);
    const candidatas = await Atividade.find({ turmaId });

    const similares = candidatas.filter(a => {
      if (tituloNormalizado && normalizarTitulo(a.titulo) === tituloNormalizado) return true;
      if (fonteNormalizada && a.fonte && normalizarTitulo(a.fonte) === fonteNormalizada) return true;
      return false;
    });

    if (similares.length > 0 && !force) {
      return res.status(409).json({
        message: 'Já existe atividade semelhante nessa turma.',
        similares: similares.map(a => ({
          _id: a._id,
          titulo: a.titulo,
          descricao: a.descricao,
          fonte: a.fonte,
          dataEntrega: a.dataEntrega
        }))
      });
    }

    const atividade = await Atividade.create({
      titulo,
      descricao,
      fonte,
      criadoPor: req.user.id,
      dataEntrega: date,
      turmaId,
      alunosPendentes: [turma.liderId, ...turma.alunos.map(a => a._id)]
    });

    res.status(201).json(atividade);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar atividade.', error: error.message });
  }
};

// Aluno entregar atividade
exports.entregarAtividade = async (req, res) => {
  try {
    const alunoId = req.user.id
    const { atividadeId } = req.params;

    const atividade = await Atividade.findById(atividadeId);
    if (!atividade) return res.status(404).json({ message: 'Atividade não encontrada.' });

    const turma = await Turma.findById(atividade.turmaId);
    if (!(await ehMembroDaTurma(turma, alunoId))) {
      return res.status(403).json({ message: 'Você não participa dessa turma.' });
    }

    if (atividade.alunosEntregues.some(id => id.equals(alunoId))) {
      return res.status(400).json({ message: 'Você já entregou essa atividade.' });
    }

    atividade.alunosPendentes = atividade.alunosPendentes.filter(id => id.toString() !== alunoId);
    atividade.alunosEntregues.push(alunoId);

    await atividade.save();

    res.json({ message: 'Atividade marcada como entregue.' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao entregar atividade.' + error.message });
  }
};

exports.pegarAgenda = async (req, res) => {
  try {
    const userId = req.user.id;

    const turmas = await Turma.find({ $or: [{ alunos: userId }, { liderId: userId }] }).select('_id nome');
    const turmaIds = turmas.map(t => t._id);

    const atividades = await Atividade.find({ turmaId: { $in: turmaIds } })
      .sort({ dataEntrega: 1 })
      .populate('alunosEntregues', 'nome permissions tipo profilePicUrl')
      .populate('alunosPendentes', 'nome permissions tipo profilePicUrl');

    const turmaMap = {};
    turmas.forEach(t => { turmaMap[t._id.toString()] = t.nome; });

    res.json(atividades.map(a => {
      const obj = a.toObject();
      obj.turmaNome = turmaMap[a.turmaId.toString()];
      return obj;
    }));
  } catch (error) {
    res.status(500).json({ message: 'Erro ao pegar agenda.', error: error.message });
  }
};

exports.pegarAtividades = async (req, res) => {
  try {
    const userId = req.user.id
    const turmaId = req.params.turmaId

    if(!turmaId) return res.status(404).json({ message: 'Id da turma necessário.' });

    const turma = await Turma.findById(turmaId)
    if(!turma) return res.status(404).json({ message: 'Turma não encontrada.' });
    const temUsuario = await ehMembroDaTurma(turma, userId)

    if(!temUsuario) return res.status(403).json({ message: 'Você não participa dessa turma. Entre com o código de convite.' }); 

    const atividades = await Atividade.find({turmaId}).populate("alunosEntregues", "nome permissions tipo profilePicUrl").populate("alunosPendentes", "nome permissions tipo profilePicUrl").populate("criadoPor", "nome profilePicUrl");
    if (!atividades) return res.status(404).json({ message: 'Atividade não encontrada.' });

    res.json(atividades);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao pegar atividades.', error: error.message });
  }
};

exports.pegarAtividade = async (req, res) => {
  try {
    const userId = req.user.id
    const turmaId = req.params.turmaId
    const atividadeId = req.params.atividadeId

    if(!turmaId) return res.status(404).json({ message: 'Id da turma necessário.' });
    if(!atividadeId) return res.status(404).json({ message: 'Id da atividade necessário.' });

    const turma = await Turma.findById(turmaId)
    const temUsuario = await ehMembroDaTurma(turma, userId)

    if(!temUsuario) return res.status(403).json({ message: 'Você não participa dessa turma. Entre com o código de convite.' }); 

    const atividade = await Atividade.findOne({turmaId, _id: atividadeId}).populate("alunosEntregues", "nome permissions tipo profilePicUrl").populate("alunosPendentes", "nome permissions tipo profilePicUrl").populate("criadoPor", "nome profilePicUrl");
    if (!atividade) return res.status(404).json({ message: 'Atividade não encontrada.' });

    res.json(atividade);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao pegar atividade.', error: error.message });
  }
};

exports.atualizarAtividade = async (req, res) => {
  try {
    const userId = req.user.id
    const turmaId = req.params.turmaId
    const atividadeId = req.params.atividadeId

    const { titulo, descricao, fonte, dataEntrega } = req.body

    if(!turmaId) return res.status(404).json({ message: 'Id da turma necessário.' });
    if(!atividadeId) return res.status(404).json({ message: 'Id da atividade necessário.' });
    if(!titulo || !descricao) return res.status(400).json({ message: 'Detalhes da atualização não podem estar vazias.' });

    const turma = await Turma.findById(turmaId)
    const atividade = await Atividade.findOne({turmaId, _id: atividadeId});
    if (!atividade) return res.status(404).json({ message: 'Atividade não encontrada.' });

    const podeEditar = turma.liderId.equals(userId) || (atividade.criadoPor && atividade.criadoPor.equals(userId));
    if(!podeEditar) return res.status(403).json({ message: 'Apenas o criador da atividade ou o lider da turma podem fazer alterações.' }); 

    atividade.titulo = titulo
    atividade.descricao = descricao
    if(fonte !== undefined) atividade.fonte = fonte
    if(dataEntrega) {
      const date = parseDataEntrega(dataEntrega)
      if (!date) return res.status(400).json({ message: 'Data de entrega inválida. Use o formato DD/MM/AAAA HH:mm.' });
      atividade.dataEntrega = date
    }

    await atividade.save()

    res.json(atividade);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar atividade.', error: error.message });
  }
};

exports.deletarAtividade = async (req, res) => {
  try {
    const userId = req.user.id
    const turmaId = req.params.turmaId
    const atividadeId = req.params.atividadeId

    if(!turmaId) return res.status(404).json({ message: 'Id da turma necessário.' });
    if(!atividadeId) return res.status(404).json({ message: 'Id da atividade necessário.' });

    const turma = await Turma.findById(turmaId)
    const atividade = await Atividade.findOne({turmaId, _id: atividadeId});
    if (!atividade) return res.status(404).json({ message: 'Atividade não encontrada.' });

    const podeDeletar = turma.liderId.equals(userId) || (atividade.criadoPor && atividade.criadoPor.equals(userId));
    if(!podeDeletar) return res.status(403).json({ message: 'Apenas o criador da atividade ou o lider da turma podem deletar atividades.' }); 

    await Atividade.deleteOne({_id: atividadeId})

    res.json({message: "Atividade deletada."});
  } catch (error) {
    res.status(500).json({ message: 'Erro ao deletar atividade.', error: error.message });
  }
};
