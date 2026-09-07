import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { submissionsAPI } from '../../api/submissions.api';
import { LoadingState, ErrorState } from '../../components/StateViews';
import { Card } from '../../components/Card';
import { colors, spacing, typography } from '../../theme';

export default function ExamResultScreen({ route }: any) {
  const { submissionId } = route.params as { submissionId: string };
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['submissions', submissionId, 'result'],
    queryFn: () => submissionsAPI.getResult(submissionId),
  });

  if (isLoading) return <LoadingState label="Loading result…" />;
  if (isError || !data) return <ErrorState message="Result not available yet." onRetry={() => refetch()} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <Card style={{ marginBottom: spacing.lg, alignItems: 'center' }}>
        <Text style={styles.score}>{data.marksObtained} / {data.totalMarks}</Text>
        <Text style={styles.scoreLabel}>Your score</Text>
      </Card>

      {data.answers.map((a, idx) => (
        <Card key={a.questionId} style={{ marginBottom: spacing.sm }}>
          <Text style={styles.qText}>{idx + 1}. {a.questionText}</Text>
          <Text style={styles.aLabel}>Your answer: <Text style={styles.aValue}>{String(a.answer ?? '—')}</Text></Text>
          {a.marksAwarded != null && <Text style={styles.marks}>Marks: {a.marksAwarded}</Text>}
        </Card>
      ))}

      {data.teacherNotes ? (
        <Card style={{ marginTop: spacing.sm }}>
          <Text style={styles.qText}>Teacher notes</Text>
          <Text style={styles.aValue}>{data.teacherNotes}</Text>
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  score: { ...typography.h1, color: colors.primary },
  scoreLabel: { ...typography.body, color: colors.textMuted },
  qText: { ...typography.h3, color: colors.text, marginBottom: spacing.xs },
  aLabel: { ...typography.body, color: colors.textMuted },
  aValue: { color: colors.text, fontWeight: '600' },
  marks: { ...typography.caption, color: colors.success, marginTop: spacing.xs },
});
