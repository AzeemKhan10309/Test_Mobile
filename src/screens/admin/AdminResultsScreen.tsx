import { useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { adminAPI } from '../../api/admin.api';
import { Card } from '../../components/Card';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { colors, spacing, typography } from '../../theme';

export default function AdminResultsScreen() {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['admin', 'results'], queryFn: () => adminAPI.getResults() });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Could not load results." onRetry={refetch} />;

  const remove = (id: string) => {
    Alert.alert('Delete result?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await adminAPI.deleteResult(id); qc.invalidateQueries({ queryKey: ['admin', 'results'] }); } },
    ]);
  };

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg }}
      data={data ?? []}
      keyExtractor={(r) => r._id}
      ListHeaderComponent={<Text style={styles.title}>All results</Text>}
      ListEmptyComponent={<EmptyState title="No results" />}
      renderItem={({ item }) => (
        <Card style={{ marginBottom: spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.deleteLink} onPress={() => remove(item._id)}>Delete</Text>
          </View>
          <Text style={styles.meta}>{item.marksObtained}/{item.totalMarks} · {item.type}</Text>
        </Card>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.lg },
  itemTitle: { ...typography.body, fontWeight: '700', color: colors.text },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  deleteLink: { color: colors.danger, fontSize: 12, fontWeight: '600' },
});
