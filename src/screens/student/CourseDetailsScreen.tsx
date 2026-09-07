import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { announcementsAPI } from '../../api/announcements.api';
import { assignmentsAPI } from '../../api/assignments.api';
import { Card } from '../../components/Card';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { colors, spacing, typography } from '../../theme';

export default function CourseDetailsScreen({ route, navigation }: any) {
  const { courseId, courseName } = route.params as { courseId: string; courseName: string };

  const announcements = useQuery({ queryKey: ['announcements', courseId], queryFn: () => announcementsAPI.getByCourse(courseId) });
  const assignments = useQuery({ queryKey: ['assignments', courseId], queryFn: () => assignmentsAPI.getByCourse(courseId) });

  if (announcements.isLoading || assignments.isLoading) return <LoadingState />;
  if (announcements.isError || assignments.isError)
    return <ErrorState message="Could not load course details." onRetry={() => { announcements.refetch(); assignments.refetch(); }} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={styles.title}>{courseName}</Text>

      <Text style={styles.section}>Announcements</Text>
      {!announcements.data?.length && <EmptyState title="No announcements" />}
      {announcements.data?.map((a) => (
        <Card key={a._id} style={{ marginBottom: spacing.sm }}>
          <Text style={styles.itemTitle}>{a.title}</Text>
          <Text style={styles.itemBody}>{a.message}</Text>
        </Card>
      ))}

      <Text style={styles.section}>Assignments</Text>
      {!assignments.data?.length && <EmptyState title="No assignments" />}
      {assignments.data?.map((a) => (
        <Card
          key={a._id}
          style={{ marginBottom: spacing.sm }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.itemTitle}>{a.title}</Text>
            <Text style={styles.dueLabel}>Due {new Date(a.deadline).toLocaleDateString()}</Text>
          </View>
          <Text style={styles.itemBody} onPress={() => navigation.navigate('AssignmentDetails', { assignmentId: a._id, assignment: a })}>
            {a.submissionState === 'submitted' ? 'Submitted — tap to view' : a.submissionState === 'graded' ? 'Graded — tap to view' : 'Tap to submit'}
          </Text>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.lg },
  section: { ...typography.h3, color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm },
  itemTitle: { ...typography.body, fontWeight: '700', color: colors.text },
  itemBody: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  dueLabel: { ...typography.caption, color: colors.warning },
});
