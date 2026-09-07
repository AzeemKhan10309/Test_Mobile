import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterStudentScreen from '../screens/auth/RegisterStudentScreen';
import RegisterTeacherScreen from '../screens/auth/RegisterTeacherScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="RegisterStudent" component={RegisterStudentScreen} options={{ headerShown: true, title: 'Student registration' }} />
      <Stack.Screen name="RegisterTeacher" component={RegisterTeacherScreen} options={{ headerShown: true, title: 'Teacher registration' }} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ headerShown: true, title: 'Reset password' }} />
    </Stack.Navigator>
  );
}
