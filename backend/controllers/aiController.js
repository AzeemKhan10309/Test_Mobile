/**
 * AI Controller
 */


import { asyncHandler } from '../middleware/errorHandler.js';


/**
 * POST /api/ai/grade-answer
 * Grade a single short answer (teacher preview)
 */
export const gradeAnswer = asyncHandler(async (req, res) => {
  const { question, correctAnswer, studentAnswer, maxMarks } = req.body;
  const { gradeShortAnswer } = await import('../services/aiService.js');
  const result = await gradeShortAnswer({ question, correctAnswer, studentAnswer, maxMarks: maxMarks || 5 });
  res.json({ success: true, data: result });
});
