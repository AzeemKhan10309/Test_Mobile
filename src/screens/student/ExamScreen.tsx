import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { testsAPI } from '../../api/tests.api';
import { submissionsAPI } from '../../api/submissions.api';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useSubmissionTimer } from '../../hooks/useSubmission';
import { colors, spacing, typography } from '../../theme';
import { Answer, Question } from '../../types';

/**
 * The exam engine.
 *
 * Design constraints from the spec, honored here:
 *  - Timer is SERVER-AUTHORITATIVE. We poll GET /submissions/:id/timer every
 *    15s (see useSubmissionTimer) and only tick locally *between* polls —
 *    we never invent time, and a background/foreground cycle re-syncs
 *    against the server instead of resuming a local clock.
 *  - Autosave is debounced (1.5s of inactivity) via PUT .../answers, and the
 *    UI always reflects the true save state (Saving / Saved / Failed) rather
 *    than optimistically claiming success.
 *  - Submission is guarded against duplicates: the button disables the
 *    moment a submit is in flight or has already succeeded, and an
 *    idempotency key is sent so a retried request can't double-submit.
 */

type SaveState = 'idle' | 'saving' | 'saved' | 'failed';

export default function ExamScreen({ route, navigation }: any) {
  const { submissionId, testId } = route.params as { submissionId: string; testId: string };
  const queryClient = useQueryClient();

  const questionsQuery = useQuery({
    queryKey: ['questions', testId],
    queryFn: () => testsAPI.getQuestions(testId),
  });

  const submissionQuery = useQuery({
    queryKey: ['submissions', submissionId],
    queryFn: () => submissionsAPI.getById(submissionId),
  });

  const timerQuery = useSubmissionTimer(submissionId, true);

  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [localSecondsLeft, setLocalSecondsLeft] = useState<number | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idempotencyKeyRef = useRef<string>(`${submissionId}-${Date.now()}`);
  const hasSubmittedRef = useRef(false);

  // Hydrate local answer map from the existing submission once loaded.
  useEffect(() => {
    const existing = submissionQuery.data?.answers;
    if (existing && Object.keys(answers).length === 0) {
      const map: Record<string, Answer> = {};
      existing.forEach((a) => { map[a.questionId] = a; });
      setAnswers(map);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionQuery.data]);

  // Server timer resync -> reset local countdown baseline.
  useEffect(() => {
    if (timerQuery.data?.remainingSeconds != null) {
      setLocalSecondsLeft(timerQuery.data.remainingSeconds);
    }
  }, [timerQuery.data?.remainingSeconds]);

  // Local ticking between server polls — display only, never authoritative.
  useEffect(() => {
    if (localSecondsLeft == null) return;
    const id = setInterval(() => {
      setLocalSecondsLeft((s) => (s != null && s > 0 ? s - 1 : s));
    }, 1000);
    return () => clearInterval(id);
  }, [localSecondsLeft == null]);

  // Auto force-submit path when time hits zero.
  useEffect(() => {
    if (localSecondsLeft === 0 && !hasSubmittedRef.current) {
      void handleSubmit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSecondsLeft]);

  // Re-sync timer when app returns from background instead of trusting a
  // clock that kept "running" while suspended.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        queryClient.invalidateQueries({ queryKey: ['submissions', submissionId, 'timer'] });
      }
    });
    return () => sub.remove();
  }, [submissionId, queryClient]);

  const questions: Question[] = questionsQuery.data ?? [];
  const currentQuestion = questions[currentIndex];

  const scheduleAutosave = useCallback(
    (nextAnswers: Record<string, Answer>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setSaveState('saving');
      debounceRef.current = setTimeout(async () => {
        try {
          await submissionsAPI.saveAnswers(submissionId, Object.values(nextAnswers));
          setSaveState('saved');
        } catch {
          setSaveState('failed');
        }
      }, 1500);
    },
    [submissionId]
  );

  const updateAnswer = (questionId: string, value: string | string[]) => {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: { questionId, answer: value, flagged: prev[questionId]?.flagged } };
      scheduleAutosave(next);
      return next;
    });
  };

  const toggleFlag = async (questionId: string) => {
    setAnswers((prev) => {
      const flagged = !prev[questionId]?.flagged;
      const next = { ...prev, [questionId]: { questionId, answer: prev[questionId]?.answer ?? null, flagged } };
      return next;
    });
    try {
      await submissionsAPI.flag(submissionId, 'question_flag', questionId);
    } catch {
      // Non-critical — flag is a student convenience marker, not exam-integrity data here.
    }
  };

  const handleSubmit = async (auto = false) => {
    if (hasSubmittedRef.current || submitting) return;
    hasSubmittedRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Flush any pending autosave first so the last edits aren't lost.
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        await submissionsAPI.saveAnswers(submissionId, Object.values(answers));
      }
      const result = await submissionsAPI.submit(submissionId, idempotencyKeyRef.current);
      navigation.replace('ExamResult', { submissionId, result });
    } catch (err: any) {
      hasSubmittedRef.current = false; // allow a retry on genuine failure
      setSubmitError(
        auto
          ? 'Time expired but we could not confirm your submission. Retrying is safe — please try again.'
          : err?.response?.data?.message || 'Submission failed. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (questionsQuery.isLoading || submissionQuery.isLoading) return <LoadingState label="Loading exam…" />;
  if (questionsQuery.isError) return <ErrorState message="Could not load questions." onRetry={() => questionsQuery.refetch()} />;
  if (!questions.length) return <EmptyState title="No questions found for this test." />;

  const minutes = localSecondsLeft != null ? Math.floor(localSecondsLeft / 60) : null;
  const seconds = localSecondsLeft != null ? localSecondsLeft % 60 : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.timer}>
          {minutes != null ? `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}` : '--:--'}
        </Text>
        <Text style={styles.saveIndicator}>
          {saveState === 'saving' && 'Saving…'}
          {saveState === 'saved' && 'Saved'}
          {saveState === 'failed' && 'Failed to save'}
        </Text>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={styles.qCounter}>Question {currentIndex + 1} of {questions.length}</Text>
        <Text style={styles.qText}>{currentQuestion.questionText}</Text>

        {currentQuestion.type === 'mcq' && currentQuestion.options?.map((opt) => {
          const selected = answers[currentQuestion._id]?.answer === opt;
          return (
            <TouchableOpacity
              key={opt}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => updateAnswer(currentQuestion._id, opt)}
            >
              <Text style={selected ? styles.optionTextSelected : styles.optionText}>{opt}</Text>
            </TouchableOpacity>
          );
        })}

        {currentQuestion.type === 'true_false' && ['True', 'False'].map((opt) => {
          const selected = answers[currentQuestion._id]?.answer === opt;
          return (
            <TouchableOpacity key={opt} style={[styles.option, selected && styles.optionSelected]} onPress={() => updateAnswer(currentQuestion._id, opt)}>
              <Text style={selected ? styles.optionTextSelected : styles.optionText}>{opt}</Text>
            </TouchableOpacity>
          );
        })}

        {(currentQuestion.type === 'short_answer' || currentQuestion.type === 'long_answer') && (
          <TextInput
            style={styles.textAnswer}
            multiline={currentQuestion.type === 'long_answer'}
            placeholder="Type your answer"
            value={(answers[currentQuestion._id]?.answer as string) || ''}
            onChangeText={(text) => updateAnswer(currentQuestion._id, text)}
          />
        )}

        <TouchableOpacity onPress={() => toggleFlag(currentQuestion._id)} style={{ marginTop: spacing.md }}>
          <Text style={{ color: answers[currentQuestion._id]?.flagged ? colors.warning : colors.textMuted }}>
            {answers[currentQuestion._id]?.flagged ? '🚩 Flagged for review' : 'Flag for review'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.navigator}>
        <PrimaryButton title="Previous" variant="secondary" disabled={currentIndex === 0} onPress={() => setCurrentIndex((i) => i - 1)} style={styles.navBtn} />
        {currentIndex < questions.length - 1 ? (
          <PrimaryButton title="Next" onPress={() => setCurrentIndex((i) => i + 1)} style={styles.navBtn} />
        ) : (
          <PrimaryButton title="Submit Exam" onPress={() => handleSubmit(false)} loading={submitting} style={styles.navBtn} />
        )}
      </View>
      {submitError && <Text style={styles.submitError}>{submitError}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  timer: { ...typography.h2, color: colors.danger },
  saveIndicator: { ...typography.caption, color: colors.textMuted },
  body: { flex: 1 },
  qCounter: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.xs },
  qText: { ...typography.h3, color: colors.text, marginBottom: spacing.md },
  option: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.md, marginBottom: spacing.sm, backgroundColor: colors.surface },
  optionSelected: { borderColor: colors.primary, backgroundColor: '#EEF2FF' },
  optionText: { color: colors.text },
  optionTextSelected: { color: colors.primaryDark, fontWeight: '600' },
  textAnswer: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.md, minHeight: 100, backgroundColor: colors.surface, textAlignVertical: 'top' },
  navigator: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  navBtn: { flex: 1 },
  submitError: { color: colors.danger, textAlign: 'center', paddingBottom: spacing.sm },
});
