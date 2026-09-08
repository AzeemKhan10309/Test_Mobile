import { Worker } from 'bullmq';
import Submission from '../models/Submission.js';
import Test from '../models/Test.js';
import Question from '../models/Question.js';
import User from '../models/User.js';
import Result from '../models/results.js';
import { getQueueConnection } from '../queues/evaluation.queue.js';

const normalizeValue = (value) => String(value ?? '').trim().toLowerCase();

const isObjectiveType = (type) => ['mcq', 'true_false'].includes(normalizeValue(type));

const resolveCorrectOptionFromAnswerKey = (options, correctAnswerRaw) => {
  const key = normalizeValue(correctAnswerRaw);
  if (!key || options.length === 0) return null;

  const directMatch = options.find((opt) => normalizeValue(opt?.text) === key || String(opt?._id) === String(correctAnswerRaw || '').trim());
  if (directMatch) return directMatch;

  const optionLetterMatch = key.match(/^(option\s*)?([a-z])$/i);
  if (optionLetterMatch) {
    const letter = optionLetterMatch[2].toUpperCase();
    const index = letter.charCodeAt(0) - 65;
    if (index >= 0 && index < options.length) return options[index];
  }

  const numericMatch = key.match(/^([1-9]\d*)$/);
  if (numericMatch) {
    const oneBasedIndex = Number(numericMatch[1]) - 1;
    if (oneBasedIndex >= 0 && oneBasedIndex < options.length) return options[oneBasedIndex];
  }

  return null;
};

const evaluateObjectiveAnswer = (question, answer) => {
  const selectedRaw = answer?.selectedOption;
  if (selectedRaw == null || String(selectedRaw).trim() === '') {
    return { skipped: true, isCorrect: false, selectedText: '' };
  }

  const selectedValue = String(selectedRaw).trim();
  const selectedNormalized = normalizeValue(selectedRaw);
  const options = Array.isArray(question?.options) ? question.options : [];
  const selectedOption = options.find((opt) => (
    String(opt?._id) === selectedValue || normalizeValue(opt?.text) === selectedNormalized
  ));

  const selectedText = selectedOption?.text || selectedValue;
  const selectedTextNormalized = normalizeValue(selectedText);
  const correctOption = options.find((opt) => Boolean(opt?.isCorrect));
    const answerKeyOption = resolveCorrectOptionFromAnswerKey(options, question?.correctAnswer);
  const correctAnswerNormalized = normalizeValue(question?.correctAnswer);

  const isCorrect = Boolean(
    selectedOption?.isCorrect
|| (correctOption && String(correctOption._id) === String(selectedOption?._id || ''))
    || (answerKeyOption && String(answerKeyOption._id) === String(selectedOption?._id || '')) 
       || (correctAnswerNormalized && (
      selectedNormalized === correctAnswerNormalized
      || selectedTextNormalized === correctAnswerNormalized
    ))
  );

  return { skipped: false, isCorrect, selectedText };
};

const syncQuizResult = async (submission, test) => {
  const totalMarks = Number(submission?.maxScore ?? 0);
  if (!Number.isFinite(totalMarks) || totalMarks <= 0) return;

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
      marksObtained: Number(submission.totalScore || 0),
      totalMarks,
      date: submission.submittedAt || new Date(),
      createdBy: test?.createdBy,
      testId: test?._id,
      submissionId: submission._id,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};
