/**
 * Submission Controller
 * Handles exam attempts, auto-save, timer sync, and grading
 */

import Submission from '../models/Submission.js';
import Test from '../models/Test.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Question from '../models/Question.js';
import Result from '../models/results.js';
import RetakeRequest from '../models/RetakeRequest.js';
import cache from '../config/redis.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { io } from '../server.js';
import crypto from 'crypto';
import { enqueueEvaluationJob } from '../queues/evaluation.queue.js';
import { evaluateSubmissionById } from '../workers/evaluation.worker.js';
const TIMER_KEY = (testId, userId) => `timer:${testId}:${userId}`;
const FINAL_SUBMISSION_STATUSES = ['submitted', 'graded', 'reviewed', 'finalized', 'evaluated'];
const EVALUATION_PENDING_STATUSES = ['pending', 'failed'];

const logEvent = (event, data = {}) => {
  console.info(JSON.stringify({ level: 'info', event, timestamp: new Date().toISOString(), ...data }));
};
/**
 * POST /api/submissions/start
 * Start a test attempt
 */
export const startTest = asyncHandler(async (req, res) => {
  const { testId, accessCode } = req.validatedBody;
  const studentId = req.user._id;
   const test = await Test.findById(testId)
 .select('questions duration status startTime endTime allowedStudents isPublic requireAccessCode accessCode createdBy course') .lean();
  if (!test) return res.status(404).json({ success: false, message: 'Test not found' });
  // Check test availability
  const now = new Date();
  if (test.status === 'draft') return res.status(403).json({ success: false, message: 'Test not published' });
  if (test.status === 'ended') return res.status(410).json({ success: false, message: 'Test has ended' });
  if (test.startTime && now < test.startTime) return res.status(403).json({ success: false, message: 'Test has not started' });
  if (test.endTime && now > test.endTime) return res.status(410).json({ success: false, message: 'Test has ended' });
  const hasExplicitAllowList = Array.isArray(test.allowedStudents) && test.allowedStudents.length > 0;
  const isAllowedStudent = (test.allowedStudents || []).some((id) => id.toString() === studentId.toString());
    if (!test.isPublic) {
    let eligible = false;
    if (hasExplicitAllowList) {
      eligible = isAllowedStudent;
    } else if (test.course) {
      const course = await Course.findOne({
        _id: test.course,
        students: studentId,
      }).select('_id');
      eligible = Boolean(course);
    }
    if (!eligible) {
      return res.status(403).json({ success: false, message: 'You are not enrolled for this test' });
    }
  }

  if (test.requireAccessCode) {
    const incomingCode = String(accessCode || '').trim().toUpperCase();
    if (!incomingCode) {
      return res.status(400).json({ success: false, code: 'ACCESS_CODE_REQUIRED', message: 'Access code is required for this test' });
    }
    if (String(test.accessCode || '').trim().toUpperCase() !== incomingCode) {
      return res.status(403).json({ success: false, code: 'ACCESS_CODE_INVALID', message: 'Invalid test access code' });
    }
  }
  logEvent('test_join_attempt', {
    requestId: req.id,
    studentId: String(studentId),
    testId: String(testId),
    requireAccessCode: Boolean(test.requireAccessCode),
  });
  // One submission per student+test: resume if active, block if already submitted.
  const questionIds = Array.isArray(test.questions) ? test.questions : [];
  const questions = questionIds.length
    ? await Question.find({ _id: { $in: questionIds } }).select('_id type marks').lean()
    : [];
  const questionMap = new Map(questions.map((q) => [String(q._id), q]));
  const orderedQuestions = questionIds
    .map((id) => questionMap.get(String(id)))
    .filter(Boolean);
  const totalMarks = orderedQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);
  const durationSeconds = test.duration * 60;

const upsertResult = await Submission.updateOne(
    { test: testId, student: studentId },
    {
      $setOnInsert: {
        test: testId,
        student: studentId,
        status: 'in_progress',
        startedAt: now,
        maxScore: totalMarks,
        remainingTime: durationSeconds,
        attemptNumber: 1,
        browserInfo: {
          userAgent: req.headers['user-agent'],
          ip: req.ip,
        },
        answers: orderedQuestions.map((q) => ({
          question: q._id,
          questionType: q.type,
          type: ['mcq', 'true_false'].includes(q.type) ? 'mcq' : q.type === 'short' ? 'short' : 'long',
                    maxMarks: q.marks,
          autoScore: 0,
          manualScore: null,
          manualRequired: !['mcq', 'true_false'].includes(q.type),
                })),
        heartbeat: {
          token: crypto.randomBytes(16).toString('hex'),
          lastSeenAt: now,
        },
      },
    },
    { upsert: true },
  );
 const submission = await Submission.findOne({ test: testId, student: studentId });
  if (!submission) {
    return res.status(500).json({ success: false, message: 'Failed to initialize test attempt' });
  }
  
  
if (submission.isSubmitted || FINAL_SUBMISSION_STATUSES.includes(submission.status)) {
  const canRetake = Boolean(submission.retakeApproved) && !submission.retakeUsed;
      if (canRetake) {
      const resetAnswers = orderedQuestions.map((q) => ({
        question: q._id,
        questionType: q.type,
        type: ['mcq', 'true_false'].includes(q.type) ? 'mcq' : q.type === 'short' ? 'short' : 'long',
                maxMarks: q.marks,
        autoScore: 0,
        manualScore: null,
        manualRequired: !['mcq', 'true_false'].includes(q.type),
            }));
      const restarted = await Submission.findOneAndUpdate(
        {
          _id: submission._id,
          student: studentId,
          status: { $in: FINAL_SUBMISSION_STATUSES },
                   retakeApproved: true,
          retakeUsed: false,
        },
        {
          $set: {
            status: 'in_progress',
            isSubmitted: false,
                        retakeUsed: true,
            gradingLock: false,
            startedAt: now,
            submittedAt: null,
            answers: resetAnswers,
            timeSpent: 0,
            remainingTime: durationSeconds,
            evaluationStatus: 'pending',
            autoMarks: 0,
            manualMarks: 0,
            totalMarks: 0,
            totalScore: 0,
            heartbeat: {
              token: crypto.randomBytes(16).toString('hex'),
              lastSeenAt: now,
            },
          },
          $inc: { attemptNumber: 1 },
        },
        { new: true },
      );
      if (restarted) {
        await cache.set(TIMER_KEY(testId, studentId), String(durationSeconds), { EX: durationSeconds + 60 });
        return res.status(201).json({
          success: true,
          data: {
            submission: restarted,
            remainingTime: durationSeconds,
            isResumed: false,
            isRetake: true,
            heartbeatToken: restarted.heartbeat?.token,
            heartbeatIntervalSeconds: 10,
          },
        });
      }
    }
    return res.status(409).json({
      success: false,
      code: 'RETAKE_NOT_ALLOWED',
      message: 'Test already submitted. Retake not allowed without teacher approval.',
data: { submissionId: submission._id, status: submission.status, submittedAt: submission.submittedAt, attemptNumber: submission.attemptNumber || 1, retakeApproved: submission.retakeApproved, retakeUsed: submission.retakeUsed },    });
  }

 if (submission.status === 'in_progress' && upsertResult.upsertedCount !== 1) {
    const elapsed = Math.floor((Date.now() - submission.startedAt.getTime()) / 1000);
    if (elapsed > durationSeconds + 120) {
      await autoSubmit(submission._id, 'auto_time');
      return res.status(409).json({ success: false, code: 'DEADLINE_EXCEEDED', message: 'Attempt auto-submitted due to deadline drift.' });
    }

   const remainingTime = Math.max(0, durationSeconds - elapsed);
    await cache.set(TIMER_KEY(testId, studentId), String(remainingTime), { EX: Math.max(remainingTime, 1) + 60 });
    return res.json({
      success: true,
      data: { submission, remainingTime, isResumed: true, heartbeatToken: submission.heartbeat?.token, heartbeatIntervalSeconds: 10 },
    });
  }

  // Set timer in cache
  await cache.set(TIMER_KEY(testId, studentId), String(durationSeconds), { EX: durationSeconds + 60 });

  // Notify teacher via socket
  io.to(`teacher:${test.createdBy}`).emit('student_started', {
    studentId,
    testId,
    studentName: req.user.name,
    startedAt: now,
  });

  await User.findByIdAndUpdate(studentId, { $inc: { testsAttempted: 1 } });

  res.status(201).json({
    success: true,
    data: {
      submission,
      remainingTime: durationSeconds,
      isResumed: false,
      heartbeatToken: submission.heartbeat?.token,
      heartbeatIntervalSeconds: 10,
      },
  });
});

