/**
 * Test Controller
 * Full CRUD for exam tests + publishing/sharing
 */

import Test from '../models/Test.js';
import Question from '../models/Question.js';
import Submission from '../models/Submission.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import { asyncHandler } from '../middleware/errorHandler.js';
const sanitizeTestSettings = (settings) => {
  if (!settings || typeof settings !== 'object') return settings;
  const cleaned = { ...settings };
  delete cleaned.proctoring;
  return cleaned;
};
/**
 * GET /api/tests
 * Get all tests for the authenticated teacher
 */
export const getTests = asyncHandler(async (req, res) => {
  const { status } = req.query;
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
  const query = { createdBy: req.user._id };
  const shouldLoadEvaluationQueue = status === 'active';
  if (status && !shouldLoadEvaluationQueue) query.status = status;

  const tests = await Test.find(query)
    .populate('questions', 'type marks')
    .sort({ createdAt: -1 })
    .lean();

  let evaluationStatsByTestId = new Map();
  let filteredTests = tests;

  if (shouldLoadEvaluationQueue) {
    const testIds = tests.map((test) => test._id);
    const evaluationStats = await Submission.aggregate([
      {
        $match: {
          test: { $in: testIds },
                    status: { $in: ['submitted', 'graded', 'reviewed', 'finalized', 'evaluated'] },
          isSubmitted: true,
        },
      },
      {
        $group: {
          _id: '$test',
          submissionCount: { $sum: 1 },
          pendingCount: {
            $sum: {
              $cond: [
                { $in: ['$evaluationStatus', ['pending', 'partial', 'failed']] },
                1,
                0,
              ],
            },
          },
          completedCount: {
            $sum: {
              $cond: [{ $eq: ['$evaluationStatus', 'completed'] }, 1, 0],
            },
          },
        },
      },
    ]);

    evaluationStatsByTestId = new Map(
      evaluationStats.map((stat) => [String(stat._id), stat]),
    );
    filteredTests = tests.filter((test) => evaluationStatsByTestId.has(String(test._id)));
  }
  const total = filteredTests.length;
  const pagedTests = filteredTests.slice((page - 1) * limit, page * limit);


  // Attach computed totalMarks
const enriched = pagedTests.map((test) => {
    const stats = evaluationStatsByTestId.get(String(test._id));
    const totalMarks = (test.questions || []).reduce((sum, q) => sum + (q.marks || 0), 0);
    const questionCount = (test.questions || []).length;
    const obj = {
      ...test,
      totalMarks,
      questionCount,
    };
    if (stats) {
      obj.evaluationStats = {
        submissionCount: stats.submissionCount || 0,
        pendingCount: stats.pendingCount || 0,
        completedCount: stats.completedCount || 0,
      };
    }
    return obj;
  });

 res.json({ success: true, data: enriched, total, page, pages: Math.ceil(total / limit) });
});

/**
 * GET /api/tests/:id
 */