export const evaluateSubmissionById = async (submissionId) => {
  const submission = await Submission.findById(submissionId).populate({
    path: 'test',
    populate: { path: 'questions' },
  });

  if (!submission) return;
  if (submission.status === 'in_progress') return;
  if (!['pending', 'failed'].includes(submission.evaluationStatus)) return;

  const test = submission.test;
  const questionMap = new Map((test?.questions || []).map((q) => [q._id.toString(), q]));

  let autoMarks = 0;
  let manualMarks = 0;
  let correctAnswers = 0;
  let wrongAnswers = 0;
  let skippedAnswers = 0;

  for (const answer of submission.answers) {
    const question = questionMap.get(answer.question.toString());
    if (!question) continue;

    const effectiveType = answer.type || answer.questionType || question.type;
    answer.maxMarks = Number(question.marks || answer.maxMarks || 0);
    answer.autoScore = 0;

 if (isObjectiveType(effectiveType) || isObjectiveType(question.type)) {
      const evaluation = evaluateObjectiveAnswer(question, answer);
      console.info(JSON.stringify({
        level: 'info',
        event: 'mcq_evaluation',
        submissionId: String(submission._id),
        questionId: String(question._id),
        selectedOption: answer.selectedOption,
        selectedText: evaluation.selectedText,
        correctAnswer: question.correctAnswer,
        isCorrect: evaluation.isCorrect,
      }));
      if (evaluation.skipped) {
        skippedAnswers += 1;
                answer.isCorrect = false;
        answer.manualRequired = false;
      } else {
        answer.isCorrect = evaluation.isCorrect;
        answer.manualRequired = false;
       answer.autoScore = evaluation.isCorrect ? answer.maxMarks : 0;
        if (evaluation.isCorrect) {
          correctAnswers += 1;
          await Question.findByIdAndUpdate(question._id, { $inc: { timesAnswered: 1, timesCorrect: 1 } });
        } else {
          wrongAnswers += 1;
          await Question.findByIdAndUpdate(question._id, { $inc: { timesAnswered: 1 } });
        }
      }
    } else if (effectiveType === 'short' || effectiveType === 'long') {
              if (!answer.textAnswer?.trim()) {
        skippedAnswers += 1;
      }
      answer.manualRequired = true;
      answer.autoScore = 0;
    } else {
      answer.manualRequired = true;
      answer.autoScore = 0;
    }

    answer.marksAwarded = Number(answer.autoScore || 0) + Number(answer.manualScore || 0);
    autoMarks += Number(answer.autoScore || 0);
    manualMarks += Number(answer.manualScore || 0);
  }

  const hasManualPending = submission.answers.some((a) => a.manualRequired && a.manualScore == null);
  const totalMarks = autoMarks + manualMarks;

  submission.autoMarks = Number(autoMarks.toFixed(2));
  submission.manualMarks = Number(manualMarks.toFixed(2));
  submission.totalMarks = Number(totalMarks.toFixed(2));
  submission.totalScore = submission.totalMarks;
  submission.correctAnswers = correctAnswers;
  submission.wrongAnswers = wrongAnswers;
  submission.skippedAnswers = skippedAnswers;
  submission.aiGradingStatus = 'completed';
  submission.percentage = submission.maxScore > 0
    ? Number(((submission.totalMarks / submission.maxScore) * 100).toFixed(2))
    : 0;
  submission.isPassed = submission.totalMarks >= Number(test?.passingMarks || 0);
  submission.status = hasManualPending ? 'submitted' : 'graded';
  submission.evaluationStatus = hasManualPending ? 'partial' : 'completed';

  const saved = await Submission.findOneAndUpdate(
    { _id: submission._id, evaluationStatus: { $in: ['pending', 'failed'] } },
    {
      $set: {
        answers: submission.answers,
        autoMarks: submission.autoMarks,
        manualMarks: submission.manualMarks,
        totalMarks: submission.totalMarks,
        totalScore: submission.totalScore,
        correctAnswers: submission.correctAnswers,
        wrongAnswers: submission.wrongAnswers,
        skippedAnswers: submission.skippedAnswers,
        aiGradingStatus: submission.aiGradingStatus,
        percentage: submission.percentage,
        isPassed: submission.isPassed,
        status: submission.status,
        evaluationStatus: submission.evaluationStatus,
      },
    },
    { new: true }
  );

  if (!saved) return;

  const gradedSubmissions = await Submission.find({ test: test._id, status: { $in: ['graded', 'reviewed'] } }).select('totalScore isPassed');
  const scores = gradedSubmissions.map((s) => Number(s.totalScore || 0));
  const passCount = gradedSubmissions.filter((s) => Boolean(s.isPassed)).length;

  await Test.findByIdAndUpdate(test._id, {
    'analytics.totalAttempts': gradedSubmissions.length,
    'analytics.averageScore': scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
    'analytics.highestScore': scores.length ? Math.max(...scores) : 0,
    'analytics.lowestScore': scores.length ? Math.min(...scores) : 0,
    'analytics.passRate': gradedSubmissions.length ? (passCount / gradedSubmissions.length) * 100 : 0,
  });

  await User.findByIdAndUpdate(saved.student, { $inc: { totalScore: saved.totalScore } });
     await syncQuizResult(saved, test);
};
const processEvaluationJob = async (job) => {
  const { submissionId } = job.data;
  await evaluateSubmissionById(submissionId);
};

export const initEvaluationWorker = () => {
  const connection = getQueueConnection();
  if (!connection) return null;

  const worker = new Worker('evaluation-submissions', processEvaluationJob, {
    connection,
    concurrency: Number(process.env.EVALUATION_WORKER_CONCURRENCY || 20),
  });

  worker.on('failed', async (job, error) => {
    if (!job?.data?.submissionId) return;
    if (job.attemptsMade < (job.opts.attempts || 1)) return;

    await Submission.findByIdAndUpdate(job.data.submissionId, {
      $set: {
        evaluationStatus: 'failed',
        aiGradingStatus: 'failed',
      },
    });

    console.error('Evaluation job failed permanently', {
      submissionId: job.data.submissionId,
      error: error.message,
    });
  });

  return worker;
}