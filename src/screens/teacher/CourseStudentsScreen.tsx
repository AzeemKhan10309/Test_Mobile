import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { FlatList, StyleSheet, Text } from 'react-native';
import { coursesAPI } from '../../api/courses.api';
import { ListItemRow } from '../../components/ListItemRow';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { colors, spacing, typography } from '../../theme';

export default function CourseStudentsScreen({ route }: any) {
  const { courseId, courseName } = route.params as { courseId: string; courseName: string };
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['course', courseId, 'students'],
    queryFn: () => coursesAPI.getStudents(courseId),
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Could not load students." onRetry={refetch} />;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg }}
      data={(data as any[]) ?? []}
      keyExtractor={(s: any) => s._id}
      ListHeaderComponent={<Text style={styles.title}>{courseName} students</Text>}
      ListEmptyComponent={<EmptyState title="No students enrolled yet" />}
      renderItem={({ item }: any) => <ListItemRow title={item.name} subtitle={item.studentId} />}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.lg },
});
