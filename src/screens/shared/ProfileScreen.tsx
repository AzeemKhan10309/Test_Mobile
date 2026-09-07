import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { usersAPI } from '../../api/users.api';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Card } from '../../components/Card';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, typography } from '../../theme';

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const saveProfile = async () => {
    setSaving(true);
    setStatus(null);
    try {
      // Only fields the backend accepts per contract: name, darkMode,
      // language (+ student-only phone/area fields elsewhere).
      await usersAPI.updateProfile({ name });
      await refreshUser();
      setStatus('Profile updated.');
    } catch (err: any) {
      setStatus(err?.response?.data?.message || 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={styles.role}>{user?.role?.toUpperCase()}</Text>
        <Text style={styles.identifier}>{user?.email || user?.studentId}</Text>
      </Card>

      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      {status && <Text style={styles.status}>{status}</Text>}
      <PrimaryButton title="Save changes" loading={saving} onPress={saveProfile} style={{ marginBottom: spacing.md }} />
      <PrimaryButton title="Log out" variant="danger" onPress={logout} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, backgroundColor: colors.background, flexGrow: 1 },
  role: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  identifier: { ...typography.h3, color: colors.text, marginTop: spacing.xs },
  label: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.xs },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.md, marginBottom: spacing.lg },
  status: { color: colors.textMuted, marginBottom: spacing.sm },
});
