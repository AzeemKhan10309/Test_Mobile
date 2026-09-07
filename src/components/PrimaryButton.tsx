import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { colors, radius, spacing } from '../theme';

interface Props extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export function PrimaryButton({ title, loading, variant = 'primary', style, disabled, ...rest }: Props) {
  const bg = variant === 'danger' ? colors.danger : variant === 'secondary' ? colors.surface : colors.primary;
  const textColor = variant === 'secondary' ? colors.primary : '#fff';
  return (
    <TouchableOpacity
      disabled={disabled || loading}
      style={[
        styles.btn,
        { backgroundColor: bg, borderWidth: variant === 'secondary' ? 1 : 0, borderColor: colors.primary },
        (disabled || loading) && { opacity: 0.6 },
        style,
      ]}
      {...rest}
    >
      {loading ? <ActivityIndicator color={textColor} /> : <Text style={[styles.text, { color: textColor }]}>{title}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: radius.sm, paddingVertical: spacing.md, alignItems: 'center', justifyContent: 'center' },
  text: { fontWeight: '600', fontSize: 15 },
});
