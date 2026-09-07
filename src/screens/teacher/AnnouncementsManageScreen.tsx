import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { announcementsAPI } from '../../api/announcements.api';
import { Card } from '../../components/Card';
import { FormField } from '../../components/FormField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { colors, spacing, typography } from '../../theme';

export default function AnnouncementsManageScreen({ route }: any) {
  const { courseId, courseName } = route.params as { courseId: string; courseName: string };
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['announcements', courseId], queryFn: () => announcementsAPI.getByCourse(courseId) });

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const create = async () => {
    if (!title || !message) {
      setError('Title and message are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await announcementsAPI.create({ title, message, courseId });
      setTitle(''); setMessage('');
      qc.invalidateQueries({ queryKey: ['announcements', courseId] });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not post announcement.');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = (id: string) => {
    Alert.alert('Delete announcement?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await announcementsAPI.delete(id); qc.invalidateQueries({ queryKey: ['announcements', courseId] }); } },
    ]);
  };

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Could not load announcements." onRetry={refetch} />;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg }}
      data={data ?? []}
      keyExtractor={(a) => a._id}
      ListHeaderComponent={
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={styles.title}>{courseName} announcements</Text>
          <FormField label="Title" value={title} onChangeText={setTitle} />
          <FormField label="Message" multiline value={message} onChangeText={setMessage} style={{ minHeight: 70, textAlignVertical: 'top' }} />
          {error && <Text style={styles.error}>{error}</Text>}
          <PrimaryButton title="Post announcement" loading={submitting} onPress={create} />
        </View>
      }
      ListEmptyComponent={<EmptyState title="No announcements yet" />}
      renderItem={({ item }) => (
        <Card style={{ marginBottom: spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.deleteLink} onPress={() => remove(item._id)}>Delete</Text>
          </View>
          <Text style={styles.itemBody}>{item.message}</Text>
        </Card>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.md },
  itemTitle: { ...typography.body, fontWeight: '700', color: colors.text },
  itemBody: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  deleteLink: { color: colors.danger, fontSize: 12, fontWeight: '600' },
  error: { color: colors.danger, marginBottom: spacing.sm },
});
