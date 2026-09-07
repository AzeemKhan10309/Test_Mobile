import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { coursesAPI } from '../../api/courses.api';
import { marksAPI } from '../../api/marks.api';
import { FormField } from '../../components/FormField';
import { ListItemRow } from '../../components/ListItemRow';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ErrorState, LoadingState } from '../../components/StateViews';
import { colors, spacing, typography } from '../../theme';

export default function MarksScreen({ route }: any) {
  const { courseId, courseName } = route.params as { courseId: string; courseName: string };
  const qc = useQueryClient();
  const students = useQuery({ queryKey: ['course', courseId, 'students'], queryFn: () => coursesAPI.getStudents(courseId) });
  const marks = useQuery({ queryKey: ['marks', courseId], queryFn: () => marksAPI.getByCourse(courseId) });

  const [studentId, setStudentId] = useState('');
  const [type, setType] = useState('');
  const [marksObtained, setMarksObtained] = useState('');
  const [totalMarks, setTotalMarks] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (students.isLoading || marks.isLoading) return <LoadingState />;
  if (students.isError || marks.isError) return <ErrorState message="Could not load marks." onRetry={() => { students.refetch(); marks.refetch(); }} />;

  const studentList = (students.data as any[]) ?? [];

  const submit = async () => {
    if (!studentId || !type || !marksObtained || !totalMarks) {
      setError('All fields are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await marksAPI.create({ courseId, studentId, type, marksObtained: Number(marksObtained), totalMarks: Number(totalMarks), date });
      setType(''); setMarksObtained(''); setTotalMarks('');
      qc.invalidateQueries({ queryKey: ['marks', courseId] });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not save marks.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg }}
      data={marks.data ?? []}
      keyExtractor={(m) => m._id}
      ListHeaderComponent={
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={styles.title}>{courseName} marks</Text>
          <Text style={styles.label}>Select student</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
            {studentList.map((s) => (
              <PrimaryButton
                key={s._id}
                title={s.name}
                variant={studentId === s._id ? 'primary' : 'secondary'}
                onPress={() => setStudentId(s._id)}
              />
            ))}
          </View>
          <FormField label="Type (e.g. Quiz, Midterm)" value={type} onChangeText={setType} />
          <FormField label="Marks obtained" keyboardType="numeric" value={marksObtained} onChangeText={setMarksObtained} />
          <FormField label="Total marks" keyboardType="numeric" value={totalMarks} onChangeText={setTotalMarks} />
          <FormField label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
          {error && <Text style={styles.error}>{error}</Text>}
          <PrimaryButton title="Save marks" loading={submitting} onPress={submit} />
          <Text style={styles.section}>Recorded marks</Text>
        </View>
      }
      renderItem={({ item }) => (
        <ListItemRow title={`${item.type} — ${item.marksObtained}/${item.totalMarks}`} subtitle={new Date(item.date).toLocaleDateString()} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.md },
  label: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.xs },
  section: { ...typography.h3, color: colors.text, marginTop: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.sm },
});
