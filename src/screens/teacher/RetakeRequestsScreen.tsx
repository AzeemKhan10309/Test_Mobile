import { useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { retakeAPI } from '../../api/retake.api';
import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { PrimaryButton } from '../../components/PrimaryButton';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { colors, spacing, typography } from '../../theme';

export default function RetakeRequestsScreen({ route }: any) {
  const { testId } = route.params as { testId: string };
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['retake', testId],
    queryFn: () => retakeAPI.getForTest(testId),
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Could not load retake requests." onRetry={refetch} />;

  const act = async (fn: () => Promise<unknown>) => {
    await fn();
    qc.invalidateQueries({ queryKey: ['retake', testId] });
  };

  const tone = (s: string) => (s === 'approved' ? 'success' : s === 'rejected' ? 'danger' : 'warning');

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg }}
      data={data?.items ?? []}
      keyExtractor={(r) => r._id}
      ListHeaderComponent={<Text style={styles.title}>Retake requests</Text>}
      ListEmptyComponent={<EmptyState title="No retake requests" />}
      renderItem={({ item }) => (
        <Card style={{ marginBottom: spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.itemTitle}>Student {item.studentId}</Text>
            <Badge label={item.status} tone={tone(item.status) as any} />
          </View>
          <Text style={styles.itemBody}>{item.reason}</Text>
          {item.status === 'pending' && (
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
              <PrimaryButton title="Approve" onPress={() => act(() => retakeAPI.approve(item._id))} style={{ flex: 1 }} />
              <PrimaryButton title="Reject" variant="danger" onPress={() => act(() => retakeAPI.reject(item._id))} style={{ flex: 1 }} />
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
  itemTitle: { ...typography.body, fontWeight: '700', color: colors.text },
  itemBody: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
});
