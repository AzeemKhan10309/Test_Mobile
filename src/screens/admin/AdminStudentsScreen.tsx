import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import React, { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { adminAPI } from '../../api/admin.api';
import { ListItemRow } from '../../components/ListItemRow';
import { PrimaryButton } from '../../components/PrimaryButton';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { colors, spacing, typography } from '../../theme';

export default function AdminStudentsScreen() {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['admin', 'students'], queryFn: adminAPI.getStudents });
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const bulkImport = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.length) return;
    const asset = res.assets[0];
    setImporting(true);
    setStatus(null);
    try {
      const summary: any = await adminAPI.bulkAddStudentsFile(asset.uri, asset.name, asset.mimeType || 'text/csv');
      setStatus(`Import complete: ${summary?.imported ?? '—'} added, ${summary?.failed ?? 0} failed.`);
      qc.invalidateQueries({ queryKey: ['admin', 'students'] });
    } catch (err: any) {
      setStatus(err?.response?.data?.message || 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  const remove = (id: string) => {
    Alert.alert('Delete student?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await adminAPI.bulkDeleteStudents([id]);
          qc.invalidateQueries({ queryKey: ['admin', 'students'] });
        },
      },
    ]);
  };

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Could not load students." onRetry={refetch} />;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg }}
      data={data ?? []}
      keyExtractor={(s) => s._id}
      ListHeaderComponent={
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={styles.title}>Students</Text>
          <PrimaryButton title="Bulk import (CSV/Excel)" variant="secondary" loading={importing} onPress={bulkImport} style={{ marginBottom: spacing.sm }} />
          {status && <Text style={styles.status}>{status}</Text>}
        </View>
      }
      ListEmptyComponent={<EmptyState title="No students yet" />}
      renderItem={({ item }) => (
        <ListItemRow
          title={item.name}
          subtitle={item.studentId}
          right={<Text style={styles.deleteLink} onPress={() => remove(item._id)}>Delete</Text>}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.md },
  status: { color: colors.textMuted },
  deleteLink: { color: colors.danger, fontSize: 12, fontWeight: '600' },
});