export const getTest = asyncHandler(async (req, res) => {
  const test = await Test.findById(req.params.id)
    .populate('questions')
    .populate('createdBy', 'name email');

  if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

  // Teachers can only see their own tests; admins can see all
  if (req.user.role === 'teacher' && test.createdBy._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  if (req.user.role === 'student') {
    const isAllowedStudent = (test.allowedStudents || []).some((id) => id.toString() === req.user._id.toString());
    if (!test.isPublic && !isAllowedStudent) {
      return res.status(403).json({ success: false, message: 'You are not authorized for this test' });
    }
  }
  res.json({ success: true, data: test });
});

/**
 * POST /api/tests
 * Create a new test
 */
export const createTest = asyncHandler(async (req, res) => {


  const {
    title, description, instructions, subject, topic,
    duration, startTime, endTime, settings, passingMarks, isPublic,
        courseId, semesterId,
        requireAccessCode, accessCode,
                allowRetake, maxAttempts,
  } = req.body;
   if (!courseId) {
    return res.status(400).json({ success: false, message: 'courseId is required' });
  }
  const course = await Course.findOne({ _id: courseId, teacher: req.user._id }).select('_id');
  if (!course) {
    return res.status(403).json({ success: false, message: 'Invalid course selection for this teacher' });
  }
const normalizedStart = startTime ? new Date(startTime) : undefined;
  const normalizedEnd = endTime ? new Date(endTime) : undefined;
  if (normalizedStart && Number.isNaN(normalizedStart.getTime())) {
    return res.status(400).json({ success: false, message: 'Invalid start time' });
  }
  if (normalizedEnd && Number.isNaN(normalizedEnd.getTime())) {
    return res.status(400).json({ success: false, message: 'Invalid end time' });
  }
  if (normalizedStart && normalizedEnd && normalizedEnd <= normalizedStart) {
    return res.status(400).json({ success: false, message: 'End time must be after start time' });
  }
  const normalizedAccessCode = typeof accessCode === 'string' ? accessCode.trim().toUpperCase() : '';
  if (requireAccessCode && !normalizedAccessCode) {
    return res.status(400).json({ success: false, message: 'Access code is required when protection is enabled' });
  }
  const normalizedMaxAttempts = Math.min(Math.max(Number(maxAttempts ?? settings?.maxAttempts ?? 1), 1), 10);
  const normalizedAllowRetake = Boolean(allowRetake ?? normalizedMaxAttempts > 1);
  const test = await Test.create({
    title, description, instructions, subject, topic,
    duration, startTime: normalizedStart, endTime: normalizedEnd, passingMarks,
     course: courseId,
    semester: semesterId,
    isPublic: isPublic || false,
    requireAccessCode: Boolean(requireAccessCode),
    accessCode: requireAccessCode ? normalizedAccessCode : undefined,
    allowRetake: normalizedAllowRetake,
    maxAttempts: normalizedMaxAttempts,
    settings: {
      ...(sanitizeTestSettings(settings) || {}),
      maxAttempts: normalizedMaxAttempts,
    },
    createdBy: req.user._id,
    status: 'draft',
  });

  // Increment teacher's test count
  await User.findByIdAndUpdate(req.user._id, { $inc: { 'subscription.testsCreated': 1 } });

  res.status(201).json({ success: true, data: test, message: 'Test created successfully' });
});

/**
 * PUT /api/tests/:id
 */
export const updateTest = asyncHandler(async (req, res) => {
  const test = await Test.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

  if (test.status === 'active') {
    return res.status(400).json({ success: false, message: 'Cannot edit an active test' });
  }

  const allowed = [
    'title', 'description', 'instructions', 'subject', 'topic',
'duration', 'startTime', 'endTime', 'settings', 'passingMarks', 'isPublic', 'courseId', 'semesterId', 'requireAccessCode', 'accessCode', 'allowRetake', 'maxAttempts',    ];
  allowed.forEach((field) => {
        if (req.body[field] === undefined) return;
            if (field === 'courseId') {
      test.course = req.body[field];
      return;
    }
    if (field === 'semesterId') {
      test.semester = req.body[field];
      return;
    }
    test[field] = field === 'settings'
      ? sanitizeTestSettings(req.body[field])
      : req.body[field];
  });
  if (req.body.courseId) {
    const nextCourse = await Course.findOne({ _id: req.body.courseId, teacher: req.user._id }).select('_id');
    if (!nextCourse) {
      return res.status(403).json({ success: false, message: 'Invalid course selection for this teacher' });
    }
  }
if (req.body.startTime !== undefined || req.body.endTime !== undefined) {
    const nextStartTime = req.body.startTime !== undefined ? new Date(req.body.startTime) : test.startTime;
    const nextEndTimeCandidate = req.body.endTime !== undefined ? new Date(req.body.endTime) : test.endTime;
    if (nextStartTime && Number.isNaN(nextStartTime.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid start time' });
    }
    if (nextEndTimeCandidate && Number.isNaN(nextEndTimeCandidate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid end time' });
    }
    if (nextStartTime && nextEndTimeCandidate && nextEndTimeCandidate <= nextStartTime) {
      return res.status(400).json({ success: false, message: 'End time must be after start time' });
    }
  }

  const nextRequireAccessCode = req.body.requireAccessCode !== undefined
    ? Boolean(req.body.requireAccessCode)
    : test.requireAccessCode;
  const nextAccessCode = req.body.accessCode !== undefined
    ? String(req.body.accessCode || '').trim().toUpperCase()
    : test.accessCode;

  if (nextRequireAccessCode && !nextAccessCode) {
    return res.status(400).json({ success: false, message: 'Access code is required when protection is enabled' });
  }
  test.requireAccessCode = nextRequireAccessCode;
  test.accessCode = nextRequireAccessCode ? nextAccessCode : undefined;
if (req.body.maxAttempts !== undefined || req.body.settings?.maxAttempts !== undefined || req.body.allowRetake !== undefined) {
    const normalizedMaxAttempts = Math.min(Math.max(Number(req.body.maxAttempts ?? req.body.settings?.maxAttempts ?? test.maxAttempts ?? 1), 1), 10);
    test.maxAttempts = normalizedMaxAttempts;
    test.allowRetake = Boolean(req.body.allowRetake ?? normalizedMaxAttempts > 1);
    test.settings = {
      ...(test.settings?.toObject ? test.settings.toObject() : (test.settings || {})),
      ...(req.body.settings ? sanitizeTestSettings(req.body.settings) : {}),
      maxAttempts: normalizedMaxAttempts,
    };
  }
  const nextEndTime = req.body.endTime !== undefined ? new Date(req.body.endTime) : test.endTime;
    const hasValidFutureEndTime = nextEndTime instanceof Date
    && !Number.isNaN(nextEndTime.getTime())
    && nextEndTime > new Date();

  // Re-open previously ended tests if teacher extends the schedule.
  if (test.status === 'ended' && hasValidFutureEndTime) {
    test.status = 'published';
  }

  await test.save();
  res.json({ success: true, data: test, message: 'Test updated' });
});

/**
 * DELETE /api/tests/:id
 */
export const deleteTest = asyncHandler(async (req, res) => {
  const test = await Test.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

  if (test.status === 'active') {
    return res.status(400).json({ success: false, message: 'Cannot delete an active test' });
  }

  // Delete associated questions
  await Question.deleteMany({ testId: test._id });
  await test.deleteOne();

  res.json({ success: true, message: 'Test deleted successfully' });
});

/**
 * POST /api/tests/:id/publish
 */
export const publishTest = asyncHandler(async (req, res) => {
  const test = await Test.findOne({ _id: req.params.id, createdBy: req.user._id })
    .populate('questions');

  if (!test) return res.status(404).json({ success: false, message: 'Test not found' });
  if (!test.questions || test.questions.length === 0) {
    return res.status(400).json({ success: false, message: 'Add at least one question before publishing' });
  }

  test.status = 'published';
  test.totalMarks = test.questions.reduce((sum, q) => sum + (q.marks || 0), 0);
  await test.save();

  res.json({ success: true, data: test, message: 'Test published successfully' });
});

/**
 * POST /api/tests/:id/end
 */
export const endTest = asyncHandler(async (req, res) => {
  const test = await Test.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

  test.status = 'ended';
  await test.save();

  res.json({ success: true, message: 'Test ended' });
});

/**
 * GET /api/tests/join/:shareLink
 * Public endpoint for students to get test info before joining
 */
export const getTestByShareLink = asyncHandler(async (req, res) => {
  const test = await Test.findOne({ shareLink: req.params.shareLink })
    .select('-questions')
    .populate('createdBy', 'name');

  if (!test) return res.status(404).json({ success: false, message: 'Test not found or invalid link' });

  if (test.status === 'draft') {
    return res.status(403).json({ success: false, message: 'This test is not yet published' });
  }
  if (test.status === 'ended') {
    return res.status(410).json({ success: false, message: 'This test has ended' });
  }

  // Check time window
  const now = new Date();
  if (test.startTime && now < test.startTime) {
    return res.status(403).json({
      success: false,
      message: 'Test has not started yet',
      startTime: test.startTime,
    });
  }
  if (test.endTime && now > test.endTime) {
    return res.status(410).json({ success: false, message: 'Test has ended' });
  }

  res.json({
    success: true,
    data: {
      _id: test._id,
      title: test.title,
      description: test.description,
      instructions: test.instructions,
      duration: test.duration,
      startTime: test.startTime,
      endTime: test.endTime,
      settings: test.settings,
      totalMarks: test.totalMarks,
            requireAccessCode: Boolean(test.requireAccessCode),
      createdBy: test.createdBy,
    },
  });
});

/**
 * GET /api/tests/:id/questions
 * Get questions for an active test (student view - no correct answers)
 */
export const getTestQuestions = asyncHandler(async (req, res) => {
  const test = await Test.findById(req.params.id).populate('questions');
  if (!test) return res.status(404).json({ success: false, message: 'Test not found' });
   if (req.user.role === 'student') {
    const now = new Date();
    const isWithinWindow = (!test.startTime || now >= test.startTime)
      && (!test.endTime || now <= test.endTime)
      && test.status !== 'draft'
      && test.status !== 'ended';

    const submission = await Submission.findOne({
      test: test._id,
      student: req.user._id,
      status: { $in: ['in_progress', 'submitted', 'graded', 'reviewed'] },
    }).select('_id');

    if (!submission && !isWithinWindow) {
      return res.status(403).json({ success: false, message: 'Test questions are unavailable outside your active exam window' });
    }
  }

  let questions = test.questions || [];

  // Shuffle if enabled
  if (test.settings?.shuffleQuestions) {
    questions = questions.sort(() => Math.random() - 0.5);
  }

  // Strip correct answers for students
  if (req.user.role === 'student') {
    questions = questions.map((q) => {
      const obj = q.toObject ? q.toObject() : q;
      let options = obj.options || [];
      if (test.settings?.shuffleOptions) {
        options = options.sort(() => Math.random() - 0.5);
      }
      return {
        _id: obj._id,
        questionText: obj.questionText,
        type: obj.type,
        marks: obj.marks,
        options: options.map((o) => ({ _id: o._id, text: o.text })),
      };
    });
  }

  res.json({ success: true, data: questions, totalMarks: test.totalMarks });
});

/**
 * GET /api/tests/:id/students
 * Get all students who have submitted/are attempting a test
 */
export const getTestStudents = asyncHandler(async (req, res) => {
  const test = await Test.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

  const submissions = await Submission.find({ test: req.params.id })
    .populate('student', 'name studentId email')
    .sort({ submittedAt: -1 });

  res.json({ success: true, data: submissions });
});
