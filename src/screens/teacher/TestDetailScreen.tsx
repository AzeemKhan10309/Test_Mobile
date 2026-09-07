import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { questionsAPI } from '../../api/questions.api';
import { testsAPI } from '../../api/tests.api';
import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { ListItemRow } from '../../components/ListItemRow';
import { PrimaryButton } from '../../components/PrimaryButton';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { usePublishTest, useTest } from '../../hooks/useTests';
import { colors, spacing, typography } from '../../theme';

export default function TestDetailScreen({ route, navigation }: any) {
  const { testId } = route.params as { testId: string };
  const qc = useQueryClient();
  const test = useTest(testId);
  const questions = useQuery({ queryKey: ['questions', testId], queryFn: () => testsAPI.getQuestions(testId) });
  const publish = usePublishTest();
  const [busy, setBusy] = useState(false);

  if (test.isLoading || questions.isLoading) return <LoadingState />;
  if (test.isError || !test.data) return <ErrorState message="Could not load test." onRetry={() => test.refetch()} />;

  const t = test.data;
  const questionList = (questions.data as any[]) ?? [];

  const endTest = async () => {
    setBusy(true);
    try {
      await testsAPI.end(testId);
      test.refetch();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not end test.');
    } finally {
      setBusy(false);
    }
  };

  const deleteQuestion = (id: string) => {
    Alert.alert('Delete question?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await questionsAPI.delete(id);
          qc.invalidateQueries({ queryKey: ['questions', testId] });
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text style={styles.title}>{t.title}</Text>
        <Badge label={t.status} tone={t.status === 'published' ? 'success' : t.status === 'ended' ? 'neutral' : 'warning'} />
      </View>
      <Text style={styles.meta}>{t.duration} min · {t.subject}</Text>

      <View style={styles.actionsRow}>
        {t.status === 'draft' && (
          <PrimaryButton title="Publish" loading={publish.isPending} onPress={() => publish.mutate(testId)} style={styles.actionBtn} />
        )}
        {t.status === 'published' && (
          <>
            <PrimaryButton title="Monitor" onPress={() => navigation.navigate('MonitorExam', { testId })} style={styles.actionBtn} />
            <PrimaryButton title="End test" variant="danger" loading={busy} onPress={endTest} style={styles.actionBtn} />
          </>
        )}
        <PrimaryButton title="Submissions" variant="secondary" onPress={() => navigation.navigate('SubmissionList', { testId })} style={styles.actionBtn} />
        <PrimaryButton title="Analytics" variant="secondary" onPress={() => navigation.navigate('TestAnalytics', { testId })} style={styles.actionBtn} />
      </View>

      <Card style={{ marginTop: spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
          <Text style={styles.section}>Questions ({questionList.length})</Text>
          <PrimaryButton title="+ Add" variant="secondary" onPress={() => navigation.navigate('QuestionEditor', { testId })} />
        </View>
        {!questionList.length && <EmptyState title="No questions yet" />}
        {questionList.map((q: any, idx: number) => (
          <ListItemRow
            key={q._id}
            title={`${idx + 1}. ${q.questionText}`}
            subtitle={`${q.type} · ${q.marks} marks`}
            onPress={() => navigation.navigate('QuestionEditor', { testId, question: q })}
            right={
              <Text style={styles.deleteLink} onPress={() => deleteQuestion(q._id)}>Delete</Text>
            }
          />
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h1, color: colors.text, flex: 1 },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  actionBtn: { flexGrow: 1 },
  section: { ...typography.h3, color: colors.text },
  deleteLink: { color: colors.danger, fontSize: 13 },
});
