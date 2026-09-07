import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { adminAPI } from '../../api/admin.api';
import { Card } from '../../components/Card';
import { ErrorState, LoadingState } from '../../components/StateViews';
import { colors, spacing, typography } from '../../theme';

export default function AdminDashboardScreen() {
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminAPI.getStats,
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Could not load platform stats." onRetry={() => refetch()} />;

  const stats = (data ?? {}) as Record<string, number | undefined>;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      <Text style={styles.title}>Platform overview</Text>
      <View style={styles.grid}>
        {stats.totalUsers != null && <StatCard label="Users" value={stats.totalUsers} />}
        {stats.totalTeachers != null && <StatCard label="Teachers" value={stats.totalTeachers} />}
        {stats.totalStudents != null && <StatCard label="Students" value={stats.totalStudents} />}
        {stats.totalCourses != null && <StatCard label="Courses" value={stats.totalCourses} />}
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
