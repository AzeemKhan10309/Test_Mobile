import express from 'express';
import {
  evaluateSubmission,
  getTeacherCourses,
  getTeacherSubmission,
  getTeacherSubmissions,
  getTeacherTests,
} from '../controllers/teacherEvaluationController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('teacher', 'superadmin'));

router.get('/courses', getTeacherCourses);
router.get('/tests', getTeacherTests);
router.get('/submissions', getTeacherSubmissions);
router.get('/submission/:id', getTeacherSubmission);
router.patch('/submission/:id/evaluate', evaluateSubmission);

export default router;