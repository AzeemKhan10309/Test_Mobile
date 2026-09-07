import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { coursesAPI } from '../../api/courses.api';
import { PrimaryButton } from '../../components/PrimaryButton';
import { FormField } from '../../components/FormField';
import { ListItemRow } from '../../components/ListItemRow';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { colors, spacing, typography } from '../../theme';

export default function CoursesScreen({ navigation }: any) {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['courses'], queryFn: coursesAPI.getAll });
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = async () => {
    if (!code) return;
    setJoining(true);
    setError(null);
    try {
      await coursesAPI.joinByCode(code.trim());
      setCode('');
      refetch();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not join course.');
    } finally {
      setJoining(false);
    }
  };

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Could not load courses." onRetry={refetch} />;

  return (
    <View style={styles.container}>
      <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
        <Text style={styles.title}>My courses</Text>
        <FormField label="Join a course by code" placeholder="Course code" autoCapitalize="none" value={code} onChangeText={setCode} error={error ?? undefined} />
        <PrimaryButton title="Join course" loading={joining} onPress={join} style={{ marginBottom: spacing.md }} />
      </View>
      <FlatList
        data={data ?? []}
        keyExtractor={(c) => c._id}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}
        ListEmptyComponent={<EmptyState title="No courses yet" subtitle="Join a course using the code above." />}
        renderItem={({ item }) => (
          <ListItemRow
            title={item.courseName}
            subtitle={item.courseCode ? `Code: ${item.courseCode}` : item.classType}
            onPress={() => navigation.navigate('CourseDetails', { courseId: item._id, courseName: item.courseName })}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.md },
});
