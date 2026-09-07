import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { questionsAPI } from '../../api/questions.api';
import { FormField } from '../../components/FormField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, spacing, typography } from '../../theme';
import { Question, QuestionType } from '../../types';

const TYPES: QuestionType[] = ['mcq', 'true_false', 'short_answer', 'long_answer'];

export default function QuestionEditorScreen({ route, navigation }: any) {
  const { testId, question } = route.params as { testId: string; question?: Question };
  const isEdit = !!question;

  const [questionText, setQuestionText] = useState(question?.questionText ?? '');
  const [type, setType] = useState<QuestionType>(question?.type ?? 'mcq');
  const [options, setOptions] = useState<string[]>(question?.options ?? ['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState((question?.correctAnswer as string) ?? '');
  const [marks, setMarks] = useState(String(question?.marks ?? 1));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setOption = (i: number, val: string) => {
    const next = [...options];
    next[i] = val;
    setOptions(next);
  };

  const submit = async () => {
    if (!questionText || !marks) {
      setError('Question text and marks are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        questionText,
        type,
        options: type === 'mcq' ? options.filter(Boolean) : undefined,
        correctAnswer: correctAnswer || undefined,
        marks: Number(marks),
      };
      if (isEdit) {
        await questionsAPI.update(question!._id, payload);
      } else {
        await questionsAPI.create(testId, payload);
      }
      navigation.goBack();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not save question.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{isEdit ? 'Edit question' : 'New question'}</Text>

      <Text style={styles.label}>Question type</Text>
      <View style={styles.typeRow}>
        {TYPES.map((t) => (
          <TouchableOpacity key={t} style={[styles.typeChip, type === t && styles.typeChipActive]} onPress={() => setType(t)}>
            <Text style={type === t ? styles.typeTextActive : styles.typeText}>{t.replace('_', ' ')}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FormField label="Question text" multiline value={questionText} onChangeText={setQuestionText} style={{ minHeight: 70, textAlignVertical: 'top' }} />

      {type === 'mcq' && options.map((opt, i) => (
        <FormField key={i} label={`Option ${i + 1}`} value={opt} onChangeText={(v) => setOption(i, v)} />
      ))}

      {(type === 'mcq' || type === 'true_false') && (
        <FormField label="Correct answer" value={correctAnswer} onChangeText={setCorrectAnswer} placeholder={type === 'true_false' ? 'True or False' : 'Must match one option exactly'} />
      )}

      <FormField label="Marks" keyboardType="numeric" value={marks} onChangeText={setMarks} />

      {error && <Text style={styles.error}>{error}</Text>}
      <PrimaryButton title={isEdit ? 'Save changes' : 'Add question'} loading={submitting} onPress={submit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, backgroundColor: colors.background, flexGrow: 1 },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.md },
  label: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.xs },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  typeChip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeText: { color: colors.text, fontSize: 13 },
  typeTextActive: { color: '#fff', fontSize: 13, fontWeight: '600' },
  error: { color: colors.danger, marginBottom: spacing.sm },
});
