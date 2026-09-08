import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  createReview,
  updateReview,
  getMyReviews,
  getAdminReviews,
  getAdminReviewById,
  deleteAdminReview,
  updateAdminReviewStatus,
    getTeachers,
  getTeacherCourses,
  getCourseReviews,
} from '../controllers/reviewController.js';

const router = express.Router();

router.post('/reviews', authenticate, authorize('student'), createReview);
router.put('/reviews/:id', authenticate, authorize('student'), updateReview);
router.get('/reviews/my', authenticate, authorize('student'), getMyReviews);

router.get('/admin/reviews', authenticate, authorize('superadmin'), getAdminReviews);
router.get('/admin/reviews/:id', authenticate, authorize('superadmin'), getAdminReviewById);
router.delete('/admin/reviews/:id', authenticate, authorize('superadmin'), deleteAdminReview);
router.patch('/admin/reviews/:id/status', authenticate, authorize('superadmin'), updateAdminReviewStatus);

router.get('/teachers', authenticate, authorize('superadmin'), getTeachers);
router.get('/teachers/:teacherId/courses', authenticate, authorize('superadmin'), getTeacherCourses);
router.get('/courses/:courseId/reviews', authenticate, authorize('superadmin'), getCourseReviews);
router.delete('/reviews/:id', authenticate, authorize('superadmin'), deleteAdminReview);

export default router;