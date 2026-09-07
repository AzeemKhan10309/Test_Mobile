import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { ListItemRow } from '../../components/ListItemRow';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, typography } from '../../theme';

export default function AdminMoreScreen({ navigation }: any) {
  const { logout } = useAuth();
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={styles.title}>More</Text>
      <ListItemRow title="Notifications" onPress={() => navigation.navigate('Notifications')} />
      <ListItemRow title="Chat" onPress={() => navigation.navigate('ChatList')} />
      <ListItemRow title="Profile" onPress={() => navigation.navigate('Profile')} />
      <PrimaryButton title="Log out" variant="danger" onPress={logout} style={{ marginTop: spacing.lg }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.lg },
});
