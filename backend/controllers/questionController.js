/**
 * Questions Controller
 * Manual CRUD for questions
 */

import Question from '../models/Question.js';
import Test from '../models/Test.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const addQuestion = asyncHandler(async (req, res) => {
  const { testId } = req.params;
  const test = await Test.findOne({ _id: testId, createdBy: req.user._id });
  if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

  const question = await Question.create({ ...req.body, createdBy: req.user._id, testId });
  await Test.findByIdAndUpdate(testId, { $push: { questions: question._id } });

  res.status(201).json({ success: true, data: question });
});

export const updateQuestion = asyncHandler(async (req, res) => {
  const question = await Question.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!question) return res.status(404).json({ success: false, message: 'Question not found' });

  Object.assign(question, req.body);
  await question.save();

  res.json({ success: true, data: question });
});

export const deleteQuestion = asyncHandler(async (req, res) => {
  const question = await Question.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!question) return res.status(404).json({ success: false, message: 'Question not found' });

  await Test.findByIdAndUpdate(question.testId, { $pull: { questions: question._id } });
  await question.deleteOne();

  res.json({ success: true, message: 'Question deleted' });
});

export const bulkDeleteQuestions = asyncHandler(async (req, res) => {
  const { questionIds, testId } = req.body;

  const test = await Test.findOne({ _id: testId, createdBy: req.user._id });
  if (!test) return res.status(403).json({ success: false, message: 'Access denied' });

  await Question.deleteMany({ _id: { $in: questionIds }, createdBy: req.user._id });
  await Test.findByIdAndUpdate(testId, { $pull: { questions: { $in: questionIds } } });

  res.json({ success: true, message: `${questionIds.length} questions deleted` });
});