/**
 * GET /api/submissions/:submissionId/timer
 * Get remaining time (synced from backend)
 */
export const getTimer = asyncHandler(async (req, res) => {
  const submission = await Submission.findById(req.params.submissionId).select('test student startedAt remainingTime status heartbeat');
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });
  if (submission.student.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Access denied' });

// Always derive from startedAt to avoid drift/restart when clients sync intermittently.
  const test = await Test.findById(submission.test).select('duration');
  const elapsed = Math.floor((Date.now() - submission.startedAt.getTime()) / 1000);
  const remaining = Math.max(0, test.duration * 60 - elapsed);
  await cache.set(TIMER_KEY(submission.test, req.user._id), String(remaining), { EX: Math.max(remaining, 1) + 60 });
if (submission.heartbeat?.lastSeenAt) {
    const missedHeartbeatMs = Date.now() - new Date(submission.heartbeat.lastSeenAt).getTime();
    if (missedHeartbeatMs > 45000 && submission.status === 'in_progress') {
            return res.json({ success: true, data: { remaining, autoSubmitted: false, warning: 'heartbeat_timeout' } });
    }
  }
  // Auto-submit if time expired
  if (remaining <= 0 && submission.status === 'in_progress') {
    await autoSubmit(submission._id, 'auto_time');
    return res.json({ success: true, data: { remaining: 0, autoSubmitted: true } });
  }



  res.json({ success: true, data: { remaining } });
});

