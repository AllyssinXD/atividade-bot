const EmailToken = require("../models/EmailToken");
const User = require("../models/User")
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')

exports.getUser = async (req, res) =>{
    try{
        const userId = req.params.userId

        const user = await User.findById(userId).select('-senhaHash -whatsapp -email');

        if(!user) return res.status(404).json({message: "Usuário não encontrado"})

        return res.status(200).json(user)
    } catch (error){
        return res.status(400).json({message: "Erro ao pegar usuário : " + error.message })
    }
}

exports.verifyUser = async (req, res)=>{
    try{
        const {userId, token} = req.params

        if(!userId || !token)  {
            console.log("Erro ao validar usuário : Id do usuário ou token não foi passado na url")
            return res.status(404).json({message: "Link invalido"})
        }

        console.log(userId, token)
        
        const user = await User.findOne({_id: userId})
        if(!user) {
            console.log("Erro ao validar usuário : Usuário não encontrado com base no id")
            return res.status(404).json({message: "Link invalido"})
        }

        const emailToken = await EmailToken.findOne({user: userId, token: token})
        if(!emailToken)  {
            console.log("Erro ao validar usuário : Token de email não encontrado no banco de dados")
            return res.status(404).json({message: "Link invalido"})
        }
        
        await User.updateOne({_id: userId},{emailVerificado: true})
        await EmailToken.deleteOne({_id: emailToken._id})

        const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        return res.status(200).json({token: jwtToken})
    } catch(error) {
        return res.status(400).json({message: "Erro ao verificar usuário : " + error.message })
    }
}

exports.setPerm = async (req, res) =>{
    try{
        const { userId, permission } = req.body

        if(!userId) return res.status(404).json({message: "Id do usuário não pode estar vazio"})
        if(!permission) return res.status(404).json({message: "A permissão não pode ser vazia"})

        const user = await User.findById(userId).select('-senhaHash');

        if(!user) return res.status(404).json({message: "Usuário não encontrado"})
        if(user.permissions.includes(permission)) return res.status(404).json({message: "Usuário já tem essa permissão"})

        user.permissions.push(permission)
        await user.save()

        return res.status(200).json({user: user})
    } catch(error){
        return res.status(400).json({message: "Erro ao dar permissão para usuário : " + error.message })
    }
}

exports.update = async (req, res) => {
    try{
        const userId = req.user.id
        const {nome, senha, whatsapp} = req.body

        console.log(nome, senha, whatsapp)
    
        const user = await User.findById(userId)

        if(!user) return res.status(404).json({message: "Não há usuário com esse id"})

        const update = {}

        if(nome) {
            // Trocar nome
            if(user.nome == nome) return res.status(400).json({message: "Não é possivel alterar o nome de usuário para o mesmo de antes."})
            
            const caracteresProibidos = "!@#$%¨&*()_+=-'\"\\.,?/<> "

            for(let i = 0; i < nome.length; i++){
                if(caracteresProibidos.includes(nome[i])) 
                    return res.status(400).json({message: "Não é possivel colocar caracteres especiais em nome de usuário"})
            }

            const existeUsuario = await User.find({nome: nome})
            if(existeUsuario.length > 0) return res.status(400).json({message: "Já existe um usuário com esse nome"})

            update.nome = nome
        }

        if(senha) {
            const mesmaSenha = await bcrypt.compare(senha, user.senhaHash);
            console.log(mesmaSenha)
            if(mesmaSenha) return res.status(400).json({message: "Não pode mudar a senha para a mesma de antes"})

            if(senha.length < 6) return res.status(400).json({message: "A senha deve ter pelo menos 6 digitos"})

            update.senhaHash = await bcrypt.hash(senha, 10)
        }

        if(whatsapp) {
            const mesmoWhatsapp = whatsapp == user.whatsapp;
            if(mesmoWhatsapp) return res.status(400).json({message: "Não pode mudar o whatsapp para a mesmo de antes."})
                
            if(whatsapp.length < 12 || whatsapp.length > 13) return res.status(400).json({message: "Número muito longo ou curto para ser válido"})

            const caracteresPermitidos = "1234567890"
            for(let i = 0; i<whatsapp.length;i++){
                if(!caracteresPermitidos.includes(whatsapp[i]))
                    return res.status(400).json({message: "Número mal formatado : inclua só digitos"})
            }

            update.whatsapp = whatsapp
            update.whatsappVerificado = false
        }

        await User.updateOne({_id: userId}, update)

        const updatedUser = await User.findById(userId).select("-senhaHash")

        return res.status(200).json(updatedUser)
    } catch (error) {
        return res.status(400).json({message: "Erro ao atualizar usuário " + error.message})
    }
}