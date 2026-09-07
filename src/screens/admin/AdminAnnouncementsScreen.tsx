import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { adminAPI } from '../../api/admin.api';
import { FormField } from '../../components/FormField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, spacing, typography } from '../../theme';

const TARGETS = ['all_students', 'all_teachers', 'course', 'teacher'] as const;

export default function AdminAnnouncementsScreen() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState<(typeof TARGETS)[number]>('all_students');
  const [courseId, setCourseId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!title || !message) {
      setStatus('Title and message are required.');
      return;
    }
    setSubmitting(true);
    setStatus(null);
    try {
      await adminAPI.createAnnouncement({
        title, message, targetType,
        courseId: targetType === 'course' ? courseId : undefined,
        teacherId: targetType === 'teacher' ? teacherId : undefined,
      });
      setTitle(''); setMessage('');
      setStatus('Announcement sent.');
    } catch (err: any) {
      setStatus(err?.response?.data?.message || 'Could not send announcement.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Platform announcement</Text>
      <Text style={styles.label}>Audience</Text>
      <View style={styles.row}>
        {TARGETS.map((t) => (
          <TouchableOpacity key={t} style={[styles.chip, targetType === t && styles.chipActive]} onPress={() => setTargetType(t)}>
            <Text style={targetType === t ? styles.chipTextActive : styles.chipText}>{t.replace('_', ' ')}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {targetType === 'course' && <FormField label="Course ID" value={courseId} onChangeText={setCourseId} />}
      {targetType === 'teacher' && <FormField label="Teacher ID" value={teacherId} onChangeText={setTeacherId} />}
      <FormField label="Title" value={title} onChangeText={setTitle} />
      <FormField label="Message" multiline value={message} onChangeText={setMessage} style={{ minHeight: 90, textAlignVertical: 'top' }} />
      {status && <Text style={styles.status}>{status}</Text>}
      <PrimaryButton title="Send announcement" loading={submitting} onPress={submit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, backgroundColor: colors.background, flexGrow: 1 },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.lg },
  label: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.xs },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 13 },
  chipTextActive: { color: '#fff', fontSize: 13, fontWeight: '600' },
  status: { color: colors.textMuted, marginBottom: spacing.sm },
});
