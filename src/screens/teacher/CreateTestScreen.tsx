import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { FormField } from '../../components/FormField';
import { useCreateTest } from '../../hooks/useTests';
import { colors, spacing, typography } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';

export default function CreateTestScreen({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [duration, setDuration] = useState('30');
  const [error, setError] = useState<string | null>(null);
  const createTest = useCreateTest();

  const submit = () => {
    if (!title || !duration) {
      setError('Title and duration are required.');
      return;
    }
    setError(null);
    createTest.mutate(
      { title, description, subject, duration: Number(duration) },
      {
        onSuccess: (test) => navigation.replace('TestDetail', { testId: test._id }),
        onError: (err: any) => setError(err?.response?.data?.message || 'Could not create test.'),
      }
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create test</Text>
      <FormField label="Title" value={title} onChangeText={setTitle} />
      <FormField label="Subject" value={subject} onChangeText={setSubject} />
      <FormField label="Description" multiline value={description} onChangeText={setDescription} style={{ minHeight: 80, textAlignVertical: 'top' }} />
      <FormField label="Duration (minutes)" keyboardType="numeric" value={duration} onChangeText={setDuration} />
      {error && <Text style={styles.error}>{error}</Text>}
      <PrimaryButton title="Create test" loading={createTest.isPending} onPress={submit} />
      <Text style={styles.hint}>You can add questions and publish the test from the test detail screen next.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, backgroundColor: colors.background, flexGrow: 1 },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.lg },
  error: { color: colors.danger, marginBottom: spacing.sm },
  hint: { ...typography.caption, color: colors.textMuted, marginTop: spacing.md, textAlign: 'center' },
});
