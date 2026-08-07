// routes/ReplyRoutes.js

const express = require('express');
const router = express.Router();
const replies = require('../controllers/replyController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/:postId', authMiddleware, replies.listarReplies);
router.post('/', authMiddleware, replies.criarReply);

module.exports = router;
