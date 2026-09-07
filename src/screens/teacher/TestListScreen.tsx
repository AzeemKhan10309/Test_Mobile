import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Badge } from '../../components/Badge';
import { ListItemRow } from '../../components/ListItemRow';
import { PrimaryButton } from '../../components/PrimaryButton';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { useTests } from '../../hooks/useTests';
import { colors, spacing, typography } from '../../theme';

const STATUS_FILTERS = ['all', 'draft', 'published', 'ended'] as const;

export default function TestListScreen({ navigation }: any) {
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>('all');
  const { data, isLoading, isError, refetch } = useTests(status === 'all' ? undefined : { status });

  const tone = (s: string) => (s === 'published' ? 'success' : s === 'ended' ? 'neutral' : 'warning');

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>My tests</Text>
        <PrimaryButton title="+ New test" onPress={() => navigation.navigate('CreateTest')} />
      </View>
      <View style={styles.filters}>
        {STATUS_FILTERS.map((s) => (
          <TouchableOpacity key={s} style={[styles.chip, status === s && styles.chipActive]} onPress={() => setStatus(s)}>
            <Text style={status === s ? styles.chipTextActive : styles.chipText}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message="Could not load tests." onRetry={refetch} />
      ) : (
        <FlatList
          contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}
          data={data?.items ?? []}
          keyExtractor={(t) => t._id}
          ListEmptyComponent={<EmptyState title="No tests yet" subtitle="Create your first test." />}
          renderItem={({ item }) => (
            <ListItemRow
              title={item.title}
              subtitle={`${item.duration} min · ${item.totalMarks ?? '—'} marks`}
              right={<Badge label={item.status} tone={tone(item.status) as any} />}
              onPress={() => navigation.navigate('TestDetail', { testId: item._id })}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, paddingBottom: spacing.sm },
  title: { ...typography.h1, color: colors.text },
  filters: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 13 },
  chipTextActive: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
