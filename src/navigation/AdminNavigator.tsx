import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import ManagementHubScreen from '../screens/admin/ManagementHubScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminTeachersScreen from '../screens/admin/AdminTeachersScreen';
import AdminStudentsScreen from '../screens/admin/AdminStudentsScreen';
import AdminCoursesScreen from '../screens/admin/AdminCoursesScreen';
import AdminResultsScreen from '../screens/admin/AdminResultsScreen';
import AdminAnnouncementsScreen from '../screens/admin/AdminAnnouncementsScreen';
import AdminReviewsScreen from '../screens/admin/AdminReviewsScreen';
import AdminMoreScreen from '../screens/admin/MoreScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import ChatListScreen from '../screens/shared/ChatListScreen';
import ConversationScreen from '../screens/shared/ConversationScreen';
import GroupChatScreen from '../screens/shared/GroupChatScreen';
import CreateGroupScreen from '../screens/shared/CreateGroupScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function DashboardStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'Dashboard' }} />
    </Stack.Navigator>
  );
}

function ManagementStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="ManagementHub" component={ManagementHubScreen} options={{ title: 'Management' }} />
      <Stack.Screen name="AdminUsers" component={AdminUsersScreen} options={{ title: 'Users' }} />
      <Stack.Screen name="AdminTeachers" component={AdminTeachersScreen} options={{ title: 'Teachers' }} />
      <Stack.Screen name="AdminStudents" component={AdminStudentsScreen} options={{ title: 'Students' }} />
      <Stack.Screen name="AdminCourses" component={AdminCoursesScreen} options={{ title: 'Courses' }} />
      <Stack.Screen name="AdminResults" component={AdminResultsScreen} options={{ title: 'Results' }} />
      <Stack.Screen name="AdminAnnouncements" component={AdminAnnouncementsScreen} options={{ title: 'Announcements' }} />
      <Stack.Screen name="AdminReviews" component={AdminReviewsScreen} options={{ title: 'Reviews' }} />
    </Stack.Navigator>
  );
}

function MoreStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MoreMenu" component={AdminMoreScreen} options={{ title: 'More' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="ChatList" component={ChatListScreen} options={{ title: 'Chat' }} />
      <Stack.Screen name="Conversation" component={ConversationScreen} options={({ route }: any) => ({ title: route.params?.name ?? 'Chat' })} />
      <Stack.Screen name="GroupChat" component={GroupChatScreen} options={({ route }: any) => ({ title: route.params?.groupName ?? 'Group' })} />
      <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ title: 'New group' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

export default function AdminNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary }}>
      <Tab.Screen name="Dashboard" component={DashboardStack} />
      <Tab.Screen name="Management" component={ManagementStack} />
      <Tab.Screen name="More" component={MoreStack} />
    </Tab.Navigator>
  );
}
