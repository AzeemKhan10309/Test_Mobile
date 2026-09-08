import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateBody, retakeDecisionSchema, retakeRequestSchema } from '../middleware/validators.js';
import { approveRetakeRequest, getRetakeRequestsForTest, rejectRetakeRequest, requestRetake } from '../controllers/retakeController.js';

const router = express.Router();

router.use(authenticate);

router.post('/request', authorize('student'), validateBody(retakeRequestSchema), requestRetake);
router.get('/test/:testId/requests', authorize('teacher', 'superadmin'), getRetakeRequestsForTest);
router.post('/:requestId/approve', authorize('teacher', 'superadmin'), validateBody(retakeDecisionSchema), approveRetakeRequest);
router.post('/:requestId/reject', authorize('teacher', 'superadmin'), validateBody(retakeDecisionSchema), rejectRetakeRequest);

export default router;