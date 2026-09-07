import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { coursesAPI } from '../../api/courses.api';
import { FormField } from '../../components/FormField';
import { ListItemRow } from '../../components/ListItemRow';
import { PrimaryButton } from '../../components/PrimaryButton';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { colors, spacing, typography } from '../../theme';

export default function CoursesManageScreen({ navigation }: any) {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['courses'], queryFn: coursesAPI.getAll });

  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [description, setDescription] = useState('');
  const [classType, setClassType] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const create = async () => {
    if (!courseName || !description || !classType) {
      setError('Course name, description, and class type are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await coursesAPI.create({ courseName, courseCode: courseCode || undefined, description, classType });
      setCourseName(''); setCourseCode(''); setDescription(''); setClassType('');
      qc.invalidateQueries({ queryKey: ['courses'] });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not create course.');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = (id: string) => {
    Alert.alert('Delete course?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await coursesAPI.delete(id); qc.invalidateQueries({ queryKey: ['courses'] }); } },
    ]);
  };

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Could not load courses." onRetry={refetch} />;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg }}
      data={data ?? []}
      keyExtractor={(c) => c._id}
      ListHeaderComponent={
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={styles.title}>My courses</Text>
          <FormField label="Course name" value={courseName} onChangeText={setCourseName} />
          <FormField label="Course code (optional)" value={courseCode} onChangeText={setCourseCode} />
          <FormField label="Class type" placeholder="e.g. O-Level, A-Level" value={classType} onChangeText={setClassType} />
          <FormField label="Description" multiline value={description} onChangeText={setDescription} style={{ minHeight: 70, textAlignVertical: 'top' }} />
          {error && <Text style={styles.error}>{error}</Text>}
          <PrimaryButton title="Create course" loading={submitting} onPress={create} />
        </View>
      }
      ListEmptyComponent={<EmptyState title="No courses yet" />}
      renderItem={({ item }) => (
        <ListItemRow
          title={item.courseName}
          subtitle={item.courseCode ? `${item.courseCode} · ${item.classType}` : item.classType}
          onPress={() => navigation.navigate('CourseManageDetail', { courseId: item._id, courseName: item.courseName })}
          right={<Text style={styles.deleteLink} onPress={() => remove(item._id)}>Delete</Text>}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.sm },
  deleteLink: { color: colors.danger, fontSize: 12, fontWeight: '600' },
});