/**
 * PUT /api/submissions/:submissionId/answers
 * Auto-save answers
 */
export const saveAnswers = asyncHandler(async (req, res) => {
  const { answers } = req.validatedBody;
  const submission = await Submission.findOne({
    _id: req.params.submissionId,
    student: req.user._id,
    status: 'in_progress',
  }).select('_id gradingLock');
  if (!submission) return res.status(404).json({ success: false, message: 'Active submission not found' });
  if (submission.gradingLock) {
    return res.status(409).json({ success: false, code: 'SUBMISSION_IN_PROGRESS', message: 'Submission is being finalized' });
  }


const now = new Date();
  const updates = [];
    for (const incoming of answers) {
const answer = { answeredAt: now };
    if (incoming.selectedOption !== undefined) answer.selectedOption = incoming.selectedOption;
    if (incoming.textAnswer !== undefined) answer.textAnswer = incoming.textAnswer;
    if (incoming.markedForReview !== undefined) answer.markedForReview = incoming.markedForReview;
    updates.push({
      updateOne: {
        filter: { _id: submission._id, 'answers.question': incoming.questionId },
        update: { $set: Object.fromEntries(Object.entries(answer).map(([k, v]) => [`answers.$.${k}`, v])) },
      },
    });
  }

  if (updates.length > 0) await Submission.bulkWrite(updates, { ordered: false });
    res.json({ success: true, message: 'Answers saved' });
});

/**
 * POST /api/submissions/:submissionId/flag
 * Record a cheating flag
 */
