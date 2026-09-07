import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { FlatList, StyleSheet, Text } from 'react-native';
import { submissionsAPI } from '../../api/submissions.api';
import { Badge } from '../../components/Badge';
import { ListItemRow } from '../../components/ListItemRow';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { colors, spacing, typography } from '../../theme';

export default function SubmissionListScreen({ route, navigation }: any) {
  const { testId } = route.params as { testId: string };
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['submissions', 'test', testId],
    queryFn: () => submissionsAPI.getForTest(testId),
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Could not load submissions." onRetry={refetch} />;

  const tone = (s: string) => (s === 'graded' ? 'success' : s === 'submitted' ? 'warning' : 'neutral');

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg }}
      data={data ?? []}
      keyExtractor={(s: any) => s._id}
      ListHeaderComponent={<Text style={styles.title}>Submissions</Text>}
      ListEmptyComponent={<EmptyState title="No submissions yet" />}
      renderItem={({ item }: any) => (
        <ListItemRow
          title={item.studentName || item.studentId}
          subtitle={item.submittedAt ? new Date(item.submittedAt).toLocaleString() : item.status}
          right={<Badge label={item.status} tone={tone(item.status) as any} />}
          onPress={() => navigation.navigate('Grading', { submissionId: item._id })}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.lg },
});
