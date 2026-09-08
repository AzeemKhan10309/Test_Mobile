export const SUBJECTIVE_ALIASES = new Set([
  'short_answer',
  'long_answer',
  'descriptive',
  'subjective',
  'short',
  'long',
]);

export function normalizeAnswerType(answer = {}) {
  const rawType = String(
    answer.type
    || answer.questionType
    || answer.question?.type
    || ''
  ).trim().toLowerCase();

  if (rawType === 'mcq' || rawType === 'multiple_choice' || rawType === 'true_false') {
    return 'mcq';
  }

  if (SUBJECTIVE_ALIASES.has(rawType) || answer.manualRequired === true) {
    return 'subjective';
  }

  return 'mcq';
}

export function normalizeSubmissionAnswers(answers = []) {
  return answers.map((answer) => ({
    ...answer,
    type: normalizeAnswerType(answer),
  }));
}

export function isSubjectiveAnswer(answer = {}) {
  return normalizeAnswerType(answer) === 'subjective';
}