import express from 'express';
import { gradeAnswer } from '../controllers/aiController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();
router.use(authenticate, authorize('teacher', 'superadmin'), aiLimiter);
router.post('/grade-answer', gradeAnswer);
export default router;
