import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { adminAPI } from '../../api/admin.api';
import { Badge } from '../../components/Badge';
import { ListItemRow } from '../../components/ListItemRow';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { colors, spacing, typography } from '../../theme';

const ROLES = ['all', 'student', 'teacher', 'admin', 'superadmin'] as const;

export default function AdminUsersScreen() {
  const qc = useQueryClient();
  const [role, setRole] = useState<(typeof ROLES)[number]>('all');
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'users', role],
    queryFn: () => adminAPI.getUsers(role === 'all' ? undefined : { role }),
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Could not load users." onRetry={refetch} />;

  const toggleActive = (id: string) => {
    Alert.alert('Toggle account status?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: async () => { await adminAPI.toggleUserActive(id); qc.invalidateQueries({ queryKey: ['admin', 'users'] }); } },
    ]);
  };

  const remove = (id: string) => {
    Alert.alert('Delete user?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await adminAPI.deleteUser(id); qc.invalidateQueries({ queryKey: ['admin', 'users'] }); } },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        {ROLES.map((r) => (
          <TouchableOpacity key={r} style={[styles.chip, role === r && styles.chipActive]} onPress={() => setRole(r)}>
            <Text style={role === r ? styles.chipTextActive : styles.chipText}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}
        data={data?.items ?? []}
        keyExtractor={(u) => u._id}
        ListEmptyComponent={<EmptyState title="No users found" />}
        renderItem={({ item }) => (
          <ListItemRow
            title={item.name}
            subtitle={item.email || item.studentId}
            right={
              <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
                <Badge label={item.role} tone="primary" />
                <Text style={styles.actionLink} onPress={() => toggleActive(item._id)}>Toggle</Text>
                <Text style={styles.deleteLink} onPress={() => remove(item._id)}>Delete</Text>
              </View>
            }
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, padding: spacing.lg },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 13 },
  chipTextActive: { color: '#fff', fontSize: 13, fontWeight: '600' },
  actionLink: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  deleteLink: { color: colors.danger, fontSize: 12, fontWeight: '600' },
});
