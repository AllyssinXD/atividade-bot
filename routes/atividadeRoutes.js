// routes/atividadeRoutes.js

const express = require('express');
const router = express.Router();
const atividadeController = require('../controllers/atividadeController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get("/", authMiddleware, atividadeController.pegarAgenda);
router.get("/:turmaId", authMiddleware, atividadeController.pegarAtividades);
router.get('/:turmaId/:atividadeId', authMiddleware, atividadeController.pegarAtividade)
router.patch('/entregar/:atividadeId', authMiddleware, atividadeController.entregarAtividade)
router.patch('/:turmaId/:atividadeId', authMiddleware, atividadeController.atualizarAtividade)
router.delete('/:turmaId/:atividadeId', authMiddleware, atividadeController.deletarAtividade)
router.post('/', authMiddleware, atividadeController.criarAtividade);


module.exports = router;