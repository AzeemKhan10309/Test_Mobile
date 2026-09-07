import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { chatAPI } from '../../api/chat.api';
import { FormField } from '../../components/FormField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, spacing, typography } from '../../theme';

export default function CreateGroupScreen({ navigation }: any) {
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    if (!groupName) {
      setError('Group name is required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const group = await chatAPI.createGroup({ groupName, description, joinMode: 'invite' });
      navigation.replace('GroupChat', { groupId: group._id, groupName: group.groupName });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not create group.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>New group</Text>
      <FormField label="Group name" value={groupName} onChangeText={setGroupName} />
      <FormField label="Description (optional)" value={description} onChangeText={setDescription} />
      {error && <Text style={styles.error}>{error}</Text>}
      <PrimaryButton title="Create group" loading={submitting} onPress={create} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.background },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.lg },
  error: { color: colors.danger, marginBottom: spacing.sm },
});
