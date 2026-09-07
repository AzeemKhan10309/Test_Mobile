import * as DocumentPicker from 'expo-document-picker';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { assignmentsAPI } from '../../api/assignments.api';
import { filesAPI } from '../../api/files.api';
import { Card } from '../../components/Card';
import { FormField } from '../../components/FormField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, spacing, typography } from '../../theme';
import { Assignment } from '../../types';

export default function AssignmentDetailScreen({ route, navigation }: any) {
  const { assignment } = route.params as { assignment: Assignment };
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [fileMime, setFileMime] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(assignment.submissionState === 'submitted' || assignment.submissionState === 'graded');

  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.length) return;
    const asset = res.assets[0];
    setFileName(asset.name);
    setFileUri(asset.uri);
    setFileMime(asset.mimeType || 'application/octet-stream');
  };

  const submit = async () => {
    setError(null);
    if (!fileUri && !text) {
      setError('Attach a file or write a text submission.');
      return;
    }
    setSubmitting(true);
    try {
      let fileUrl = '';
      if (fileUri && fileName && fileMime) {
        const uploaded = await filesAPI.upload(fileUri, fileName, fileMime);
        fileUrl = uploaded.fileUrl;
      }
      await assignmentsAPI.submit({ assignmentId: assignment._id, fileUrl, text: text || undefined });
      setDone(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={styles.title}>{assignment.title}</Text>
      <Text style={styles.desc}>{assignment.description}</Text>
      <Text style={styles.due}>Due: {new Date(assignment.deadline).toLocaleString()} · {assignment.totalMarks} marks</Text>

      {done ? (
        <Card style={{ marginTop: spacing.lg }}>
          <Text style={styles.doneText}>Your submission has been recorded.</Text>
        </Card>
      ) : (
        <Card style={{ marginTop: spacing.lg }}>
          <Text style={styles.section}>Submit your work</Text>
          <FormField label="Text answer (optional if attaching a file)" multiline value={text} onChangeText={setText} style={{ minHeight: 80, textAlignVertical: 'top' }} />
          <PrimaryButton title={fileName ? `File: ${fileName}` : 'Attach file'} variant="secondary" onPress={pickFile} style={{ marginBottom: spacing.md }} />
          {error && <Text style={styles.error}>{error}</Text>}
          <PrimaryButton title="Submit assignment" loading={submitting} onPress={submit} />
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h1, color: colors.text },
  desc: { ...typography.body, color: colors.textMuted, marginTop: spacing.sm },
  due: { ...typography.caption, color: colors.warning, marginTop: spacing.sm },
  section: { ...typography.h3, color: colors.text, marginBottom: spacing.sm },
  doneText: { color: colors.success, fontWeight: '600' },
  error: { color: colors.danger, marginBottom: spacing.sm },
});
