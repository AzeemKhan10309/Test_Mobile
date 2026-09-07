import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { analyticsAPI } from '../../api/analytics.api';
import { Card } from '../../components/Card';
import { ErrorState, LoadingState } from '../../components/StateViews';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, typography } from '../../theme';

export default function StudentDashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['analytics', 'student', 'me'],
    queryFn: () => analyticsAPI.student('me'),
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Could not load your dashboard." onRetry={() => refetch()} />;

  // Only render stat cards for fields the backend actually returned —
  // never fabricate numbers the API doesn't provide.
  const stats = (data ?? {}) as Record<string, number | undefined>;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      <Text style={styles.greeting}>Hi, {user?.name?.split(' ')[0]}</Text>

      <View style={styles.grid}>
        {stats.totalCourses != null && <StatCard label="Courses" value={stats.totalCourses} />}
        {stats.upcomingTests != null && <StatCard label="Upcoming tests" value={stats.upcomingTests} />}
        {stats.averageScore != null && <StatCard label="Average score" value={`${stats.averageScore}%`} />}
        {stats.attendanceRate != null && <StatCard label="Attendance" value={`${stats.attendanceRate}%`} />}
      </View>

      <Card style={{ marginTop: spacing.lg }}>
        <Text style={typography.h3 as any}>Join a test</Text>
        <Text style={{ color: colors.textMuted, marginTop: spacing.xs }} onPress={() => navigation.navigate('JoinExam')}>
          Have a share link or code? Tap here to join.
        </Text>
      </Card>
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
  greeting: { ...typography.h1, color: colors.text, marginBottom: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: { width: '47%', alignItems: 'center', paddingVertical: spacing.lg },
  statValue: { ...typography.h2, color: colors.primary },
  statLabel: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
});
