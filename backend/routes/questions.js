import express from 'express';
import { addQuestion, updateQuestion, deleteQuestion, bulkDeleteQuestions } from '../controllers/questionController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate, authorize('teacher', 'superadmin'));
router.post('/test/:testId', addQuestion);
router.put('/:id', updateQuestion);
router.delete('/:id', deleteQuestion);
router.post('/bulk-delete', bulkDeleteQuestions);
export default router;
