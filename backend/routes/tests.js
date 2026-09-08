import express from 'express';
import {
  getTests, getTest, createTest, updateTest, deleteTest,
  publishTest, endTest, getTestByShareLink, getTestQuestions, getTestStudents,
} from '../controllers/testController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public
router.get('/join/:shareLink', getTestByShareLink);

// Authenticated
router.use(authenticate);
router.get('/', authorize('teacher', 'superadmin'), getTests);
router.post('/', authorize('teacher', 'superadmin'), createTest);
router.get('/:id', getTest);
router.put('/:id', authorize('teacher', 'superadmin'), updateTest);
router.delete('/:id', authorize('teacher', 'superadmin'), deleteTest);
router.post('/:id/publish', authorize('teacher', 'superadmin'), publishTest);
router.post('/:id/end', authorize('teacher', 'superadmin'), endTest);
router.get('/:id/questions', getTestQuestions);
router.get('/:id/students', authorize('teacher', 'superadmin'), getTestStudents);

export default router;
