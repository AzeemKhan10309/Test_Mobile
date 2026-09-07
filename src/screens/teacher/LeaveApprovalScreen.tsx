import { useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { leaveAPI } from '../../api/leave.api';
import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { PrimaryButton } from '../../components/PrimaryButton';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { colors, spacing, typography } from '../../theme';

export default function LeaveApprovalScreen({ route }: any) {
  const { courseId, courseName } = route.params as { courseId: string; courseName: string };
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['leave', courseId], queryFn: () => leaveAPI.getAll(courseId) });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Could not load leave requests." onRetry={refetch} />;

  const act = async (id: string, status: 'approved' | 'rejected') => {
    await leaveAPI.updateStatus(id, status);
    qc.invalidateQueries({ queryKey: ['leave', courseId] });
  };

  const tone = (s: string) => (s === 'approved' ? 'success' : s === 'rejected' ? 'danger' : 'warning');

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg }}
      data={data ?? []}
      keyExtractor={(l) => l._id}
      ListHeaderComponent={<Text style={styles.title}>{courseName} leave requests</Text>}
      ListEmptyComponent={<EmptyState title="No leave requests" />}
      renderItem={({ item }) => (
        <Card style={{ marginBottom: spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.itemTitle}>{new Date(item.date).toLocaleDateString()}</Text>
            <Badge label={item.status} tone={tone(item.status) as any} />
          </View>
          <Text style={styles.itemBody}>{item.reason}</Text>
          {item.status === 'pending' && (
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
              <PrimaryButton title="Approve" onPress={() => act(item._id, 'approved')} style={{ flex: 1 }} />
              <PrimaryButton title="Reject" variant="danger" onPress={() => act(item._id, 'rejected')} style={{ flex: 1 }} />
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
