// controllers/replyController.js

const Reply = require("../models/Reply");
const PublicPost = require("../models/PublicPost");
const User = require("../models/User");

exports.listarReplies = async (req, res) => {
  try {
    const postId = req.params.postId

    const post = await PublicPost.findById(postId)
    if(!post) return res.status(404).json({ message: 'Post não existe'});

    const replies = await Reply.find({ postId }).sort({ createdAt: 1 }).populate("userId", "nome permissions profilePicUrl")

    res.status(200).json(replies);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao listar respostas.', error: error.message });
  }
};

exports.criarReply = async (req, res) => {
  try {
    const { postId, content } = req.body
    const userId = req.user.id

    const user = await User.findById(userId)
    const post = await PublicPost.findById(postId)

    if(!user) return res.status(404).json({ message: 'Usuário que responde é inexistente'});
    if(!post) return res.status(404).json({ message: 'Post não existe'});
    if(!content || !content.trim()) return res.status(400).json({ message: 'Conteúdo vázio'});

    const reply = await (await Reply.create({ postId, userId, content })).populate("userId", "nome permissions profilePicUrl")

    res.status(201).json(reply);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar resposta.', error: error.message });
  }
};
