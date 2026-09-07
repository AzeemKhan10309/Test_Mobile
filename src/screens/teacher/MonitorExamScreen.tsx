import { useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { submissionsAPI } from '../../api/submissions.api';
import { Badge } from '../../components/Badge';
import { ListItemRow } from '../../components/ListItemRow';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { colors, spacing, typography } from '../../theme';

export default function MonitorExamScreen({ route }: any) {
  const { testId } = route.params as { testId: string };
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['submissions', 'test', testId],
    queryFn: () => submissionsAPI.getForTest(testId),
    refetchInterval: 10000, // live-ish monitoring via polling — no WebSocket backend
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Could not load live submissions." onRetry={refetch} />;

  const tone = (s: string) => (s === 'in_progress' ? 'warning' : s === 'submitted' ? 'success' : 'neutral');

  const forceSubmit = (id: string) => {
    Alert.alert('Force submit?', 'This will end the student\u2019s attempt immediately.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Force submit', style: 'destructive', onPress: async () => {
          await submissionsAPI.forceSubmit(id);
          qc.invalidateQueries({ queryKey: ['submissions', 'test', testId] });
        },
      },
    ]);
  };

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg }}
      data={data ?? []}
      keyExtractor={(s: any) => s._id}
      ListHeaderComponent={<Text style={styles.title}>Live monitoring</Text>}
      ListEmptyComponent={<EmptyState title="No students have started yet" />}
      renderItem={({ item }: any) => (
        <ListItemRow
          title={item.studentName || item.studentId}
          subtitle={item.status}
          right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Badge label={item.status} tone={tone(item.status) as any} />
              {item.status === 'in_progress' && (
                <Text style={styles.forceLink} onPress={() => forceSubmit(item._id)}>Force submit</Text>
              )}
            </View>
          }
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.lg },
  forceLink: { color: colors.danger, fontSize: 12, fontWeight: '600' },
});
