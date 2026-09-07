import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { chatAPI } from '../../api/chat.api';
import { ListItemRow } from '../../components/ListItemRow';
import { PrimaryButton } from '../../components/PrimaryButton';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { colors, spacing, typography } from '../../theme';

export default function ChatListScreen({ navigation }: any) {
  const partners = useQuery({ queryKey: ['chat', 'partners'], queryFn: chatAPI.getPartners });
  const groups = useQuery({ queryKey: ['groups', 'my'], queryFn: chatAPI.getMyGroups });

  if (partners.isLoading || groups.isLoading) return <LoadingState />;
  if (partners.isError || groups.isError) return <ErrorState message="Could not load chats." onRetry={() => { partners.refetch(); groups.refetch(); }} />;

  const partnerList = (partners.data as any[]) ?? [];
  const groupList = groups.data ?? [];

  return (
    <View style={styles.container}>
      <View style={{ padding: spacing.lg, paddingBottom: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={styles.title}>Chat</Text>
        <PrimaryButton title="New group" variant="secondary" onPress={() => navigation.navigate('CreateGroup')} />
      </View>
      <FlatList
        contentContainerStyle={{ padding: spacing.lg }}
        data={[...groupList.map((g) => ({ ...g, __type: 'group' })), ...partnerList.map((p) => ({ ...p, __type: 'user' }))]}
        keyExtractor={(item: any) => `${item.__type}-${item._id || item.userId}`}
        ListEmptyComponent={<EmptyState title="No conversations yet" />}
        renderItem={({ item }: any) => (
          <ListItemRow
            title={item.__type === 'group' ? item.groupName : item.name}
            subtitle={item.__type === 'group' ? 'Group' : item.role}
            onPress={() =>
              item.__type === 'group'
                ? navigation.navigate('GroupChat', { groupId: item._id, groupName: item.groupName })
                : navigation.navigate('Conversation', { userId: item._id || item.userId, name: item.name })
            }
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h1, color: colors.text },
});
