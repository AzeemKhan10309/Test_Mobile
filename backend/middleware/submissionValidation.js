import Submission from '../models/Submission.js';
import { asyncHandler } from './errorHandler.js';

const FINAL_SUBMISSION_STATUSES = ['submitted', 'graded', 'reviewed', 'finalized', 'evaluated'];
export const preventReattemptIfSubmitted = asyncHandler(async (req, res, next) => {
  const testId = req.body.testId || req.params.testId;

  if (!testId) {
    return res.status(400).json({ success: false, message: 'testId is required' });
  }

  const existing = await Submission.findOne({
    test: testId,
    student: req.user._id,
    $or: [{ isSubmitted: true }, { status: { $in: FINAL_SUBMISSION_STATUSES } }],
  }).select('_id status submittedAt isSubmitted');

  if (existing) {
    return res.status(409).json({
      success: false,
      code: 'TEST_ALREADY_SUBMITTED',
      message: 'Test already submitted. Reattempt not allowed.',
      data: {
        submissionId: existing._id,
        status: existing.status,
        submittedAt: existing.submittedAt,
      },
    });
  }

  next();
});

export const ensureSubmissionIsActive = asyncHandler(async (req, res, next) => {
  const submission = await Submission.findOne({
    _id: req.params.submissionId,
    student: req.user._id,
  }).select('_id status isSubmitted submittedAt');

  if (!submission) {
    return res.status(404).json({ success: false, message: 'Submission not found' });
  }

  if (submission.isSubmitted || submission.status !== 'in_progress') {
    return res.status(409).json({
      success: false,
      code: 'TEST_ALREADY_SUBMITTED',
      message: 'Test already submitted. Reattempt not allowed.',
      data: {
        submissionId: submission._id,
        status: submission.status,
        submittedAt: submission.submittedAt,
      },
    });
  }

  req.activeSubmissionId = submission._id;
  next();
});