import { useQuery } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { submissionsAPI } from '../../api/submissions.api';
import { Card } from '../../components/Card';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ErrorState, LoadingState } from '../../components/StateViews';
import { colors, spacing, typography } from '../../theme';

export default function GradingScreen({ route, navigation }: any) {
  const { submissionId } = route.params as { submissionId: string };
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['submissions', submissionId, 'result'],
    queryFn: () => submissionsAPI.getResult(submissionId),
  });

  const [marksByQuestion, setMarksByQuestion] = useState<Record<string, string>>({});
  const [teacherNotes, setTeacherNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      const initial: Record<string, string> = {};
      data.answers.forEach((a) => { initial[a.questionId] = String(a.marksAwarded ?? ''); });
      setMarksByQuestion(initial);
      setTeacherNotes(data.teacherNotes ?? '');
    }
  }, [data]);

  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState message="Could not load submission." onRetry={refetch} />;

  const submitGrade = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const grades = Object.entries(marksByQuestion).map(([questionId, marks]) => ({
        questionId,
        marksAwarded: Number(marks) || 0,
      }));
      await submissionsAPI.grade(submissionId, grades, teacherNotes || undefined);
      navigation.goBack();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not save grades.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={styles.title}>Grade submission</Text>
      <Text style={styles.total}>Current total: {data.marksObtained} / {data.totalMarks}</Text>

      {data.answers.map((a, idx) => (
        <Card key={a.questionId} style={{ marginBottom: spacing.sm }}>
          <Text style={styles.qText}>{idx + 1}. {a.questionText}</Text>
          <Text style={styles.aLabel}>Student answer: <Text style={styles.aValue}>{String(a.answer ?? '—')}</Text></Text>
          {a.correctAnswer != null && <Text style={styles.aLabel}>Expected: <Text style={styles.aValue}>{String(a.correctAnswer)}</Text></Text>}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs }}>
            <Text style={styles.marksLabel}>Marks:</Text>
            <TextInput
              style={styles.marksInput}
              keyboardType="numeric"
              value={marksByQuestion[a.questionId] ?? ''}
              onChangeText={(v) => setMarksByQuestion((prev) => ({ ...prev, [a.questionId]: v }))}
            />
          </View>
        </Card>
      ))}

      <Text style={styles.label}>Teacher notes</Text>
      <TextInput
        style={styles.notesInput}
        multiline
        value={teacherNotes}
        onChangeText={setTeacherNotes}
        placeholder="Optional feedback for the student"
      />

      {error && <Text style={styles.error}>{error}</Text>}
      <PrimaryButton title="Save grades" loading={submitting} onPress={submitGrade} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h1, color: colors.text },
  total: { ...typography.body, color: colors.primary, fontWeight: '700', marginBottom: spacing.md },
  qText: { ...typography.body, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  aLabel: { ...typography.caption, color: colors.textMuted },
  aValue: { color: colors.text, fontWeight: '600' },
  marksLabel: { ...typography.body, color: colors.text, marginRight: spacing.sm },
  marksInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: spacing.sm, width: 70, backgroundColor: colors.surface },
  label: { ...typography.caption, color: colors.textMuted, marginTop: spacing.md, marginBottom: spacing.xs },
  notesInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.md, minHeight: 80, textAlignVertical: 'top', backgroundColor: colors.surface, marginBottom: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.sm },
});
