import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import React from 'react';

import TeacherDashboardScreen from '../screens/teacher/TeacherDashboardScreen';
import TestListScreen from '../screens/teacher/TestListScreen';
import CreateTestScreen from '../screens/teacher/CreateTestScreen';
import TestDetailScreen from '../screens/teacher/TestDetailScreen';
import QuestionEditorScreen from '../screens/teacher/QuestionEditorScreen';
import MonitorExamScreen from '../screens/teacher/MonitorExamScreen';
import SubmissionListScreen from '../screens/teacher/SubmissionListScreen';
import GradingScreen from '../screens/teacher/GradingScreen';
import RetakeRequestsScreen from '../screens/teacher/RetakeRequestsScreen';
import TestAnalyticsScreen from '../screens/teacher/TestAnalyticsScreen';
import CoursesManageScreen from '../screens/teacher/CoursesManageScreen';
import CourseManageDetailScreen from '../screens/teacher/CourseManageDetailScreen';
import CourseStudentsScreen from '../screens/teacher/CourseStudentsScreen';
import AttendanceScreen from '../screens/teacher/AttendanceScreen';
import MarksScreen from '../screens/teacher/MarksScreen';
import AnnouncementsManageScreen from '../screens/teacher/AnnouncementsManageScreen';
import AssignmentsManageScreen from '../screens/teacher/AssignmentsManageScreen';
import AssignmentSubmissionsScreen from '../screens/teacher/AssignmentSubmissionsScreen';
import LeaveApprovalScreen from '../screens/teacher/LeaveApprovalScreen';
import TeacherMoreScreen from '../screens/teacher/MoreScreen';
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

function DashboardStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="TeacherDashboard" component={TeacherDashboardScreen} options={{ title: 'Dashboard' }} />
    </Stack.Navigator>
  );
}

function TestsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="TestList" component={TestListScreen} options={{ title: 'Tests' }} />
      <Stack.Screen name="CreateTest" component={CreateTestScreen} options={{ title: 'New test' }} />
      <Stack.Screen name="TestDetail" component={TestDetailScreen} options={{ title: 'Test' }} />
      <Stack.Screen name="QuestionEditor" component={QuestionEditorScreen} options={{ title: 'Question' }} />
      <Stack.Screen name="MonitorExam" component={MonitorExamScreen} options={{ title: 'Monitor' }} />
      <Stack.Screen name="SubmissionList" component={SubmissionListScreen} options={{ title: 'Submissions' }} />
      <Stack.Screen name="Grading" component={GradingScreen} options={{ title: 'Grade' }} />
      <Stack.Screen name="RetakeRequests" component={RetakeRequestsScreen} options={{ title: 'Retake requests' }} />
      <Stack.Screen name="TestAnalytics" component={TestAnalyticsScreen} options={{ title: 'Analytics' }} />
    </Stack.Navigator>
  );
}

function CoursesStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="CoursesManage" component={CoursesManageScreen} options={{ title: 'Courses' }} />
      <Stack.Screen name="CourseManageDetail" component={CourseManageDetailScreen} options={({ route }: any) => ({ title: route.params?.courseName ?? 'Course' })} />
      <Stack.Screen name="CourseStudents" component={CourseStudentsScreen} options={{ title: 'Students' }} />
      <Stack.Screen name="Attendance" component={AttendanceScreen} options={{ title: 'Attendance' }} />
      <Stack.Screen name="Marks" component={MarksScreen} options={{ title: 'Marks' }} />
      <Stack.Screen name="AnnouncementsManage" component={AnnouncementsManageScreen} options={{ title: 'Announcements' }} />
      <Stack.Screen name="AssignmentsManage" component={AssignmentsManageScreen} options={{ title: 'Assignments' }} />
      <Stack.Screen name="AssignmentSubmissions" component={AssignmentSubmissionsScreen} options={{ title: 'Submissions' }} />
      <Stack.Screen name="LeaveApproval" component={LeaveApprovalScreen} options={{ title: 'Leave requests' }} />
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
      <Stack.Screen name="MoreMenu" component={TeacherMoreScreen} options={{ title: 'More' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="ChatList" component={ChatListScreen} options={{ title: 'Chat' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

export default function TeacherNavigator() {
  return (
<Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { height: 64, paddingTop: 6, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, string> = {
            Dashboard: 'home-outline',
            Tests: 'document-text-outline',
            Courses: 'people-outline',
            Chat: 'chatbubble-outline',
            More: 'grid-outline',
          };
          return <Ionicons name={icons[route.name] as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardStack} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Tests" component={TestsStack} />
    <Tab.Screen name="Courses" component={CoursesStack} options={{ tabBarLabel: 'Students' }} />
      <Tab.Screen name="Chat" component={ChatStack} />
      <Tab.Screen name="More" component={MoreStack} />
    </Tab.Navigator>
  );
}
