import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

const TONES: Record<string, { bg: string; fg: string }> = {
  neutral: { bg: '#F3F4F6', fg: colors.textMuted },
  success: { bg: '#D1FAE5', fg: colors.success },
  warning: { bg: '#FEF3C7', fg: colors.warning },
  danger: { bg: '#FEE2E2', fg: colors.danger },
  primary: { bg: '#E0E7FF', fg: colors.primaryDark },
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: keyof typeof TONES }) {
  const t = TONES[tone] ?? TONES.neutral;
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.text, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm, alignSelf: 'flex-start' },
  text: { fontSize: 12, fontWeight: '600' },
});
