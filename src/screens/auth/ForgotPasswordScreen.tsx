import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { authAPI } from '../../api/auth.api';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, spacing, typography } from '../../theme';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isEmail = identifier.includes('@');

  const requestCode = async () => {
    setSubmitting(true);
    setStatus(null);
    try {
      await authAPI.forgotPassword({ email: isEmail ? identifier : undefined, studentId: isEmail ? undefined : identifier });
      setStep('reset');
      setStatus('If that account exists, a reset code has been sent.');
    } catch (err: any) {
      setStatus(err?.response?.data?.message || 'Could not send reset code.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetPassword = async () => {
    setSubmitting(true);
    setStatus(null);
    try {
      await authAPI.resetPassword({
        email: isEmail ? identifier : undefined,
        studentId: isEmail ? undefined : identifier,
        code,
        newPassword,
      });
      setStatus('Password reset. You can now sign in.');
    } catch (err: any) {
      setStatus(err?.response?.data?.message || 'Could not reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset password</Text>
      <TextInput style={styles.input} placeholder="Email or Student ID" autoCapitalize="none" value={identifier} onChangeText={setIdentifier} editable={step === 'request'} />
      {step === 'reset' && (
        <>
          <TextInput style={styles.input} placeholder="Reset code" value={code} onChangeText={setCode} />
          <TextInput style={styles.input} placeholder="New password" secureTextEntry value={newPassword} onChangeText={setNewPassword} />
        </>
      )}
      {status && <Text style={styles.status}>{status}</Text>}
      {step === 'request' ? (
        <PrimaryButton title="Send reset code" loading={submitting} onPress={requestCode} />
      ) : (
        <PrimaryButton title="Reset password" loading={submitting} onPress={resetPassword} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.background, justifyContent: 'center' },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.lg },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.md, marginBottom: spacing.sm },
  status: { color: colors.textMuted, marginBottom: spacing.sm },
});
