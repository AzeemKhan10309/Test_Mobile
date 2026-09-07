import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import StudentDashboardScreen from '../screens/student/StudentDashboardScreen';
import JoinExamScreen from '../screens/student/JoinExamScreen';
import ExamScreen from '../screens/student/ExamScreen';
import ExamResultScreen from '../screens/student/ExamResultScreen';
import CoursesScreen from '../screens/student/CoursesScreen';
import CourseDetailsScreen from '../screens/student/CourseDetailsScreen';
import AssignmentDetailScreen from '../screens/student/AssignmentDetailScreen';
import ResultsScreen from '../screens/student/ResultsScreen';
import AnnouncementsScreen from '../screens/student/AnnouncementsScreen';
import LeaveScreen from '../screens/student/LeaveScreen';
import ReviewsScreen from '../screens/student/ReviewsScreen';
import StudentMoreScreen from '../screens/student/MoreScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import SubscriptionScreen from '../screens/shared/SubscriptionScreen';
import ChatListScreen from '../screens/shared/ChatListScreen';
import ConversationScreen from '../screens/shared/ConversationScreen';
import GroupChatScreen from '../screens/shared/GroupChatScreen';
import CreateGroupScreen from '../screens/shared/CreateGroupScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="StudentDashboard" component={StudentDashboardScreen} options={{ title: 'Dashboard' }} />
      <Stack.Screen name="JoinExam" component={JoinExamScreen} options={{ title: 'Join test' }} />
      <Stack.Screen name="Exam" component={ExamScreen} options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="ExamResult" component={ExamResultScreen} options={{ title: 'Result' }} />
    </Stack.Navigator>
  );
}

function CoursesStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Courses" component={CoursesScreen} />
      <Stack.Screen name="CourseDetails" component={CourseDetailsScreen} options={({ route }: any) => ({ title: route.params?.courseName ?? 'Course' })} />
      <Stack.Screen name="AssignmentDetails" component={AssignmentDetailScreen} options={{ title: 'Assignment' }} />
    </Stack.Navigator>
  );
}

function ChatStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="ChatList" component={ChatListScreen} options={{ title: 'Chat' }} />
      <Stack.Screen name="Conversation" component={ConversationScreen} options={({ route }: any) => ({ title: route.params?.name ?? 'Chat' })} />
      <Stack.Screen name="GroupChat" component={GroupChatScreen} options={({ route }: any) => ({ title: route.params?.groupName ?? 'Group' })} />
      <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ title: 'New group' }} />
    </Stack.Navigator>
  );
}

function MoreStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MoreMenu" component={StudentMoreScreen} options={{ title: 'More' }} />
      <Stack.Screen name="Results" component={ResultsScreen} />
      <Stack.Screen name="Announcements" component={AnnouncementsScreen} />
      <Stack.Screen name="Leave" component={LeaveScreen} options={{ title: 'Leave requests' }} />
      <Stack.Screen name="Reviews" component={ReviewsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

export default function StudentNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary }}>
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="CoursesTab" component={CoursesStack} options={{ title: 'Courses' }} />
      <Tab.Screen name="ChatTab" component={ChatStack} options={{ title: 'Chat' }} />
      <Tab.Screen name="MoreTab" component={MoreStack} options={{ title: 'More' }} />
    </Tab.Navigator>
  );
}
