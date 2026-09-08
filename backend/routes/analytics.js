import express from 'express';
import { getTestAnalytics, getTeacherDashboard, getStudentAnalytics } from '../controllers/analyticsController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);
router.get('/dashboard', authorize('teacher', 'superadmin'), getTeacherDashboard);
router.get('/test/:testId', authorize('teacher', 'superadmin'), getTestAnalytics);
router.get('/student/:studentId', getStudentAnalytics);
export default router;
