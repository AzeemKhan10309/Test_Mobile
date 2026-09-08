import Course from '../models/Course.js';
import Test from '../models/Test.js';
import Submission from '../models/Submission.js';
import Result from '../models/results.js';
import RetakeRequest from '../models/RetakeRequest.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { isSubjectiveAnswer, normalizeSubmissionAnswers } from '../utils/evaluationNormalization.js';
import { io } from '../server.js';

const ensureTeacher = (req, res) => {
  if (req.user.role !== 'teacher' && req.user.role !== 'superadmin') {
    res.status(403).json({ success: false, message: 'Teacher access required' });
    return false;
  }
  return true;
};

export const getTeacherCourses = asyncHandler(async (req, res) => {
  if (!ensureTeacher(req, res)) return;
  const courses = await Course.find({ teacher: req.user._id })
    .select('_id courseName courseCode description teacher')
    .sort({ courseName: 1 })
    .lean();

  res.json({ success: true, data: courses });
});

export const getTeacherTests = asyncHandler(async (req, res) => {
  if (!ensureTeacher(req, res)) return;
  const { courseId } = req.query;
  if (!courseId) {
    return res.status(400).json({ success: false, message: 'courseId is required' });
  }

  const tests = await Test.find({ createdBy: req.user._id, course: courseId })
    .select('_id title status duration totalMarks startTime endTime')
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, data: tests });
});

export const getTeacherSubmissions = asyncHandler(async (req, res) => {
  const { courseId } = req.query;
  if (!courseId) {
    return res.status(400).json({ success: false, message: 'courseId is required' });
  }

 const course = await Course.findOne({ _id: courseId, teacher: req.user._id }).select('_id');
  if (!course) {
    return res.status(404).json({ success: false, message: 'Course not found for this teacher' });
  }

  const tests = await Test.find({
    createdBy: req.user._id,
    course: courseId,
  })
    .select('_id title course')
    .lean();


const validTestIds = tests
    .filter((test) => test.course)
    .map((test) => test._id);

  if (validTestIds.length === 0) {
    return res.json({ success: true, data: [] });
  }

  const testsById = new Map(tests.map((test) => [String(test._id), test]));

  const submissions = await Submission.find({
    test: { $in: validTestIds },
    status: { $in: ['finalized', 'submitted', 'evaluated', 'graded', 'reviewed'] },
  })
    .select('_id student test status totalMarks autoMarks manualMarks submittedAt evaluationStatus attemptNumber retakeUsed retakeApproved')
            .populate('student', 'name studentId email')
        .populate('test', '_id title course')
    .sort({ submittedAt: -1 })
    .lean();
const studentIds = submissions
    .map((submission) => submission.student?._id || submission.student)
    .filter(Boolean);

  const retakeRequests = studentIds.length
    ? await RetakeRequest.find({
      testId: { $in: validTestIds },
      studentId: { $in: studentIds },
    })
      .select('_id studentId testId status reason decisionMessage reviewedAt createdAt')
      .sort({ createdAt: -1 })
      .lean()
    : [];

  const latestRetakeBySubmissionKey = new Map();
  retakeRequests.forEach((request) => {
    const key = `${String(request.studentId)}:${String(request.testId)}`;
    if (!latestRetakeBySubmissionKey.has(key)) {
      latestRetakeBySubmissionKey.set(key, request);
    }
  });
  const data = submissions.map((row) => ({
     ...(() => {
      const key = `${String(row.student?._id || row.student)}:${String(row.test?._id || row.test)}`;
      const latestRetakeRequest = latestRetakeBySubmissionKey.get(key);
      return {
        retakeRequested: Boolean(latestRetakeRequest),
        retakeRequestId: latestRetakeRequest?._id || null,
        retakeRequestStatus: latestRetakeRequest?.status || null,
        retakeReason: latestRetakeRequest?.reason || '',
        retakeDecisionMessage: latestRetakeRequest?.decisionMessage || '',
        retakeReviewedAt: latestRetakeRequest?.reviewedAt || null,
      };
    })(),
    ...row,
        testName: row.test?.title || testsById.get(String(row.test?._id || row.test))?.title || 'Untitled Test',
            isRetake: Boolean(row.retakeUsed) || Number(row.attemptNumber || 1) > 1,
    evaluationStatus: row.status === 'evaluated'
      ? 'completed'
      : (row.evaluationStatus || 'pending'),
  }));

  res.json({ success: true, data });
});

