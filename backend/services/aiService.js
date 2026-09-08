/**
 * AI Service
 * Handles question generation and short-answer grading using OpenAI
 */

import OpenAI from 'openai';

// Initialize OpenAI client
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    return null; // Will use mock responses
  }
  return new OpenAI({ apiKey });
};

/**
 * Generate exam questions using AI
 */
export const generateQuestions = async ({
  topic,
  difficulty = 'medium',
  mcqCount = 5,
  shortCount = 3,
  subject = '',
  additionalContext = '',
}) => {
  const openai = getOpenAIClient();

  const prompt = buildQuestionGenerationPrompt({
    topic, difficulty, mcqCount, shortCount, subject, additionalContext
  });

  // Use mock if no API key
  if (!openai) {
    console.warn('⚠️  No OpenAI API key — returning mock questions');
    return generateMockQuestions({ topic, difficulty, mcqCount, shortCount });
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert educational content creator. Generate high-quality exam questions.
Always respond with valid JSON only. No markdown, no explanation, just the JSON object.`
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    const parsed = JSON.parse(content);
    return normalizeGeneratedQuestions(parsed, topic, difficulty);

  } catch (error) {
    console.error('OpenAI generation error:', error.message);
    // Fallback to mock on API failure
    return generateMockQuestions({ topic, difficulty, mcqCount, shortCount });
  }
};

/**
 * Grade a short answer using AI similarity comparison
 */
export const gradeShortAnswer = async ({
  question,
  correctAnswer,
  studentAnswer,
  maxMarks = 5,
}) => {
  if (!studentAnswer || studentAnswer.trim().length === 0) {
    return { score: 0, similarity: 0, feedback: 'No answer provided.' };
  }

  const openai = getOpenAIClient();

  if (!openai) {
    // Basic keyword matching fallback
    return basicSimilarityGrade({ correctAnswer, studentAnswer, maxMarks });
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert grader. Evaluate student answers objectively.
Respond with JSON only: { "similarity": <0-100>, "score": <0 to maxMarks>, "feedback": "<brief feedback>" }`
        },
        {
          role: 'user',
          content: `Question: ${question}
Correct Answer: ${correctAnswer}
Student Answer: ${studentAnswer}
Max Marks: ${maxMarks}

Grade the student's answer based on:
1. Conceptual accuracy (40%)
2. Completeness (30%)
3. Key terms coverage (30%)

Return JSON with similarity (0-100), score (0-${maxMarks}), and brief feedback.`
        }
      ],
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content);
    return {
      score: Math.min(Math.max(parseFloat(result.score) || 0, 0), maxMarks),
      similarity: Math.min(Math.max(parseFloat(result.similarity) || 0, 0), 100),
      feedback: result.feedback || 'Graded by AI',
    };
  } catch (error) {
    console.error('AI grading error:', error.message);
    return basicSimilarityGrade({ correctAnswer, studentAnswer, maxMarks });
  }
};

/**
 * Batch grade multiple short answers
 */
export const batchGradeShortAnswers = async (answers) => {
  const results = await Promise.allSettled(
    answers.map((a) => gradeShortAnswer(a))
  );
  return results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { score: 0, similarity: 0, feedback: 'Grading failed', error: true }
  );
};

// ─── Private Helpers ──────────────────────────────────────────────────────────

const buildQuestionGenerationPrompt = ({ topic, difficulty, mcqCount, shortCount, subject, additionalContext }) => {
  return `Generate a comprehensive exam question set about "${topic}" ${subject ? `(Subject: ${subject})` : ''}.

Requirements:
- Difficulty: ${difficulty}
- MCQ Questions: ${mcqCount}
- Short Answer Questions: ${shortCount}
${additionalContext ? `- Additional Context: ${additionalContext}` : ''}

Return valid JSON with this exact structure:
{
  "mcqs": [
    {
      "questionText": "Question text here?",
      "options": [
        { "text": "Option A", "isCorrect": false },
        { "text": "Option B", "isCorrect": true },
        { "text": "Option C", "isCorrect": false },
        { "text": "Option D", "isCorrect": false }
      ],
      "correctAnswer": "Option B",
      "explanation": "Brief explanation of why this is correct",
      "marks": 1
    }
  ],
  "shortQuestions": [
    {
      "questionText": "Short question here?",
      "correctAnswer": "Expected comprehensive answer",
      "explanation": "Key points that should be covered",
      "marks": 5
    }
  ]
}

Rules:
- Each MCQ must have exactly one correct answer
- Make questions progressively challenging
- Ensure options are plausible and distinct
- Short answer model answers should be 2-4 sentences
- Focus on conceptual understanding, not trivia`;
};

