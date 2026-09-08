import RetakeRequest from '../models/RetakeRequest.js';
import Submission from '../models/Submission.js';
import Test from '../models/Test.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const FINAL_SUBMISSION_STATUSES = ['submitted', 'graded', 'reviewed', 'finalized', 'evaluated'];

const logRetakeEvent = (event, data = {}) => {
  console.info(JSON.stringify({ level: 'info', event, timestamp: new Date().toISOString(), ...data }));
};

export const requestRetake = asyncHandler(async (req, res) => {
  const { testId, reason } = req.validatedBody;
  const studentId = req.user._id;
  const now = new Date();
  const submission = await Submission.findOne({ test: testId, student: studentId })
    .select('_id status isSubmitted student test attemptNumber retakeApproved retakeUsed');

  if (!submission) {
    return res.status(404).json({ success: false, message: 'Submission not found for this test' });
  }

  const isCompleted = submission.isSubmitted || FINAL_SUBMISSION_STATUSES.includes(submission.status);
  if (!isCompleted) {
    return res.status(400).json({ success: false, message: 'You can request a retake only after completing the submission' });
  }
if (submission.retakeApproved && !submission.retakeUsed) {
    const test = await Test.findById(testId).select('status startTime endTime');
    const isRetakeWindowOpen =
      Boolean(test) &&
      test.status !== 'draft' &&
      test.status !== 'ended' &&
      (!test.startTime || now >= test.startTime) &&
      (!test.endTime || now <= test.endTime);

    if (isRetakeWindowOpen) {
      return res.status(409).json({
        success: false,
        message: 'Retake already approved. You can join the test now.',
      });
    }

    await Submission.findOneAndUpdate(
      { _id: submission._id, student: studentId, test: testId, retakeApproved: true, retakeUsed: false },
      { $set: { retakeApproved: false } }
    );

    logRetakeEvent('retake_approval_expired_before_join', {
      studentId: String(studentId),
      testId: String(testId),
      submissionId: String(submission._id),
      testStatus: test?.status || 'unknown',
      testStartTime: test?.startTime || null,
      testEndTime: test?.endTime || null,

    });
  }

 const latestRequest = await RetakeRequest.findOne({ studentId, testId })
    .select('_id status')
    .sort({ createdAt: -1 });

  if (latestRequest?.status === 'pending') {
    return res.status(409).json({ success: false, message: 'A retake request is already pending for this test' });
  }
  if (latestRequest?.status === 'approved' && !submission.retakeUsed) {
    return res.status(409).json({
      success: false,
      message: 'Retake already approved. Start your retake before requesting again.',
    });
  }
  try {
    const request = await RetakeRequest.create({ studentId, testId, reason });
return res.status(201).json({
      success: true,
      data: {
        ...request.toObject(),
        retakeRequested: true,
        retakeRequestStatus: request.status,
        retakeReason: request.reason,
      },
      message: 'Retake request submitted successfully',
    });  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: 'A retake request is already pending for this test' });
    }
    throw error;
  }
});

export const approveRetakeRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const approverId = req.user._id;
  const message = req.validatedBody?.message?.trim() || '';
  const request = await RetakeRequest.findById(requestId).select('studentId testId status');
  if (!request) {
    return res.status(404).json({ success: false, message: 'Retake request not found' });
  }

  if (request.status !== 'pending') {
    return res.status(400).json({ success: false, message: `Retake request is already ${request.status}` });
  }

  if (req.user.role === 'teacher') {
    const ownsTest = await Test.exists({ _id: request.testId, createdBy: approverId });
    if (!ownsTest) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
  }

  const updatedRequest = await RetakeRequest.findOneAndUpdate(
    { _id: requestId, status: 'pending' },
    { $set: { status: 'approved', approvedBy: approverId, decisionMessage: message, reviewedAt: new Date() } },
        { new: true }
  );

  if (!updatedRequest) {
    return res.status(409).json({ success: false, message: 'Request status changed, please refresh and retry' });
  }

  await Submission.findOneAndUpdate(
    { test: request.testId, student: request.studentId },
    { $set: { retakeApproved: true, retakeUsed: false } }
  );

  logRetakeEvent('retake_request_approved', {
    requestId: String(updatedRequest._id),
    testId: String(request.testId),
    studentId: String(request.studentId),
    approvedBy: String(approverId),
  });

  res.json({ success: true, data: updatedRequest, message: 'Retake request approved' });
});

export const rejectRetakeRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const approverId = req.user._id;
  const message = req.validatedBody?.message?.trim() || '';
  const request = await RetakeRequest.findById(requestId).select('studentId testId status');
  if (!request) {
    return res.status(404).json({ success: false, message: 'Retake request not found' });
  }

  if (request.status !== 'pending') {
    return res.status(400).json({ success: false, message: `Retake request is already ${request.status}` });
  }

  if (req.user.role === 'teacher') {
    const ownsTest = await Test.exists({ _id: request.testId, createdBy: approverId });
    if (!ownsTest) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
  }

  const updatedRequest = await RetakeRequest.findOneAndUpdate(
    { _id: requestId, status: 'pending' },
    { $set: { status: 'rejected', approvedBy: approverId, decisionMessage: message, reviewedAt: new Date() } },
        { new: true }
  );

  if (!updatedRequest) {
    return res.status(409).json({ success: false, message: 'Request status changed, please refresh and retry' });
  }

  await Submission.findOneAndUpdate(
    { test: request.testId, student: request.studentId },
    { $set: { retakeApproved: false, retakeUsed: false } }
  );

  logRetakeEvent('retake_request_rejected', {
    requestId: String(updatedRequest._id),
    testId: String(request.testId),
    studentId: String(request.studentId),
    rejectedBy: String(approverId),
  });

  res.json({ success: true, data: updatedRequest, message: 'Retake request rejected' });
});

export const getRetakeRequestsForTest = asyncHandler(async (req, res) => {
  const { testId } = req.params;
  const { status = 'pending', page = 1, limit = 20 } = req.query;

  if (req.user.role === 'teacher') {
    const ownsTest = await Test.exists({ _id: testId, createdBy: req.user._id });
    if (!ownsTest) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
  }

  const normalizedStatus = ['pending', 'approved', 'rejected'].includes(String(status))
    ? String(status)
    : 'pending';
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const [requests, total] = await Promise.all([
    RetakeRequest.find({ testId, status: normalizedStatus })
      .populate('studentId', 'name studentId email')
      .populate('approvedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit),
    RetakeRequest.countDocuments({ testId, status: normalizedStatus }),
  ]);

  res.json({
    success: true,
    data: requests,
    meta: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      status: normalizedStatus,
    },
  });
});