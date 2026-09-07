import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { ListItemRow } from '../../components/ListItemRow';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, typography } from '../../theme';

export default function StudentMoreScreen({ navigation }: any) {
  const { logout } = useAuth();
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={styles.title}>More</Text>
      <ListItemRow title="Results" onPress={() => navigation.navigate('Results')} />
      <ListItemRow title="Announcements" onPress={() => navigation.navigate('Announcements')} />
      <ListItemRow title="Leave requests" onPress={() => navigation.navigate('Leave')} />
      <ListItemRow title="Reviews" onPress={() => navigation.navigate('Reviews')} />
      <ListItemRow title="Notifications" onPress={() => navigation.navigate('Notifications')} />
      <ListItemRow title="Subscription" onPress={() => navigation.navigate('Subscription')} />
      <ListItemRow title="Profile" onPress={() => navigation.navigate('Profile')} />
      <PrimaryButton title="Log out" variant="danger" onPress={logout} style={{ marginTop: spacing.lg }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.lg },
});
