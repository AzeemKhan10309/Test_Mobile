import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { attendanceAPI } from '../../api/attendance.api';
import { coursesAPI } from '../../api/courses.api';
import { FormField } from '../../components/FormField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ErrorState, LoadingState } from '../../components/StateViews';
import { colors, spacing, typography } from '../../theme';

export default function AttendanceScreen({ route }: any) {
  const { courseId, courseName } = route.params as { courseId: string; courseName: string };
  const qc = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [presentMap, setPresentMap] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const students = useQuery({ queryKey: ['course', courseId, 'students'], queryFn: () => coursesAPI.getStudents(courseId) });
  const existing = useQuery({
    queryKey: ['attendance', courseId, date],
    queryFn: () => attendanceAPI.getByDate(courseId, date),
  });

  useEffect(() => {
    if (existing.data && Array.isArray((existing.data as any).attendance)) {
      const map: Record<string, boolean> = {};
      (existing.data as any).attendance.forEach((r: any) => { map[r.studentId] = r.present; });
      setPresentMap(map);
    } else {
      setPresentMap({});
    }
  }, [existing.data, date]);

  if (students.isLoading) return <LoadingState />;
  if (students.isError) return <ErrorState message="Could not load students." onRetry={students.refetch} />;

  const studentList = (students.data as any[]) ?? [];

  const toggle = (studentId: string) => setPresentMap((prev) => ({ ...prev, [studentId]: !prev[studentId] }));

  const save = async () => {
    setSaving(true);
    setStatus(null);
    const attendance = studentList.map((s) => ({ studentId: s._id, present: !!presentMap[s._id] }));
    try {
      if ((existing.data as any)?.attendance) {
        await attendanceAPI.update({ courseId, date, attendance });
      } else {
        await attendanceAPI.mark({ courseId, date, attendance });
      }
      setStatus('Attendance saved.');
      qc.invalidateQueries({ queryKey: ['attendance', courseId, date] });
    } catch (err: any) {
      setStatus(err?.response?.data?.message || 'Could not save attendance.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg }}
      data={studentList}
      keyExtractor={(s: any) => s._id}
      ListHeaderComponent={
        <View style={{ marginBottom: spacing.md }}>
          <Text style={styles.title}>{courseName} attendance</Text>
          <FormField label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
        </View>
      }
      renderItem={({ item }: any) => (
        <TouchableOpacity style={styles.row} onPress={() => toggle(item._id)}>
          <Text style={styles.name}>{item.name}</Text>
          <View style={[styles.toggle, presentMap[item._id] ? styles.present : styles.absent]}>
            <Text style={styles.toggleText}>{presentMap[item._id] ? 'Present' : 'Absent'}</Text>
          </View>
        </TouchableOpacity>
      )}
      ListFooterComponent={
        <View style={{ marginTop: spacing.md }}>
          {status && <Text style={styles.status}>{status}</Text>}
          <PrimaryButton title="Save attendance" loading={saving} onPress={save} />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.md, marginBottom: spacing.sm },
  name: { ...typography.body, color: colors.text, fontWeight: '600' },
  toggle: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 16 },
  present: { backgroundColor: '#D1FAE5' },
  absent: { backgroundColor: '#FEE2E2' },
  toggleText: { fontWeight: '600', fontSize: 12 },
  status: { color: colors.textMuted, marginBottom: spacing.sm },
});