export const recordCheatingFlag = asyncHandler(async (req, res) => {
  const { type, details, screenshot, heartbeatToken } = req.validatedBody;

  const submission = await Submission.findOne({
    _id: req.params.submissionId,
    student: req.user._id,
    status: 'in_progress',
  });
  if (!submission) return res.status(404).json({ success: false, message: 'Active submission not found' });

  const test = await Test.findById(submission.test).select('settings createdBy');
  const maxViolations = test.settings?.maxTabSwitches || 3;
const advisoryOnly = [
    'tab_switch', 'window_blur', 'copy_paste', 'right_click', 'keyboard_shortcut',
    'inactivity', 'multiple_screen_exit',
  ].includes(type);
    submission.cheatingFlags.push({ type, details, screenshot });
const anomalyDelta = advisoryOnly ? 1 : 1.5;
  submission.violationCount += anomalyDelta;
  submission.heartbeat = submission.heartbeat || {};
  if (heartbeatToken && submission.heartbeat.token && heartbeatToken !== submission.heartbeat.token) {
    submission.violationCount += 2;
    submission.cheatingFlags.push({ type: 'keyboard_shortcut', details: 'Invalid heartbeat signature' });
  }
  await submission.save();

  // Notify teacher
  io.to(`teacher:${test.createdBy}`).emit('cheating_detected', {
    submissionId: submission._id,
    studentId: req.user._id,
    studentName: req.user.name,
    type,
    violationCount: submission.violationCount,
    autoSubmitted: false,
    });

  res.json({
    success: true,
    data: {
      violationCount: submission.violationCount,
      maxViolations,
autoSubmitted: false,
      warning: submission.violationCount >= maxViolations
        ? 'Final warning: Further violations may affect your test.'
        : 'Violation detected: Please stay active on the test screen.',
          },
  });
});
export const heartbeat = asyncHandler(async (req, res) => {
  const { heartbeatToken } = req.body || {};
  const submission = await Submission.findOne({
    _id: req.params.submissionId,
    student: req.user._id,
    status: 'in_progress',
  }).select('_id heartbeat');
  if (!submission) return res.status(404).json({ success: false, message: 'Active submission not found' });
  if (!heartbeatToken || heartbeatToken !== submission.heartbeat?.token) {
    return res.status(403).json({ success: false, message: 'Invalid heartbeat token' });
  }
  submission.heartbeat.lastSeenAt = new Date();
  await submission.save();
  res.json({ success: true });
});
/**
 * POST /api/submissions/:submissionId/submit
 * Final submit
 */
export const submitTest = asyncHandler(async (req, res) => {
  const submitRequestId = String(req.headers['idempotency-key'] || req.headers['x-submit-attempt-id'] || '').trim();
  logEvent('test_submit_header_received', {
    requestId: req.id,
    submissionId: String(req.params.submissionId),
    studentId: String(req.user._id),
    hasIdempotencyKey: Boolean(req.headers['idempotency-key']),
    hasSubmitAttemptHeader: Boolean(req.headers['x-submit-attempt-id']),
    submitRequestId: submitRequestId || null,
  });
  if (submitRequestId) {
    const existingByRequest = await Submission.findOne({
      _id: req.params.submissionId,
      student: req.user._id,
      submitRequestId,
      status: { $in: FINAL_SUBMISSION_STATUSES },
    }).populate({ path: 'test', populate: { path: 'questions' } });
    if (existingByRequest) {
      return res.json({ success: true, data: existingByRequest, message: 'Submission already processed' });
    }
  }
  const lockedSubmission = await Submission.findOneAndUpdate({
        _id: req.params.submissionId,
    student: req.user._id,
  status: 'in_progress',
    isSubmitted: false,
    gradingLock: { $ne: true },
 }, {
    $set: { gradingLock: true },
 }, { new: true }).populate({ path: 'test', populate: { path: 'questions' } });

 if (!lockedSubmission) {
    const submission = await Submission.findOne({
      _id: req.params.submissionId,
      student: req.user._id,
    }).populate({ path: 'test', populate: { path: 'questions' } });


if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });
    if (submission.isSubmitted || FINAL_SUBMISSION_STATUSES.includes(submission.status)) {
       if (EVALUATION_PENDING_STATUSES.includes(submission.evaluationStatus) && submission.test?._id) {
        await enqueueEvaluationJob({
          submissionId: submission._id.toString(),
          testId: submission.test._id.toString(),
        });
      }
      logEvent('test_submit_duplicate', {
        requestId: req.id,
        submissionId: String(submission._id),
        studentId: String(req.user._id),
        status: submission.status,
      });
      return res.json({ success: true, data: submission, message: 'Submission already processed' });
    }
    return res.status(409).json({ success: false, code: 'SUBMISSION_IN_PROGRESS', message: 'Submission is currently being processed' });
  }


