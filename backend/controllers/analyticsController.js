/**
 * Analytics Controller
 */

import Submission from '../models/Submission.js';
import Test from '../models/Test.js';
import Question from '../models/Question.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * GET /api/analytics/test/:testId
 */
export const getTestAnalytics = asyncHandler(async (req, res) => {
  const test = await Test.findOne({ _id: req.params.testId, createdBy: req.user._id })
    .populate('questions', 'questionText type marks timesAnswered timesCorrect');
  if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

  const submissions = await Submission.find({
    test: req.params.testId,
    status: { $in: ['graded', 'reviewed'] },
  }).populate('student', 'name studentId');

  const scores = submissions.map((s) => s.totalScore);
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  // Score distribution
  const distribution = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
  submissions.forEach((s) => {
    const pct = s.percentage;
    if (pct <= 20) distribution['0-20']++;
    else if (pct <= 40) distribution['21-40']++;
    else if (pct <= 60) distribution['41-60']++;
    else if (pct <= 80) distribution['61-80']++;
    else distribution['81-100']++;
  });

  // Question difficulty analysis
  const questionAnalysis = (test.questions || []).map((q) => ({
    _id: q._id,
    questionText: q.questionText.substring(0, 80),
    type: q.type,
    marks: q.marks,
    timesAnswered: q.timesAnswered,
    successRate: q.timesAnswered > 0
      ? parseFloat(((q.timesCorrect / q.timesAnswered) * 100).toFixed(1))
      : null,
  }));

  // Leaderboard (top 10)
  const leaderboard = submissions
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 10)
    .map((s, i) => ({
      rank: i + 1,
      name: s.student?.name,
      studentId: s.student?.studentId,
      score: s.totalScore,
      percentage: s.percentage,
      grade: s.grade,
      timeSpent: s.timeSpent,
    }));

  res.json({
    success: true,
    data: {
      overview: {
        totalAttempts: submissions.length,
        averageScore: parseFloat(avg.toFixed(2)),
        highestScore: scores.length ? Math.max(...scores) : 0,
        lowestScore: scores.length ? Math.min(...scores) : 0,
        passRate: submissions.length
          ? parseFloat(((submissions.filter((s) => s.isPassed).length / submissions.length) * 100).toFixed(1))
          : 0,
        averagePercentage: submissions.length
          ? parseFloat((submissions.reduce((a, s) => a + s.percentage, 0) / submissions.length).toFixed(1))
          : 0,
      },
      scoreDistribution: distribution,
      questionAnalysis,
      leaderboard,
      cheatingStats: {
        flagged: submissions.filter((s) => s.violationCount > 0).length,
        disqualified: submissions.filter((s) => s.isDisqualified).length,
      },
    },
  });
});

/**
 * GET /api/analytics/dashboard
 * Teacher dashboard summary
 */
export const getTeacherDashboard = asyncHandler(async (req, res) => {
  const tests = await Test.find({ createdBy: req.user._id });
  const testIds = tests.map((t) => t._id);

  const [totalSubmissions, recentSubmissions] = await Promise.all([
    Submission.countDocuments({ test: { $in: testIds }, status: { $in: ['graded', 'reviewed'] } }),
    Submission.find({ test: { $in: testIds } })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('student', 'name studentId')
      .populate('test', 'title'),
  ]);

  const activeTests = tests.filter((t) => t.status === 'published' || t.status === 'active');
  const draftTests = tests.filter((t) => t.status === 'draft');

  res.json({
    success: true,
    data: {
      stats: {
        totalTests: tests.length,
        activeTests: activeTests.length,
        draftTests: draftTests.length,
        totalSubmissions,
      },
      recentSubmissions,
      recentTests: tests.sort((a, b) => b.createdAt - a.createdAt).slice(0, 5),
    },
  });
});

/**
 * GET /api/analytics/student/:studentId
 * Student performance history
 */
export const getStudentAnalytics = asyncHandler(async (req, res) => {
  const studentId = req.params.studentId === 'me' ? req.user._id : req.params.studentId;

  const submissions = await Submission.find({
    student: studentId,
    status: { $in: ['graded', 'reviewed'] },
  })
    .populate('test', 'title subject')
    .sort({ submittedAt: -1 });

  const avgScore = submissions.length
    ? submissions.reduce((a, s) => a + s.percentage, 0) / submissions.length
    : 0;

  res.json({
    success: true,
    data: {
      totalTests: submissions.length,
      averageScore: parseFloat(avgScore.toFixed(1)),
      highestScore: submissions.length ? Math.max(...submissions.map((s) => s.percentage)) : 0,
      submissions: submissions.map((s) => ({
        _id: s._id,
        testTitle: s.test?.title,
        subject: s.test?.subject,
                attemptNumber: s.attemptNumber || 1,
        score: s.totalScore,
        maxScore: s.maxScore,
        percentage: s.percentage,
        grade: s.grade,
        isPassed: s.isPassed,
        submittedAt: s.submittedAt,
      })),
    },
  });
});
