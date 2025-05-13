// controllers/turmaController.js

const Turma = require('../models/Turma');
const User = require('../models/User');
const { customAlphabet } = require('nanoid');

const generateCodigo = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);

// Criar turma
exports.criarTurma = async (req, res) => {
  try {
    const { nome } = req.body;
    const liderId = req.user.id; // Pegamos do token (middleware)

    const codigoConvite = generateCodigo();

    //Verificar se turma com mesmo código já existe
    while (await Turma.findOne({ codigoConvite })) {
      codigoConvite = generateCodigo();
    }

    const novaTurma = await Turma.create({ nome, liderId, codigoConvite });

    res.status(201).json({ turma: novaTurma });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar turma.', error: error.message });
  }
};

// Aluno se cadastrar na turma
exports.entrarTurma = async (req, res) => {
  try {
    const { codigoConvite } = req.body;
    const alunoId = req.user.id; // Pegamos do token (middleware)
    const aluno = await User.findById(alunoId);
    if (!aluno) return res.status(404).json({ message: 'Aluno não encontrado.' });

    const turma = await Turma.findOne({ codigoConvite }).populate("liderId", "_id nome");
    if (!turma) return res.status(404).json({ message: 'Turma não encontrada.' });

    const isAlreadyInTurma = turma.alunos.includes(alunoId) || turma.liderId._id.equals(alunoId);
    if (isAlreadyInTurma) return res.status(400).json({ message: 'Você já está nessa turma.' });

    turma.alunos.push(aluno._id);
    await turma.save();

    res.status(201).json({ turma });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao entrar na turma.', error: error.message });
  }
};

exports.pegarTurma = async (req, res) => {
  try {
    const alunoId = req.user.id
    const turmaId = req.params.turmaId;

    const aluno = await User.findOne({_id: alunoId});
    if(!aluno) return res.status(404).json({ message: 'Erro ao pegar turma : Aluno não encontrado'})

    let turma = await Turma.findById(turmaId);
    if (!turma) return res.status(404).json({ message: 'Nenhuma turma encontrada com esse id.' });
    
    const isInTurma = turma.alunos.includes(alunoId) || turma.liderId.equals(alunoId);
    if (!isInTurma) return res.status(400).json({ message: 'Você não faz parte desta turma.' });

    await (await turma.populate("alunos", "nome permissions profilePicUrl tipo")).populate("liderId", "nome permissions profilePicUrl tipo")

    res.status(200).json(turma);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao pegar turma.', error: error.message });
  }
};

// Listar turmas do aluno
exports.listarTurmas = async (req, res) => {
  try {
    const alunoId = req.user.id; // Pegamos do token (middleware)

    const aluno = await User.findOne({_id: alunoId});
    if(!aluno) return res.status(404).json({ message: 'Erro ao listar turmas : Aluno não encontrado'})

    let turma 
    
    turma = await Turma.find({ $or: [{alunos: alunoId}, {liderId: alunoId}]}).populate('alunos', 'nome whatsapp').populate('liderId', '_id nome email whatsapp');

    if (!turma) return res.status(404).json({ message: 'Nenhuma turma encontrada.' });

    res.status(200).json({ turmas: turma });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao listar turmas.', error: error.message });
  }
};

exports.deletarTurma = async (req, res) => {
  try {
    const turmaId = req.params.turmaId;
    const liderId = req.user.id; // Pegamos do token (middleware)

    const turma = await Turma.findById(turmaId);
    if (!turma) return res.status(404).json({ message: 'Nenhuma turma encontrada com esse id.' });

    if (!turma.liderId.equals(liderId)) return res.status(403).json({ message: 'Você não é o líder dessa turma.' });

    await Turma.deleteOne({ _id: turmaId });

    res.status(200).json({ message: 'Turma deletada com sucesso.' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao deletar turma.', error: error.message });
  }
}

exports.sairTurma = async (req, res) => {
  try {
    const turmaId = req.params.turmaId;
    const alunoId = req.user.id; // Pegamos do token (middleware)

    const aluno = await User.findOne({_id: alunoId});
    if(!aluno) return res.status(404).json({ message: 'Erro ao sair da turma : Aluno não encontrado'})

    let turma = await Turma.findById(turmaId);
    if (!turma) return res.status(404).json({ message: 'Nenhuma turma encontrada com esse id.' });

    if (!turma.alunos.includes(alunoId)) return res.status(400).json({ message: 'Você não faz parte dessa turma.' });

    turma.alunos = turma.alunos.filter(aluno => aluno != alunoId);
    await turma.save();

    res.status(200).json({ message: 'Você saiu da turma com sucesso.' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao sair da turma.', error: error.message });
  }
};