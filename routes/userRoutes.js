const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/:userId', authMiddleware, userController.getUser);
router.get('/:userId/verify/:token', userController.verifyUser);
router.patch('/update', authMiddleware, userController.update);
router.patch('/profile-pic', authMiddleware, userController.uploadProfilePic);
router.patch('/give-perm', authMiddleware, userController.setPerm);

module.exports = router;