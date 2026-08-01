import express from 'express';
import { login, getCurrentUser, forgotPassword } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.get('/me', authenticateToken, getCurrentUser);
router.post('/forgot-password', forgotPassword);

export default router;
