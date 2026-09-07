import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { resultsAPI } from '../../api/results.api';
import { Card } from '../../components/Card';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { colors, spacing, typography } from '../../theme';

export default function ResultsScreen() {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['results', 'me'], queryFn: () => resultsAPI.getForStudent('me') });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Could not load results." onRetry={refetch} />;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg }}
      data={data?.results ?? []}
      keyExtractor={(r) => r._id}
      ListHeaderComponent={<Text style={styles.title}>My results</Text>}
      ListEmptyComponent={<EmptyState title="No results yet" />}
      renderItem={({ item }) => (
        <Card style={{ marginBottom: spacing.sm }}>
          <View style={styles.row}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.score}>{item.marksObtained}/{item.totalMarks}</Text>
          </View>
          <Text style={styles.meta}>{item.type} · {new Date(item.date).toLocaleDateString()}</Text>
        </Card>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  itemTitle: { ...typography.body, fontWeight: '700', color: colors.text },
  score: { ...typography.body, fontWeight: '700', color: colors.primary },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
});
