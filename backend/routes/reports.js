/**
 * Report Routes — PDF generation
 */

import express from 'express';
import Submission from '../models/Submission.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { generateResultPDF } from '../services/pdfService.js';

const router = express.Router();
router.use(authenticate);

/**
 * GET /api/reports/result/:submissionId
 * Download a PDF result report
 */
router.get('/result/:submissionId', asyncHandler(async (req, res) => {
  const query = { _id: req.params.submissionId };
  if (req.user.role === 'student') query.student = req.user._id;

  const submission = await Submission.findOne(query)
    .populate('student', 'name studentId email')
    .populate({ path: 'answers.question', select: 'questionText type options correctAnswer marks' })
    .populate('test', 'title subject settings passingMarks');

  if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });
  if (submission.status === 'in_progress') return res.status(400).json({ success: false, message: 'Test not submitted yet' });

  const pdfBuffer = await generateResultPDF(submission);

  const filename = `result_${submission.student?.studentId || submission.student?._id}_${Date.now()}.pdf`;
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length': pdfBuffer.length,
  });
  res.send(pdfBuffer);
}));

export default router;