logEvent('test_submit_requested', {
    requestId: req.id,
    submissionId: String(lockedSubmission._id),
    studentId: String(req.user._id),
  });
    const result = await finalizeSubmissionAndQueue(lockedSubmission, 'manual', { submitRequestId: submitRequestId || null });
  res.json({ success: true, data: result, message: 'Submission accepted. Evaluation is in progress.' });
});

/**
 * POST /api/submissions/:submissionId/force-submit
 * Teacher force-submits a student
 */
export const forceSubmit = asyncHandler(async (req, res) => {
  const submission = await Submission.findById(req.params.submissionId);
  if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });

  const test = await Test.findOne({ _id: submission.test, createdBy: req.user._id });
  if (!test) return res.status(403).json({ success: false, message: 'Access denied' });

  await autoSubmit(submission._id, 'force_submit');

  // Notify student
  io.to(`student:${submission.student}`).emit('force_submitted', {
    message: 'Your test has been submitted by the teacher',
  });

  res.json({ success: true, message: 'Student submission forced' });
});

/**
 * GET /api/submissions/:submissionId/result
 * Get result for a submitted test
 */
export const getResult = asyncHandler(async (req, res) => {
    const submission = await Submission.findById(req.params.submissionId)
    .populate('student', 'name studentId email')
    .populate({
      path: 'answers.question',
      select: 'questionText type options correctAnswer explanation marks',
    })
    .populate({ path: 'test', select: 'title duration passingMarks settings createdBy questions', populate: { path: 'questions', select: 'type' } });

  if (!submission) return res.status(404).json({ success: false, message: 'Result not found' });
  if (submission.status === 'in_progress') return res.status(400).json({ success: false, message: 'Test not yet submitted' });
if (req.user.role === 'student' && submission.student?._id?.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  if (req.user.role === 'teacher' && submission.test?.createdBy?.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
const questions = Array.isArray(submission.test?.questions) ? submission.test.questions : [];
  const normalizedQuestionType = (value) => String(value || '').toLowerCase();
  const totalMcqs = questions.filter((q) => ['mcq', 'true_false'].includes(normalizedQuestionType(q?.type))).length;
    const correctMcqs = (submission.answers || []).filter((answer) => {
    const type = normalizedQuestionType(answer?.type || answer?.questionType || answer?.question?.type);
    return ['mcq', 'true_false'].includes(type) && answer?.isCorrect === true;
    }).length;
    const mcqMarks = (submission.answers || [])
    .filter((answer) => {
      const type = normalizedQuestionType(answer?.type || answer?.questionType || answer?.question?.type);
      return ['mcq', 'true_false'].includes(type);
    })
    .reduce((sum, answer) => sum + Number(answer?.autoScore || 0), 0);

 res.json({
    success: true,
    data: {
      ...submission.toJSON(),
       correctMcqs,
      totalMcqs,
      correctMcqCount: correctMcqs,
      totalMcq: totalMcqs,
      mcqMarks: Number(mcqMarks.toFixed(2)),
      evaluationStatus: submission.evaluationStatus,
      autoMarks: submission.autoMarks,
      manualMarks: submission.manualMarks,
      totalMarks: submission.totalMarks,
    },
  });
});
export const getSubmissionForExam = asyncHandler(async (req, res) => {
  const submission = await Submission.findOne({
    _id: req.params.submissionId,
    student: req.user._id,
  }).populate({
    path: 'test',
    select: 'title settings',
  });

  if (!submission) {
    return res.status(404).json({ success: false, message: 'Submission not found' });
  }
    if (submission.isSubmitted || submission.status !== 'in_progress') {
return res.json({
      success: true,
      data: {
        submissionId: submission._id,
        status: submission.status,
        submittedAt: submission.submittedAt,
        evaluationStatus: submission.evaluationStatus,
        autoMarks: submission.autoMarks,
        manualMarks: submission.manualMarks,
        totalMarks: submission.totalMarks,
      },
      message: 'Submission already completed',
    });
  }

  res.json({ success: true, data: submission });
});
export const getMySubmissionStatus = asyncHandler(async (req, res) => {
  const submission = await Submission.findOne({
    test: req.params.testId,
    student: req.user._id,
  }).select('_id status isSubmitted submittedAt startedAt attemptNumber retakeApproved retakeUsed');
  const latestRetakeRequest = await RetakeRequest.findOne({
    testId: req.params.testId,
    studentId: req.user._id,
  }).select('_id status reason createdAt decisionMessage reviewedAt').sort({ createdAt: -1 });
  const retakeRequestStatus = latestRetakeRequest?.status || 'none';
  const retakeRequested = Boolean(latestRetakeRequest);
  const retakeUsed = Boolean(submission?.retakeUsed);
    if (!submission) {
    return res.json({
      success: true,
data: {
        hasSubmission: false,
        hasCompleted: false,
        hasInProgress: false,
        attemptNumber: 0,
        canRetake: false,
        retakeApproved: false,
                retakeUsed: false,
        retakeRequested,
        retakeRequestId: latestRetakeRequest?._id || null,
        retakeRequestStatus,
        retakeReason: latestRetakeRequest?.reason || '',
        retakeDecisionMessage: latestRetakeRequest?.decisionMessage || '',
        retakeReviewedAt: latestRetakeRequest?.reviewedAt || null,
      },
    });
  }  const isCompleted = submission.isSubmitted || FINAL_SUBMISSION_STATUSES.includes(submission.status);
const attemptNumber = Number(submission.attemptNumber || 1);
  const retakeApproved = Boolean(submission.retakeApproved);
  const canRetake = isCompleted && retakeRequestStatus === 'approved' && !retakeUsed;
    res.json({
    success: true,
    data: {
      hasSubmission: true,
      hasCompleted: isCompleted,
      hasInProgress: submission.status === 'in_progress' && !submission.isSubmitted,

      attemptNumber,
      canRetake,
      retakeApproved,
      retakeUsed,
      retakeRequested,
      retakeRequestId: latestRetakeRequest?._id || null,
   
      retakeRequestStatus,
      retakeReason: latestRetakeRequest?.reason || '',
      retakeDecisionMessage: latestRetakeRequest?.decisionMessage || '',
      retakeReviewedAt: latestRetakeRequest?.reviewedAt || null,
      submissionId: submission._id,
      status: submission.status,
      submittedAt: submission.submittedAt,
      message: isCompleted
        ? canRetake
          ? 'Retake approved. You can start now.'
                    : 'You have already completed this test'
        : undefined,
    },
  });
});
/**
 * GET /api/submissions/test/:testId
 * Get all submissions for a test (teacher)
 */
export const getTestSubmissions = asyncHandler(async (req, res) => {
  const test = await Test.findOne({ _id: req.params.testId, createdBy: req.user._id });
  if (!test) return res.status(403).json({ success: false, message: 'Access denied' });

   const submissions = await Submission.find({
    test: req.params.testId,
    status: { $in: FINAL_SUBMISSION_STATUSES },
  })
    .populate('student', 'name studentId email')
    .sort({ totalScore: -1 });

  // Assign ranks
  const ranked = submissions.map((s, i) => ({ ...s.toJSON(), rank: i + 1 }));

  res.json({ success: true, data: ranked });
});

/**
 * PUT /api/submissions/:submissionId/grade-override
 * Teacher overrides AI grade for a short answer
 */
export const gradeOverride = asyncHandler(async (req, res) => {
  const { answerId, score, comment } = req.body;

  const submission = await Submission.findById(req.params.submissionId);
  if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });

  const test = await Test.findOne({ _id: submission.test, createdBy: req.user._id });
  if (!test) return res.status(403).json({ success: false, message: 'Access denied' });

  const answer = submission.answers.id(answerId);
  if (!answer) return res.status(404).json({ success: false, message: 'Answer not found' });

  const oldScore = Number(answer.marksAwarded ?? 0);
  const nextScore = Number(score);
  const maxMarks = Number(answer.maxMarks ?? 0);


  if (!Number.isFinite(nextScore) || nextScore < 0) {
    return res.status(400).json({ success: false, message: 'Score must be a valid non-negative number' });
  }

    if (!Number.isFinite(maxMarks) || maxMarks < 0) {
    return res.status(400).json({ success: false, message: 'Answer maximum marks are invalid' });
  }
  if (nextScore > maxMarks) {
    return res.status(400).json({ success: false, message: `Score cannot exceed ${maxMarks}` });
  }

  answer.teacherOverrideScore = nextScore;
  answer.teacherComment = comment;
  answer.marksAwarded = nextScore;
  // Recalculate total
  submission.totalScore = Number(submission.totalScore ?? 0) - oldScore + nextScore;
  submission.totalMarks = submission.totalScore;
  submission.manualMarks = Number(submission.manualMarks ?? 0) - oldScore + nextScore;
    submission.percentage = submission.maxScore > 0
    ? parseFloat(((submission.totalScore / submission.maxScore) * 100).toFixed(2))
    : 0;
  submission.status = 'evaluated';
  submission.evaluationStatus = 'completed';
  submission.teacherReviewedAt = new Date();

  await submission.save();
    await syncQuizResult(submission, test, req.user._id);
     io.to(`student:${submission.student}`).emit('submission_evaluated', {
    submissionId: String(submission._id),
    status: 'evaluated',
    totalScore: submission.totalScore,
  });
  res.json({ success: true, data: submission, message: 'Grade updated' });
});
/**
 * PATCH /api/submissions/:submissionId/grade
 * Teacher grading for manual questions (short/long)
 */
