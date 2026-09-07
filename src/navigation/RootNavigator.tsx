import { NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { LoadingState } from '../components/StateViews';
import { useAuth } from '../contexts/AuthContext';
import AdminNavigator from './AdminNavigator';
import AuthNavigator from './AuthNavigator';
import StudentNavigator from './StudentNavigator';
import TeacherNavigator from './TeacherNavigator';

/**
 * Role-based routing lives here AND is re-checked inside each screen's data
 * fetching (server enforces real authorization) — hiding a tab is a UX nicety,
 * not the security boundary.
 */
export default function RootNavigator() {
  const { isLoading, isAuthenticated, user } = useAuth();

  if (isLoading) return <LoadingState label="Restoring your session…" />;

  return (
    <NavigationContainer>
      {!isAuthenticated && <AuthNavigator />}
      {isAuthenticated && user?.role === 'student' && <StudentNavigator />}
      {isAuthenticated && user?.role === 'teacher' && <TeacherNavigator />}
      {isAuthenticated && (user?.role === 'admin' || user?.role === 'superadmin') && <AdminNavigator />}
    </NavigationContainer>
  );
}
