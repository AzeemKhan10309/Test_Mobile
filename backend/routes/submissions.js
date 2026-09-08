import express from 'express';
import {
  startTest, getTimer, saveAnswers, recordCheatingFlag,
 submitTest, forceSubmit, getResult, getSubmissionForExam, gradeOverride, gradeSubmission, getTestSubmissions, getMySubmissionStatus, heartbeat} from '../controllers/submissionController.js';
 import { authenticate, authorize } from '../middleware/auth.js';
import { cheatingFlagLimiter, saveAnswersLimiter, submitLimiter } from '../middleware/rateLimiter.js';
import { validateBody, startTestSchema, saveAnswersSchema, cheatingFlagSchema } from '../middleware/validators.js';
 const router = express.Router();
router.use(authenticate);

router.post('/start', authorize('student'), validateBody(startTestSchema), startTest);
router.get('/status/test/:testId', authorize('student'), getMySubmissionStatus);
router.get('/test/:testId', authorize('teacher', 'superadmin'), getTestSubmissions);
router.get('/:submissionId/timer', authorize('student'), getTimer);
router.put('/:submissionId/answers', authorize('student'), saveAnswersLimiter, validateBody(saveAnswersSchema), saveAnswers);
router.post('/:submissionId/flag', authorize('student'), cheatingFlagLimiter, validateBody(cheatingFlagSchema), recordCheatingFlag);
router.post('/:submissionId/heartbeat', authorize('student'), heartbeat);
router.post('/:submissionId/submit', authorize('student'), submitLimiter, submitTest);
router.get('/:submissionId', authorize('student'), getSubmissionForExam);
router.post('/:submissionId/force-submit', authorize('teacher', 'superadmin'), forceSubmit);
router.get('/:submissionId/result', authorize('student', 'teacher', 'superadmin'), getResult);
router.patch('/:submissionId/grade', authorize('teacher', 'superadmin'), gradeSubmission);
router.put('/:submissionId/grade-override', authorize('teacher', 'superadmin'), gradeOverride);

export default router;