export const gradeSubmission = asyncHandler(async (req, res) => {
  const { grades = [], teacherNotes } = req.body || {};
  if (!Array.isArray(grades) || grades.length === 0) {
    return res.status(400).json({ success: false, message: 'grades array is required' });
  }

  const submission = await Submission.findById(req.params.submissionId);
  if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });

  const test = await Test.findOne({ _id: submission.test, createdBy: req.user._id }).select('_id title createdBy');
  if (!test) return res.status(403).json({ success: false, message: 'Access denied' });

  const answersById = new Map(submission.answers.map((a) => [a._id.toString(), a]));
  for (const gradeItem of grades) {
    const answer = answersById.get(String(gradeItem.answerId || ''));
    if (!answer) return res.status(404).json({ success: false, message: `Answer not found: ${gradeItem.answerId}` });
    if (!answer.manualRequired) {
      return res.status(400).json({ success: false, message: `Answer ${gradeItem.answerId} does not require manual grading` });
    }
    const score = Number(gradeItem.score);
    if (!Number.isFinite(score) || score < 0 || score > Number(answer.maxMarks || 0)) {
      return res.status(400).json({ success: false, message: `Invalid score for answer ${gradeItem.answerId}` });
    }
    answer.manualScore = score;
    answer.teacherComment = gradeItem.comment;
    answer.marksAwarded = Number(answer.autoScore || 0) + score;
  }

  const autoMarks = submission.answers.reduce((sum, a) => sum + Number(a.autoScore || 0), 0);
  const manualMarks = submission.answers.reduce((sum, a) => sum + Number(a.manualScore || 0), 0);
  const totalMarks = autoMarks + manualMarks;

  const gradedSubmission = await Submission.findOneAndUpdate(
    { _id: submission._id, __v: submission.__v },
    {
      $set: {
        answers: submission.answers,
        manualMarks: Number(manualMarks.toFixed(2)),
        autoMarks: Number(autoMarks.toFixed(2)),
        totalMarks: Number(totalMarks.toFixed(2)),
        totalScore: Number(totalMarks.toFixed(2)),
        percentage: submission.maxScore > 0 ? Number(((totalMarks / submission.maxScore) * 100).toFixed(2)) : 0,
        evaluationStatus: 'completed',
        status: 'evaluated',
        teacherReviewedAt: new Date(),
        teacherNotes: teacherNotes || submission.teacherNotes,
      },
      $inc: { __v: 1 },
    },
    { new: true }
  );

  if (!gradedSubmission) {
    return res.status(409).json({ success: false, message: 'Submission changed during grading. Please retry.' });
  }
  io.to(`student:${gradedSubmission.student}`).emit('submission_evaluated', {
    submissionId: String(gradedSubmission._id),
    status: 'evaluated',
    totalScore: gradedSubmission.totalScore,
  });
  await syncQuizResult(gradedSubmission, test, req.user._id);
  res.json({ success: true, data: gradedSubmission, message: 'Manual grading completed' });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function autoSubmit(submissionId, type) {
const submission = await Submission.findOneAndUpdate({
    _id: submissionId,
    status: 'in_progress',
    isSubmitted: false,
    gradingLock: { $ne: true },
  }, {
    $set: { gradingLock: true },
  }, { new: true })
      .populate({ path: 'test', populate: { path: 'questions' } });
  if (!submission) return;
  await finalizeSubmissionAndQueue(submission, type);
}

