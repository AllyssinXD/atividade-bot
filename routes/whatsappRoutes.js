const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware')

const WhatsappCode = require('../models/WhatsappCode')
const User = require('../models/User')
const whatsappService = require('../services/whatsappService')

const { customAlphabet } = require('nanoid');

const generateCodigo = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);

const router = express.Router();

router.post("/send-code", authMiddleware, async (req, res)=>{
    try{
        const userId = req.user.id

        const user = await User.findById(userId)
        if(user.whatsappVerificado) return res.status(400).json({ message: 'Usuário já verificou whatsapp.' })

        let whatsappCode = await WhatsappCode.findOne({user: userId})
        if(!whatsappCode) {
            whatsappCode = await WhatsappCode.create({ user: userId, codigo: generateCodigo() })

            await whatsappService.sendMessage(user.whatsapp, `Olá ${user.nome}! Aqui está seu código de verificação : ${whatsappCode.codigo}. \n\n Se você não fez uma conta, por favor, ignore esta mensagem.`)
            console.log("Enviou código para : " + user.whatsapp)

            return res.status(200).json({ message: 'Codigo enviado.' })
        }

        const createdAt = new Date(whatsappCode.createdAt).getTime()
        const now = new Date(Date.now()).getTime()

        const minutes = ( now - createdAt ) / 1000 / 60

        if(minutes <= 5) return res.status(400).json({ message: 'Aguarde alguns minutos para enviar novamente' })

        await WhatsappCode.deleteOne({_id: whatsappCode._id })
        whatsappCode = await WhatsappCode.create({ user: userId, codigo: generateCodigo() })

        await whatsappService.sendMessage(user.whatsapp, `Olá ${user.nome}! Aqui está seu código de verificação : ${whatsappCode.codigo}. \n\n Se você não fez uma conta, por favor, ignore esta mensagem.`)
        console.log("Enviou código para : " + user.whatsapp)

        return res.status(200).json({ message: 'Codigo enviado.' })
    } catch (error) {
        return res.status(400).json({ message: 'Erro ao enviar código: ' + error.message })
    }
})

router.post("/verify-code", authMiddleware, async (req, res)=>{
    try{
        const userId = req.user.id
        const {codigo} = req.body

        if(!codigo) return res.status(400).json({ message: 'Codigo não pode estar vazio.' })

        const user = await User.findById(userId)

        const whatsappCode = await WhatsappCode.findOne({user: user._id})

        if(!whatsappCode) return res.status(400).json({ message: 'Codigo ainda não foi enviado.' })
        if(whatsappCode.codigo != codigo) return res.status(400).json({ message: 'Codigo não coincide.' })

        await WhatsappCode.deleteOne({_id: whatsappCode._id})
        user.whatsappVerificado = true
        await user.save()

        await whatsappService.sendMessage(user.whatsapp, `* Seu whatsapp foi verificado com sucesso! * Agora você poderá receber notificações de atividades próximas.`)

        return res.status(200).json({message: 'Whatsapp verificado.'})
    } catch(error) {
        return res.status(400).json({ message: 'Erro ao verificar whatsapp. ' + error.message })
    }
})

module.exports = router
