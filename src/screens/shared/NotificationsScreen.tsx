import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { notificationsAPI } from '../../api/notifications.api';
import { Badge } from '../../components/Badge';
import { PrimaryButton } from '../../components/PrimaryButton';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { useMarkAllNotificationsRead, useNotifications } from '../../hooks/useNotifications';
import { colors, spacing, typography } from '../../theme';
import { useQueryClient } from '@tanstack/react-query';

export default function NotificationsScreen() {
  const { data, isLoading, isError, refetch } = useNotifications();
  const markAll = useMarkAllNotificationsRead();
  const qc = useQueryClient();

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Could not load notifications." onRetry={refetch} />;

  const markOne = async (id: string) => {
    await notificationsAPI.markRead(id);
    qc.invalidateQueries({ queryKey: ['notifications'] });
  };

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg }}
      data={data?.notifications ?? []}
      keyExtractor={(n) => n._id}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>Notifications {data?.unread ? `(${data.unread})` : ''}</Text>
          <PrimaryButton title="Mark all read" variant="secondary" onPress={() => markAll.mutate()} loading={markAll.isPending} />
        </View>
      }
      ListEmptyComponent={<EmptyState title="You're all caught up" />}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => !item.read && markOne(item._id)} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemBody}>{item.message}</Text>
          </View>
          {!item.read && <Badge label="New" tone="primary" />}
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { marginBottom: spacing.md },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.sm },
  row: { flexDirection: 'row', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.md, marginBottom: spacing.sm, alignItems: 'center' },
  itemTitle: { ...typography.body, fontWeight: '700', color: colors.text },
  itemBody: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
});
