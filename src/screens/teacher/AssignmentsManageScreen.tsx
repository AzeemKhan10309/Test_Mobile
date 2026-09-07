import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { assignmentsAPI } from '../../api/assignments.api';
import { FormField } from '../../components/FormField';
import { ListItemRow } from '../../components/ListItemRow';
import { PrimaryButton } from '../../components/PrimaryButton';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { colors, spacing, typography } from '../../theme';

export default function AssignmentsManageScreen({ route, navigation }: any) {
  const { courseId, courseName } = route.params as { courseId: string; courseName: string };
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['assignments', courseId], queryFn: () => assignmentsAPI.getByCourse(courseId) });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [totalMarks, setTotalMarks] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const create = async () => {
    if (!title || !deadline || !totalMarks) {
      setError('Title, deadline, and total marks are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await assignmentsAPI.create({ title, description, courseId, deadline, totalMarks: Number(totalMarks) });
      setTitle(''); setDescription(''); setDeadline(''); setTotalMarks('');
      qc.invalidateQueries({ queryKey: ['assignments', courseId] });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not create assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Could not load assignments." onRetry={refetch} />;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg }}
      data={data ?? []}
      keyExtractor={(a) => a._id}
      ListHeaderComponent={
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={styles.title}>{courseName} assignments</Text>
          <FormField label="Title" value={title} onChangeText={setTitle} />
          <FormField label="Description" multiline value={description} onChangeText={setDescription} style={{ minHeight: 70, textAlignVertical: 'top' }} />
          <FormField label="Deadline (YYYY-MM-DD)" value={deadline} onChangeText={setDeadline} />
          <FormField label="Total marks" keyboardType="numeric" value={totalMarks} onChangeText={setTotalMarks} />
          {error && <Text style={styles.error}>{error}</Text>}
          <PrimaryButton title="Create assignment" loading={submitting} onPress={create} />
        </View>
      }
      ListEmptyComponent={<EmptyState title="No assignments yet" />}
      renderItem={({ item }) => (
        <ListItemRow
          title={item.title}
          subtitle={`Due ${new Date(item.deadline).toLocaleDateString()} · ${item.totalMarks} marks`}
          onPress={() => navigation.navigate('AssignmentSubmissions', { assignmentId: item._id, title: item.title })}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.sm },
});
