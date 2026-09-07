import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, typography } from '../../theme';

export default function RegisterStudentScreen({ navigation }: any) {
  const { registerStudent } = useAuth();
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [personalPhone, setPersonalPhone] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [area, setArea] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!name || !studentId || !password) {
      setError('Name, Student ID, and password are required.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await registerStudent({ name, studentId, password, personalPhone, guardianPhone, area });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Student registration</Text>
      <TextInput style={styles.input} placeholder="Full name" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Student ID" autoCapitalize="none" value={studentId} onChangeText={setStudentId} />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <TextInput style={styles.input} placeholder="Personal phone (optional)" keyboardType="phone-pad" value={personalPhone} onChangeText={setPersonalPhone} />
      <TextInput style={styles.input} placeholder="Guardian phone (optional)" keyboardType="phone-pad" value={guardianPhone} onChangeText={setGuardianPhone} />
      <TextInput style={styles.input} placeholder="Area (optional)" value={area} onChangeText={setArea} />
      {error && <Text style={styles.error}>{error}</Text>}
      <PrimaryButton title="Create account" loading={submitting} onPress={onSubmit} style={{ marginTop: spacing.md }} />
      <View style={{ marginTop: spacing.md, alignItems: 'center' }}>
        <Text style={styles.link} onPress={() => navigation.navigate('Login')}>Already have an account? Sign in</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, backgroundColor: colors.background, flexGrow: 1, justifyContent: 'center' },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.lg },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.md, marginBottom: spacing.sm },
  error: { color: colors.danger, marginBottom: spacing.sm },
  link: { color: colors.primary, fontWeight: '600' },
});
