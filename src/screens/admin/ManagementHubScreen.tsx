import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { ListItemRow } from '../../components/ListItemRow';
import { colors, spacing, typography } from '../../theme';

export default function ManagementHubScreen({ navigation }: any) {
  const items = [
    { title: 'Users', subtitle: 'All accounts across roles', screen: 'AdminUsers' },
    { title: 'Teachers', subtitle: 'Manage teacher accounts', screen: 'AdminTeachers' },
    { title: 'Students', subtitle: 'Manage student accounts, bulk import', screen: 'AdminStudents' },
    { title: 'Courses', subtitle: 'Reassign teachers, delete courses', screen: 'AdminCourses' },
    { title: 'Results', subtitle: 'Platform-wide results', screen: 'AdminResults' },
    { title: 'Announcements', subtitle: 'Broadcast to roles/courses/teachers', screen: 'AdminAnnouncements' },
    { title: 'Reviews', subtitle: 'Moderate student reviews', screen: 'AdminReviews' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={styles.title}>Management</Text>
      {items.map((i) => (
        <ListItemRow key={i.screen} title={i.title} subtitle={i.subtitle} onPress={() => navigation.navigate(i.screen)} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.lg },
});
