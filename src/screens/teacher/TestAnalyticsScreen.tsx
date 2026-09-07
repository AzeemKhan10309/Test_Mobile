import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { analyticsAPI } from '../../api/analytics.api';
import { Card } from '../../components/Card';
import { ErrorState, LoadingState } from '../../components/StateViews';
import { colors, spacing, typography } from '../../theme';

export default function TestAnalyticsScreen({ route }: any) {
  const { testId } = route.params as { testId: string };
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['analytics', 'test', testId],
    queryFn: () => analyticsAPI.test(testId),
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Could not load analytics." onRetry={refetch} />;

  const stats = (data ?? {}) as Record<string, number | undefined>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={styles.title}>Test analytics</Text>
      <View style={styles.grid}>
        {stats.averageScore != null && <StatCard label="Average score" value={`${stats.averageScore}%`} />}
        {stats.completionRate != null && <StatCard label="Completion rate" value={`${stats.completionRate}%`} />}
        {stats.highestScore != null && <StatCard label="Highest score" value={stats.highestScore} />}
        {stats.lowestScore != null && <StatCard label="Lowest score" value={stats.lowestScore} />}
        {stats.totalAttempts != null && <StatCard label="Attempts" value={stats.totalAttempts} />}
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: { width: '47%', alignItems: 'center', paddingVertical: spacing.lg },
  statValue: { ...typography.h2, color: colors.primary },
  statLabel: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
});