const normalizeGeneratedQuestions = (data, topic, difficulty) => {
  const mcqs = (data.mcqs || data.MCQs || []).map((q) => ({
    questionText: q.questionText || q.question || '',
    type: 'mcq',
    options: (q.options || []).map((o) =>
      typeof o === 'string'
        ? { text: o, isCorrect: o === q.correctAnswer }
        : o
    ),
    correctAnswer: q.correctAnswer || '',
    explanation: q.explanation || '',
    marks: q.marks || 1,
    difficulty,
    topic,
    isAIGenerated: true,
  }));

  const shortQuestions = (data.shortQuestions || data.short_questions || []).map((q) => ({
    questionText: q.questionText || q.question || '',
    type: 'short',
    correctAnswer: q.correctAnswer || q.answer || '',
    explanation: q.explanation || '',
    marks: q.marks || 5,
    difficulty,
    topic,
    isAIGenerated: true,
  }));

  return { mcqs, shortQuestions, total: mcqs.length + shortQuestions.length };
};

const basicSimilarityGrade = ({ correctAnswer, studentAnswer, maxMarks }) => {
  const normalize = (text) => text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
  const correctWords = new Set(normalize(correctAnswer));
  const studentWords = normalize(studentAnswer);

  const matchCount = studentWords.filter((w) => correctWords.has(w)).length;
  const similarity = correctWords.size > 0
    ? Math.round((matchCount / correctWords.size) * 100)
    : 0;

  const score = parseFloat((similarity / 100 * maxMarks).toFixed(1));

  let feedback = '';
  if (similarity >= 80) feedback = 'Excellent answer! Covers key concepts well.';
  else if (similarity >= 60) feedback = 'Good answer. Some key points covered.';
  else if (similarity >= 40) feedback = 'Partial answer. Missing some important concepts.';
  else feedback = 'Answer needs improvement. Review the topic.';

  return { score, similarity, feedback };
};

const generateMockQuestions = ({ topic, difficulty, mcqCount, shortCount }) => {
  const difficulties = { easy: 1, medium: 2, hard: 3 };
  const marks = difficulties[difficulty] || 2;
const cleanTopic = typeof topic === 'string' ? topic.trim() : 'the given topic';
  const titleTopic = cleanTopic.charAt(0).toUpperCase() + cleanTopic.slice(1);

  const mcqTemplates = [
    (n) => `What is the most accurate explanation of ${cleanTopic} principle ${n}?`,
    (n) => `Which statement best describes a core idea of ${cleanTopic} (${n})?`,
    (n) => `In ${cleanTopic}, which option correctly applies concept ${n}?`,
    (n) => `Which choice is the best example of ${cleanTopic} concept ${n}?`,
  ];
  const mcqs = Array.from({ length: mcqCount }, (_, i) => ({
    questionText: mcqTemplates[i % mcqTemplates.length](i + 1),
        type: 'mcq',
    options: [
      { text: `${titleTopic} concept ${i + 1} is applied correctly with clear reasoning.`, isCorrect: true },
      { text: `${titleTopic} concept ${i + 1} is mentioned but applied incorrectly.`, isCorrect: false },
      { text: `${titleTopic} concept ${i + 1} is confused with an unrelated idea.`, isCorrect: false },
      { text: `${titleTopic} concept ${i + 1} is ignored in favor of a weak assumption.`, isCorrect: false },
    ],
    correctAnswer: `${titleTopic} concept ${i + 1} is applied correctly with clear reasoning.`,
    explanation: `This answer correctly applies the ${cleanTopic} concept using the right logic and context.`,
    marks: 1,
    difficulty,
    topic: cleanTopic,
    isAIGenerated: true,
  }));

  const shortQuestions = Array.from({ length: shortCount }, (_, i) => ({
    questionText: `Explain the key aspects of ${cleanTopic} (Part ${i + 1}).`,
        type: 'short',
   correctAnswer: `A strong answer should define ${cleanTopic}, explain its key principles, and describe at least one practical application with clear reasoning.`,
    explanation: `Key points: definition, principles, and practical use of ${cleanTopic}.`,
    marks,
    difficulty,
    topic: cleanTopic,
        isAIGenerated: true,
  }));

  return { mcqs, shortQuestions, total: mcqs.length + shortQuestions.length, isMock: true };
};
