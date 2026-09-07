import { useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { Alert, FlatList, StyleSheet, Text } from 'react-native';
import { adminAPI } from '../../api/admin.api';
import { ListItemRow } from '../../components/ListItemRow';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { colors, spacing, typography } from '../../theme';

export default function AdminCoursesScreen() {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['admin', 'courses'], queryFn: () => adminAPI.getCourses() });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Could not load courses." onRetry={refetch} />;

  const remove = (id: string) => {
    Alert.alert('Delete course?', 'This cascades to related data.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await adminAPI.deleteCourse(id); qc.invalidateQueries({ queryKey: ['admin', 'courses'] }); } },
    ]);
  };

  const unassign = (id: string) => {
    Alert.alert('Unassign teacher?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unassign', onPress: async () => { await adminAPI.reassignCourseTeacher(id, null); qc.invalidateQueries({ queryKey: ['admin', 'courses'] }); } },
    ]);
  };

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg }}
      data={data ?? []}
      keyExtractor={(c) => c._id}
      ListHeaderComponent={<Text style={styles.title}>All courses</Text>}
      ListEmptyComponent={<EmptyState title="No courses" />}
      renderItem={({ item }) => (
        <ListItemRow
          title={item.courseName}
          subtitle={item.teacherId ? `Teacher: ${item.teacherId}` : 'Unassigned'}
          right={
            <Text style={styles.link} onPress={() => (item.teacherId ? unassign(item._id) : remove(item._id))}>
              {item.teacherId ? 'Unassign' : 'Delete'}
            </Text>
          }
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.lg },
  link: { color: colors.danger, fontSize: 12, fontWeight: '600' },
});
