import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { adminAPI } from '../../api/admin.api';
import { FormField } from '../../components/FormField';
import { ListItemRow } from '../../components/ListItemRow';
import { PrimaryButton } from '../../components/PrimaryButton';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { colors, spacing, typography } from '../../theme';

export default function AdminTeachersScreen() {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['admin', 'teachers'], queryFn: adminAPI.getTeachers });

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const create = async () => {
    if (!name || !email || !password) {
      setError('All fields are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await adminAPI.createTeacher({ name, email, password });
      setName(''); setEmail(''); setPassword('');
      qc.invalidateQueries({ queryKey: ['admin', 'teachers'] });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not create teacher.');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = (id: string) => {
    Alert.alert('Delete teacher?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await adminAPI.deleteTeacher(id); qc.invalidateQueries({ queryKey: ['admin', 'teachers'] }); } },
    ]);
  };

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Could not load teachers." onRetry={refetch} />;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg }}
      data={data ?? []}
      keyExtractor={(t) => t._id}
      ListHeaderComponent={
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={styles.title}>Teachers</Text>
          <FormField label="Name" value={name} onChangeText={setName} />
          <FormField label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <FormField label="Password" secureTextEntry value={password} onChangeText={setPassword} />
          {error && <Text style={styles.error}>{error}</Text>}
          <PrimaryButton title="Add teacher" loading={submitting} onPress={create} />
        </View>
      }
      ListEmptyComponent={<EmptyState title="No teachers yet" />}
      renderItem={({ item }) => (
        <ListItemRow
          title={item.name}
          subtitle={item.email}
          right={<Text style={styles.deleteLink} onPress={() => remove(item._id)}>Delete</Text>}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.sm },
  deleteLink: { color: colors.danger, fontSize: 12, fontWeight: '600' },
});
