import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { chatAPI } from '../../api/chat.api';
import { LoadingState, ErrorState, EmptyState } from '../../components/StateViews';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, typography } from '../../theme';

// No backend WebSocket support per the audit — refresh on a short interval
// instead of pretending this is real-time.
export default function ConversationScreen({ route }: any) {
  const { userId, name } = route.params as { userId: string; name: string };
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['chat', 'messages', userId],
    queryFn: () => chatAPI.getMessages(userId),
    refetchInterval: 8000,
  });

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await chatAPI.sendMessage(userId, text.trim());
      setText('');
      qc.invalidateQueries({ queryKey: ['chat', 'messages', userId] });
    } finally {
      setSending(false);
    }
  };

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Could not load conversation." onRetry={refetch} />;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.md }}
        data={data ?? []}
        keyExtractor={(m) => m._id}
        ListEmptyComponent={<EmptyState title={`Say hi to ${name}`} />}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.senderId === user?._id ? styles.bubbleMine : styles.bubbleTheirs]}>
            <Text style={item.senderId === user?._id ? styles.bubbleTextMine : styles.bubbleText}>{item.message}</Text>
          </View>
        )}
      />
      <View style={styles.inputRow}>
        <TextInput style={styles.input} placeholder="Message" value={text} onChangeText={setText} />
        <TouchableOpacity style={styles.sendBtn} onPress={send} disabled={sending}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  bubble: { maxWidth: '80%', padding: spacing.sm, borderRadius: 12, marginBottom: spacing.sm },
  bubbleMine: { backgroundColor: colors.primary, alignSelf: 'flex-end' },
  bubbleTheirs: { backgroundColor: colors.surface, alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.border },
  bubbleTextMine: { color: '#fff' },
  bubbleText: { color: colors.text },
  inputRow: { flexDirection: 'row', padding: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: spacing.md, marginRight: spacing.sm },
  sendBtn: { justifyContent: 'center', paddingHorizontal: spacing.md },
  sendText: { color: colors.primary, fontWeight: '700' },
});
