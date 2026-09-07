import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, typography } from '../../theme';

export default function RegisterTeacherScreen({ navigation }: any) {
  const { registerTeacher } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!name || !email || !password) {
      setError('All fields are required.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await registerTeacher({ name, email, password });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Teacher registration</Text>
      <TextInput style={styles.input} placeholder="Full name" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
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
