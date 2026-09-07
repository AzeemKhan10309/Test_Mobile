import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { reviewsAPI } from '../../api/reviews.api';
import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { colors, spacing, typography } from '../../theme';

const STATUSES = ['all', 'pending', 'approved', 'rejected'] as const;

export default function AdminReviewsScreen() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('all');
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'reviews', status],
    queryFn: () => reviewsAPI.adminGetAll(status === 'all' ? undefined : { status }),
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Could not load reviews." onRetry={refetch} />;

  const setReviewStatus = async (id: string, newStatus: string) => {
    await reviewsAPI.adminUpdateStatus(id, newStatus);
    qc.invalidateQueries({ queryKey: ['admin', 'reviews'] });
  };

  const remove = (id: string) => {
    Alert.alert('Delete review?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await reviewsAPI.adminDelete(id); qc.invalidateQueries({ queryKey: ['admin', 'reviews'] }); } },
    ]);
  };

  const tone = (s?: string) => (s === 'approved' ? 'success' : s === 'rejected' ? 'danger' : 'warning');

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        {STATUSES.map((s) => (
          <TouchableOpacity key={s} style={[styles.chip, status === s && styles.chipActive]} onPress={() => setStatus(s)}>
            <Text style={status === s ? styles.chipTextActive : styles.chipText}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}
        data={data?.items ?? []}
        keyExtractor={(r) => r._id}
        ListEmptyComponent={<EmptyState title="No reviews" />}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.stars}>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</Text>
              <Badge label={item.status ?? 'pending'} tone={tone(item.status) as any} />
            </View>
            <Text style={styles.body}>{item.content}</Text>
            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
              <Text style={styles.actionLink} onPress={() => setReviewStatus(item._id, 'approved')}>Approve</Text>
              <Text style={styles.actionLink} onPress={() => setReviewStatus(item._id, 'rejected')}>Reject</Text>
              <Text style={styles.deleteLink} onPress={() => remove(item._id)}>Delete</Text>
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, padding: spacing.lg },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 13 },
  chipTextActive: { color: '#fff', fontSize: 13, fontWeight: '600' },
  stars: { color: colors.warning, fontSize: 16 },
  body: { ...typography.body, color: colors.text, marginTop: spacing.xs },
  actionLink: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  deleteLink: { color: colors.danger, fontWeight: '600', fontSize: 13 },
});