async function finalizeSubmissionAndQueue(submission, submissionType, options = {}) {
      const test = submission.test;
  const now = new Date();
const submitRequestId = options.submitRequestId || submission.submitRequestId || null;
  const submitReceiptId = submission.submitReceiptId || crypto.randomUUID();
  try {
  const finalized = await Submission.findOneAndUpdate(
      {
        _id: submission._id,
        status: 'in_progress',
        isSubmitted: false,
        gradingLock: true,
      },
      {
        $set: {
          submittedAt: now,
          isSubmitted: true,
          status: 'finalized',
          gradingLock: false,
          submissionType,
          timeSpent: Math.floor((now - submission.startedAt) / 1000),
          evaluationStatus: 'pending',
          autoMarks: 0,
          manualMarks: 0,
          totalMarks: 0,
          totalScore: 0,
          aiGradingStatus: 'pending',
          submitRequestId,
          submitReceiptId,
        },
      },
      { new: true }
    );
    if (!finalized) return submission;

await cache.del(TIMER_KEY(test._id, submission.student));
    const queuedJob = await enqueueEvaluationJob({ 
           submissionId: finalized._id.toString(),
      testId: finalized.test.toString(),

    });
if (!queuedJob) {
      logEvent('evaluation_queue_unavailable_fallback_sync', {
        submissionId: String(finalized._id),
        testId: String(finalized.test),
      });
      await evaluateSubmissionById(finalized._id.toString());
    }

   logEvent('test_submit_completed', {
    submissionId: String(finalized._id),
    testId: String(test._id),
    studentId: String(finalized.student),
    submissionType,
    evaluationStatus: finalized.evaluationStatus,

  })
      return finalized;
  } catch (error) {
await Submission.findByIdAndUpdate(submission._id, {
      gradingLock: false,
      evaluationStatus: EVALUATION_PENDING_STATUSES.includes(submission.evaluationStatus) ? 'failed' : submission.evaluationStatus,
    });
    throw error;
  }

}
async function syncQuizResult(submission, test, createdByOverride = null, session = null) {
    if (!submission?.student || !submission?._id) return;

  const totalMarks = Number(submission.maxScore ?? 0);
  if (!Number.isFinite(totalMarks) || totalMarks <= 0) return;

  const marksObtained = Number(submission.totalScore ?? 0);
  const createdBy = createdByOverride || test?.createdBy;
  if (!createdBy) return;

  await Result.findOneAndUpdate(
    {
      studentId: submission.student,
      type: 'quiz',
      title: test?.title || 'Quiz',
      submissionId: submission._id,
    },
    {
      studentId: submission.student,
      title: test?.title || 'Quiz',
      type: 'quiz',
      marksObtained,
      totalMarks,
      date: submission.submittedAt || new Date(),
      createdBy,
      testId: test?._id,
      submissionId: submission._id,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, session }
    );
}