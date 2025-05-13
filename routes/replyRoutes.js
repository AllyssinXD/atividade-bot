const express = require('express');
const router = express.Router();

const replyController = require('../controllers/replyController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/', authMiddleware, replyController.createReply);
router.get('/:postId', authMiddleware, replyController.getReplies);

module.exports = router;