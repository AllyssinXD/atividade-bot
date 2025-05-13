// routes/turmaRoutes.js

const express = require('express');
const router = express.Router();
const turmaController = require('../controllers/turmaController');
const authMiddleware = require('../middlewares/authMiddleware');

const Turma = require('../models/Turma');

router.post('/', authMiddleware, turmaController.criarTurma);
router.get('/', authMiddleware, turmaController.listarTurmas);
router.post('/entrar', authMiddleware, turmaController.entrarTurma);
router.get('/:turmaId', authMiddleware, turmaController.pegarTurma);
router.post('/sair/:turmaId', authMiddleware, turmaController.sairTurma);
router.delete('/:turmaId', authMiddleware, turmaController.deletarTurma);

module.exports = router;