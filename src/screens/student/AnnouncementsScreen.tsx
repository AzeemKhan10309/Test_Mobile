import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { announcementsAPI } from '../../api/announcements.api';
import { coursesAPI } from '../../api/courses.api';
import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { colors, spacing, typography } from '../../theme';

export default function AnnouncementsScreen() {
  const qc = useQueryClient();
  const courses = useQuery({ queryKey: ['courses'], queryFn: coursesAPI.getAll });
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const courseId = selectedCourse ?? courses.data?.[0]?._id;

  const announcements = useQuery({
    queryKey: ['announcements', courseId],
    queryFn: () => announcementsAPI.getByCourse(courseId as string),
    enabled: !!courseId,
  });

  if (courses.isLoading) return <LoadingState />;
  if (courses.isError) return <ErrorState message="Could not load courses." onRetry={courses.refetch} />;
  if (!courses.data?.length) return <EmptyState title="Join a course to see announcements" />;

  const markRead = async (id: string) => {
    try {
      await announcementsAPI.markRead(id);
      qc.invalidateQueries({ queryKey: ['announcements', courseId] });
    } catch {
      // non-critical
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={courses.data}
        keyExtractor={(c) => c._id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.chip, (courseId === item._id) && styles.chipActive]}
            onPress={() => setSelectedCourse(item._id)}
          >
            <Text style={courseId === item._id ? styles.chipTextActive : styles.chipText}>{item.courseName}</Text>
          </TouchableOpacity>
        )}
      />
      {announcements.isLoading ? (
        <LoadingState />
      ) : announcements.isError ? (
        <ErrorState message="Could not load announcements." onRetry={announcements.refetch} />
      ) : (
        <FlatList
          contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}
          data={announcements.data ?? []}
          keyExtractor={(a) => a._id}
          ListEmptyComponent={<EmptyState title="No announcements" />}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => !item.read && markRead(item._id)}>
              <Card style={{ marginBottom: spacing.sm }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  {!item.read && <Badge label="New" tone="primary" />}
                </View>
                <Text style={styles.itemBody}>{item.message}</Text>
                <Text style={styles.meta}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              </Card>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  itemTitle: { ...typography.body, fontWeight: '700', color: colors.text, flex: 1 },
  itemBody: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
});
