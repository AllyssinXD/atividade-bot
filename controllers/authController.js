// controllers/authController.js

const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const emailService = require("../utils/emailService")
const EmailToken = require('../models/EmailToken')

const SECRET = process.env.JWT_SECRET || 'meusegredoseguro'; // Melhor usar env

// Cadastro
exports.register = async (req, res) => {
  try {
    let { nome, email, senha, whatsapp, tipo } = req.body;

    if (!nome || !email || !senha || !whatsapp || !tipo) {
      return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }

    if (senha.length < 6) {
      return res.status(400).json({ message: 'A senha deve ter pelo menos 6 caracteres.' });
    }

    const naoPermitidos = "#$%¨&*()[]\´~!.,/-+:°?-"
    for(let char of nome){
      if(naoPermitidos.includes(char)){
        return res.status(400).json({ message: 'Nome não pode conter caracteres especiais.' });
      }
    }

    // Limpa o número do WhatsApp (remove +, (), espaços etc.)
    whatsapp = whatsapp.replace(/\D/g, '');

    if (whatsapp.length < 12 || whatsapp.length > 13) {
      return res.status(400).json({ message: 'Número de WhatsApp inválido. Use o formato com DDI e DDD (ex: 5511999999999).' });
    }

    const userExists = await User.findOne({ $or: [{ email }, { nome }, { whatsapp }] });

    if (userExists) {
      if (userExists.email === email) return res.status(400).json({ message: 'Já existe um usuário com esse email' });
      if (userExists.nome === nome) return res.status(400).json({ message: 'Já existe um usuário com esse nome de usuário' });
      if (userExists.whatsapp === whatsapp) return res.status(400).json({ message: 'Já existe um usuário com esse número de whatsapp' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const existingUsers = await User.countDocuments();
    const permissions = ['member', 'create-posts', 'delete-own-posts', 'update-own-posts'];

    if (existingUsers < 50) {
      permissions.push('founder');
    }

    const user = await User.create({ nome, email, senhaHash, whatsapp, tipo, permissions });

    const emailToken = await EmailToken.create({
      user: user._id,
      token: crypto.randomBytes(32).toString("hex")
    });

    const url = `${process.env.HOST}/usuario/${emailToken.user}/verificar/${emailToken.token}`

    emailService.sendEmail(user.email, "Verifique seu Email", " Seu link de verificação ",
      `<h1> Olá! Você criou uma conta na Notifiq! </h1>
       <br>
       <p>Verifique seu email com esse link : ${url} </p>`
    );

    res.status(201).json({ message: "Usuário criado" });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao cadastrar.', error: error.message });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });

    const valid = await bcrypt.compare(senha, user.senhaHash);
    if (!valid) return res.status(401).json({ message: 'Senha incorreta.' });

    if(!user.emailVerificado) {
      const emailToken = await EmailToken.findOne({user: user._id})

      if(!emailToken){
        const newEmailToken = await EmailToken.create({
          user: user._id,
          token: crypto.randomBytes(32).toString("hex")
        })

        const url = `${process.env.HOST}/usuario/${newEmailToken.user}/verificar/${newEmailToken.token}`

        emailService.sendEmail(user.email, "Verifique seu Email", " Seu link de verificação ", 
          `<h1> Olá! Você criou uma conta na Notifiq! </h1>
          <br>
          <p>Verifique seu email com esse link : ${url} </p>`
        )
      }

      return res.status(400).json({ message: 'Verfique seu email. Um novo link de verificação foi enviado' });
    }

    const token = jwt.sign({ id: user._id }, SECRET, { expiresIn: '7d' });

    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao logar.', error: error.message });
  }
};

exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-senhaHash');
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar usuário.', error: error.message });
  }
}