import { zodResolver } from '@hookform/resolvers/zod';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { z } from 'zod';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, typography } from '../../theme';

// Login accepts either email OR studentId — the backend disambiguates by
// which field is present, so we require exactly one plus a password.
const schema = z
  .object({
    identifier: z.string().min(1, 'Enter your email or student ID'),
    password: z.string().min(1, 'Password is required'),
  })
  .required();

type FormValues = z.infer<typeof schema>;

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    setSubmitting(true);
    try {
      const isEmail = values.identifier.includes('@');
      await login({
        email: isEmail ? values.identifier : undefined,
        studentId: isEmail ? undefined : values.identifier,
        password: values.password,
      });
      // RootNavigator reacts to auth state automatically.
    } catch (err: any) {
      setServerError(err?.response?.data?.message || 'Unable to sign in. Check your details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Sign in with your email (teacher/admin) or student ID</Text>

      <Controller
        control={control}
        name="identifier"
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={styles.input}
            placeholder="Email or Student ID"
            autoCapitalize="none"
            value={value}
            onChangeText={onChange}
          />
        )}
      />
      {errors.identifier && <Text style={styles.error}>{errors.identifier.message}</Text>}

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <TextInput style={styles.input} placeholder="Password" secureTextEntry value={value} onChangeText={onChange} />
        )}
      />
      {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}

      {serverError && <Text style={styles.error}>{serverError}</Text>}

      <PrimaryButton title="Sign in" loading={submitting} onPress={handleSubmit(onSubmit)} style={{ marginTop: spacing.md }} />

      <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={{ marginTop: spacing.md }}>
        <Text style={styles.link}>Forgot password?</Text>
      </TouchableOpacity>

      <View style={styles.registerRow}>
        <TouchableOpacity onPress={() => navigation.navigate('RegisterStudent')}>
          <Text style={styles.link}>Register as Student</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('RegisterTeacher')}>
          <Text style={styles.link}>Register as Teacher</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, justifyContent: 'center' },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: spacing.lg },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  error: { color: colors.danger, marginBottom: spacing.sm, fontSize: 13 },
  link: { color: colors.primary, fontWeight: '600' },
  registerRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xl },
});
