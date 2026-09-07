import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { coursesAPI } from '../../api/courses.api';
import { reviewsAPI } from '../../api/reviews.api';
import { Card } from '../../components/Card';
import { FormField } from '../../components/FormField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { colors, spacing, typography } from '../../theme';

export default function ReviewsScreen() {
  const qc = useQueryClient();
  const courses = useQuery({ queryKey: ['courses'], queryFn: coursesAPI.getAll });
  const myReviews = useQuery({ queryKey: ['reviews', 'my'], queryFn: reviewsAPI.getMy });

  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const courseId = courses.data?.[0]?._id;
    if (!courseId || !content) {
      setError('Write your review first.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await reviewsAPI.create({ courseId, rating, content });
      setContent('');
      qc.invalidateQueries({ queryKey: ['reviews', 'my'] });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  if (courses.isLoading || myReviews.isLoading) return <LoadingState />;
  if (courses.isError || myReviews.isError) return <ErrorState message="Could not load reviews." onRetry={() => { courses.refetch(); myReviews.refetch(); }} />;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg }}
      data={myReviews.data ?? []}
      keyExtractor={(r) => r._id}
      ListHeaderComponent={
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={styles.title}>Write a review</Text>
          <Text style={styles.label}>Rating</Text>
          <View style={{ flexDirection: 'row', marginBottom: spacing.md }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity key={n} onPress={() => setRating(n)}>
                <Text style={{ fontSize: 28, marginRight: 4 }}>{n <= rating ? '★' : '☆'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <FormField label="Your review" multiline value={content} onChangeText={setContent} style={{ minHeight: 80, textAlignVertical: 'top' }} />
          {error && <Text style={styles.error}>{error}</Text>}
          <PrimaryButton title="Submit review" loading={submitting} onPress={submit} />
          <Text style={styles.section}>My reviews</Text>
        </View>
      }
      ListEmptyComponent={<EmptyState title="You haven't reviewed any courses yet" />}
      renderItem={({ item }) => (
        <Card style={{ marginBottom: spacing.sm }}>
          <Text style={styles.itemTitle}>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</Text>
          <Text style={styles.itemBody}>{item.content}</Text>
        </Card>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.sm },
  label: { ...typography.caption, color: colors.textMuted },
  section: { ...typography.h3, color: colors.text, marginTop: spacing.md },
  itemTitle: { color: colors.warning, fontSize: 16, marginBottom: spacing.xs },
  itemBody: { ...typography.body, color: colors.text },
  error: { color: colors.danger, marginBottom: spacing.sm },
});