export const getTeacherSubmission = asyncHandler(async (req, res) => {
  if (!ensureTeacher(req, res)) return;
  const submission = await Submission.findById(req.params.id)
    .populate('student', 'name studentId email')
    .populate({
      path: 'answers.question',
      select: 'questionText type marks',
    })
    .populate('test', 'title createdBy')
    .lean();

  if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });
  if (String(submission.test?.createdBy) !== String(req.user._id)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  const latestRetakeRequest = await RetakeRequest.findOne({
    studentId: submission.student?._id || submission.student,
    testId: submission.test?._id || submission.test,
  })
    .select('_id status reason decisionMessage reviewedAt createdAt')
    .sort({ createdAt: -1 })
    .lean();
  const normalizedAnswers = normalizeSubmissionAnswers(submission.answers || []);
  res.json({
    success: true,
    data: {
      ...submission,
      retakeRequested: Boolean(latestRetakeRequest),
      retakeRequestId: latestRetakeRequest?._id || null,
      retakeRequestStatus: latestRetakeRequest?.status || null,
      retakeReason: latestRetakeRequest?.reason || '',
      retakeDecisionMessage: latestRetakeRequest?.decisionMessage || '',
      retakeReviewedAt: latestRetakeRequest?.reviewedAt || null,
      answers: normalizedAnswers,
      subjectiveAnswers: normalizedAnswers.filter((answer) => answer.type === 'subjective'),
    },
  });
});

export const evaluateSubmission = asyncHandler(async (req, res) => {
  if (!ensureTeacher(req, res)) return;
  const { grades = [], teacherNotes = '', finalSubmit = false } = req.body || {};

  const submission = await Submission.findById(req.params.id).populate('test', 'title createdBy');
  if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });
  if (String(submission.test?.createdBy) !== String(req.user._id)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
 const editableStatuses = new Set(['submitted', 'finalized', 'graded', 'reviewed', 'evaluated']);
  if (!editableStatuses.has(submission.status)) {
    return res.status(409).json({
      success: false,
      code: 'SUBMISSION_NOT_AVAILABLE',
      message: 'Submission is no longer available for evaluation',
      data: { status: submission.status },
    });
  }

  const byQuestionId = new Map((submission.answers || []).map((answer) => [String(answer.question), answer]));

  for (const grade of grades) {
    const answer = byQuestionId.get(String(grade.questionId || ''));
    if (!answer) return res.status(404).json({ success: false, message: `Answer not found for questionId ${grade.questionId}` });
    if (!isSubjectiveAnswer(answer)) {
      return res.status(400).json({ success: false, message: 'MCQ answers are auto-graded and cannot be manually evaluated' });
    }

    const score = Number(grade.marks);
    const maxMarks = Number(answer.maxMarks || 0);
    if (!Number.isFinite(score) || score < 0 || score > maxMarks) {
      return res.status(400).json({ success: false, message: `Invalid marks for questionId ${grade.questionId}` });
    }

    answer.manualScore = score;
    answer.teacherComment = grade.feedback || '';
    answer.marksAwarded = Number(answer.autoScore || 0) + score;
  }

  const autoMarks = submission.answers.reduce((sum, answer) => sum + Number(answer.autoScore || answer.autoMarks || 0), 0);
  const subjectiveMarks = submission.answers.reduce((sum, answer) => sum + Number(answer.manualScore || 0), 0);
  const totalScore = Number((autoMarks + subjectiveMarks).toFixed(2));

  submission.autoMarks = Number(autoMarks.toFixed(2));
  submission.manualMarks = Number(subjectiveMarks.toFixed(2));
  submission.totalMarks = totalScore;
  submission.totalScore = totalScore;
  submission.teacherNotes = teacherNotes || submission.teacherNotes;

  if (finalSubmit) {
    submission.status = 'evaluated';
    submission.evaluationStatus = 'completed';
    submission.teacherReviewedAt = new Date();
    } else if ((submission.evaluationStatus || 'pending') !== 'completed') {
    submission.evaluationStatus = 'partial';
  }

  await submission.save();

  if (finalSubmit) {
    await Result.findOneAndUpdate(
      { submissionId: submission._id },
      {
        studentId: submission.student,
        title: submission.test?.title || 'Quiz',
        type: 'quiz',
        marksObtained: submission.totalScore,
        totalMarks: submission.maxScore || submission.totalMarks || 1,
        date: new Date(),
        createdBy: req.user._id,
        testId: submission.test?._id,
        submissionId: submission._id,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    io.to(`student:${submission.student}`).emit('submission_evaluated', {
      submissionId: String(submission._id),
      status: 'evaluated',
      totalScore: submission.totalScore,
    });
  }

  res.json({ success: true, data: submission });
});