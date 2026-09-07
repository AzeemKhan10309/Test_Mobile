import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ListItemRow } from '../../components/ListItemRow';
import { colors, spacing, typography } from '../../theme';

export default function CourseManageDetailScreen({ route, navigation }: any) {
  const { courseId, courseName } = route.params as { courseId: string; courseName: string };

  const actions = [
    { title: 'Students', subtitle: 'View enrolled students', screen: 'CourseStudents' },
    { title: 'Attendance', subtitle: 'Mark and review attendance', screen: 'Attendance' },
    { title: 'Marks', subtitle: 'Record and report marks', screen: 'Marks' },
    { title: 'Announcements', subtitle: 'Create and manage announcements', screen: 'AnnouncementsManage' },
    { title: 'Assignments', subtitle: 'Create assignments, grade submissions', screen: 'AssignmentsManage' },
    { title: 'Leave requests', subtitle: 'Approve or reject leave', screen: 'LeaveApproval' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={styles.title}>{courseName}</Text>
      {actions.map((a) => (
        <ListItemRow key={a.screen} title={a.title} subtitle={a.subtitle} onPress={() => navigation.navigate(a.screen, { courseId, courseName })} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.lg },
});
