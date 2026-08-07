const PublicPost = require("../models/PublicPost");
const User = require("../models/User");

exports.listarPosts = exports.criarPostPublico = async (req, res) => {
  try {
    const publicPosts = await PublicPost.find({}).sort({ createdAt: -1 }).populate("likes", "nome email").populate("userId", "nome permissions profilePicUrl")

    res.status(201).json(publicPosts);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao listar posts publicos.', error: error.message });
  }
};

exports.criarPost = async (req, res) => {
  try {
    const {titulo, conteudo} = req.body
    const userId = req.user.id

    const user = await User.findById(userId)

    if(!user) return res.status(404).json({ message: 'Usuário que cria post é inexistente'});
    if(!titulo || !conteudo) return res.status(400).json({ message: 'Titulo ou conteúdo vázio'});

    const publicPost = await (await (await PublicPost.create({titulo, conteudo, userId})).populate("likes", "nome")).populate("userId", "nome permissions profilePicUrl")

    res.status(201).json(publicPost);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar post publico.', error: error.message });
  }
};

exports.likePost = async (req, res) => {
  try {
    
    const postId = req.params.postId
    const action = req.params.action
    const userId = req.user.id

    const user = await User.findById(userId)
    const post = await PublicPost.findById(postId)

    if(!action) return res.status(404).json({ message: 'Ação não definida'});
    if(!user) return res.status(404).json({ message: 'Usuário que cria post é inexistente'});
    if(!post) return res.status(400).json({ message: 'Post não existe'});
    
    if(action == "like"){
      for(let i = 0; i<post.likes.length;i++){
        const like = post.likes[i]
        if(like == userId) {
          return res.status(400).json({ message: 'Você já deu like nesse post'});
        } 
      }

      post.likes.push(userId)
    }

    else if(action == "deslike"){
      if(!post.likes.includes(userId)) return res.status(400).json({ message: 'Like inexistente para ser tirado.'});

      post.likes = post.likes.filter(like=>like.toString() !== userId)
    }

    else {
      return res.status(400).json({ message: 'Ação não reconhecida.'});
    }

    await post.save();

    let newPost = await post.populate("likes", "nome");
    newPost = await post.populate("userId", "nome permissions profilePicUrl")

    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao gostar de post publico.' + error.message });
  }
};
