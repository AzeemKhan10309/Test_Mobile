import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getChatPartners, getMessages, sendMessage } from '../controllers/chatController.js';

const router = express.Router();

router.use(authenticate);
router.get('/partners', getChatPartners);
router.get('/messages/:userId', getMessages);
router.post('/messages/:userId', sendMessage);

export default router;