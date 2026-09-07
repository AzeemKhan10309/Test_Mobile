import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { assignmentsAPI } from '../../api/assignments.api';
import { Card } from '../../components/Card';
import { PrimaryButton } from '../../components/PrimaryButton';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { colors, spacing, typography } from '../../theme';

export default function AssignmentSubmissionsScreen({ route }: any) {
  const { assignmentId, title } = route.params as { assignmentId: string; title: string };
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['assignment', assignmentId, 'submissions'],
    queryFn: () => assignmentsAPI.getSubmissions(assignmentId),
  });
  const [marksDraft, setMarksDraft] = useState<Record<string, string>>({});
  const [feedbackDraft, setFeedbackDraft] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Could not load submissions." onRetry={refetch} />;

  const grade = async (submissionId: string) => {
    setSavingId(submissionId);
    try {
      await assignmentsAPI.gradeSubmission(submissionId, Number(marksDraft[submissionId] || 0), feedbackDraft[submissionId]);
      qc.invalidateQueries({ queryKey: ['assignment', assignmentId, 'submissions'] });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg }}
      data={data ?? []}
      keyExtractor={(s) => s._id}
      ListHeaderComponent={<Text style={styles.title}>{title} — submissions</Text>}
      ListEmptyComponent={<EmptyState title="No submissions yet" />}
      renderItem={({ item }) => (
        <Card style={{ marginBottom: spacing.sm }}>
          {item.text ? <Text style={styles.text}>{item.text}</Text> : null}
          {item.fileUrl ? <Text style={styles.fileLink}>Attached file</Text> : null}
          <Text style={styles.meta}>Submitted {new Date(item.submittedAt).toLocaleString()}</Text>
          {item.marks != null ? (
            <Text style={styles.graded}>Graded: {item.marks} — {item.feedback}</Text>
          ) : (
            <View style={{ marginTop: spacing.sm }}>
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
                <TextInput
                  style={styles.marksInput}
                  placeholder="Marks"
                  keyboardType="numeric"
                  value={marksDraft[item._id] ?? ''}
                  onChangeText={(v) => setMarksDraft((prev) => ({ ...prev, [item._id]: v }))}
                />
                <TextInput
                  style={styles.feedbackInput}
                  placeholder="Feedback (optional)"
                  value={feedbackDraft[item._id] ?? ''}
                  onChangeText={(v) => setFeedbackDraft((prev) => ({ ...prev, [item._id]: v }))}
                />
              </View>
              <PrimaryButton title="Save grade" loading={savingId === item._id} onPress={() => grade(item._id)} />
            </View>
          )}
        </Card>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.lg },
  text: { ...typography.body, color: colors.text },
  fileLink: { color: colors.primary, marginTop: spacing.xs },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  graded: { color: colors.success, marginTop: spacing.sm, fontWeight: '600' },
  marksInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: spacing.sm, width: 80, backgroundColor: colors.surface },
  feedbackInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: spacing.sm, backgroundColor: colors.surface },
});
