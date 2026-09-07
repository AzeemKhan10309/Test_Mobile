import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { submissionsAPI } from '../../api/submissions.api';
import { testsAPI } from '../../api/tests.api';
import { colors, spacing, typography } from '../../theme';

export default function JoinExamScreen({ navigation }: any) {
  const [shareLink, setShareLink] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onJoin = async () => {
    if (!shareLink) return;
    setLoading(true);
    setError(null);
    try {
      const test = await testsAPI.joinByShareLink(shareLink.trim());

      // If the student already has an in-progress attempt, resume it
      // instead of starting a second one.
      const existing = await submissionsAPI.getStatusForTest(test._id).catch(() => null);
      const submission = existing?.status === 'in_progress' ? existing : await submissionsAPI.start({ testId: test._id });

      navigation.navigate('Exam', { submissionId: submission._id, testId: test._id });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not join this test. Check the link/code and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Join a test</Text>
      <Text style={styles.subtitle}>Enter the share link or code your teacher gave you.</Text>
      <TextInput style={styles.input} placeholder="Share link / code" autoCapitalize="none" value={shareLink} onChangeText={setShareLink} />
      {error && <Text style={styles.error}>{error}</Text>}
      <PrimaryButton title="Join Test" loading={loading} onPress={onJoin} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.background, justifyContent: 'center' },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: spacing.lg },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.md, marginBottom: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.sm },
});
