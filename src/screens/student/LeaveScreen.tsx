import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { coursesAPI } from '../../api/courses.api';
import { filesAPI } from '../../api/files.api';
import { leaveAPI } from '../../api/leave.api';
import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { FormField } from '../../components/FormField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { colors, spacing, typography } from '../../theme';

export default function LeaveScreen() {
  const qc = useQueryClient();
  const courses = useQuery({ queryKey: ['courses'], queryFn: coursesAPI.getAll });
  const leaves = useQuery({ queryKey: ['leave'], queryFn: () => leaveAPI.getAll() });

  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pickProof = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: 'image/*', copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.length) return;
    setFileUri(res.assets[0].uri);
    setFileName(res.assets[0].name);
  };

  const apply = async () => {
    const courseId = courses.data?.[0]?._id;
    if (!courseId || !date || !reason) {
      setError('Course, date, and reason are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      let proofImage = '';
      if (fileUri && fileName) {
        const uploaded = await filesAPI.upload(fileUri, fileName, 'image/jpeg');
        proofImage = uploaded.fileUrl;
      }
      await leaveAPI.apply({ courseId, date, reason, proofImage });
      setDate(''); setReason(''); setFileUri(null); setFileName(null);
      qc.invalidateQueries({ queryKey: ['leave'] });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not submit leave request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (courses.isLoading || leaves.isLoading) return <LoadingState />;
  if (courses.isError || leaves.isError) return <ErrorState message="Could not load leave data." onRetry={() => { courses.refetch(); leaves.refetch(); }} />;

  const statusTone = (s: string) => (s === 'approved' ? 'success' : s === 'rejected' ? 'danger' : 'warning');

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg }}
      data={leaves.data ?? []}
      keyExtractor={(l) => l._id}
      ListHeaderComponent={
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={styles.title}>Apply for leave</Text>
          <FormField label="Date (YYYY-MM-DD)" placeholder="2026-09-10" value={date} onChangeText={setDate} />
          <FormField label="Reason" multiline value={reason} onChangeText={setReason} style={{ minHeight: 70, textAlignVertical: 'top' }} />
          <PrimaryButton title={fileName ? `Proof: ${fileName}` : 'Attach proof image'} variant="secondary" onPress={pickProof} style={{ marginBottom: spacing.md }} />
          {error && <Text style={styles.error}>{error}</Text>}
          <PrimaryButton title="Submit request" loading={submitting} onPress={apply} />
          <Text style={styles.section}>My requests</Text>
        </View>
      }
      ListEmptyComponent={<EmptyState title="No leave requests" />}
      renderItem={({ item }) => (
        <Card style={{ marginBottom: spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.itemTitle}>{new Date(item.date).toLocaleDateString()}</Text>
            <Badge label={item.status} tone={statusTone(item.status) as any} />
          </View>
          <Text style={styles.itemBody}>{item.reason}</Text>
        </Card>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.md },
  section: { ...typography.h3, color: colors.text, marginTop: spacing.md },
  itemTitle: { ...typography.body, fontWeight: '700', color: colors.text },
  itemBody: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  error: { color: colors.danger, marginBottom: spacing.sm },
});
