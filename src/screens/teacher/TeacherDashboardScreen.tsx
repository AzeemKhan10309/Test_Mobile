import { useQuery } from '@tanstack/react-query';
import React, { useMemo } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { analyticsAPI } from '../../api/analytics.api';
import { notificationsAPI } from '../../api/notifications.api';
import { Badge } from '../../components/Badge';
import { useAuth } from '../../contexts/AuthContext';
import { useTests } from '../../hooks/useTests';
import { colors, radius, spacing, typography } from '../../theme';
import { Notification, Test } from '../../types';

type DashboardStats = Record<string, number | undefined>;

export default function TeacherDashboardScreen({ navigation }: any) {
  const { user } = useAuth();
const dashboard = useQuery({ queryKey: ['analytics', 'dashboard'], queryFn: analyticsAPI.dashboard });
  const tests = useTests({ page: 1, limit: 4 });
  const notifications = useQuery({ queryKey: ['notifications'], queryFn: notificationsAPI.getAll });

  const firstName = user?.name?.trim().split(/\s+/)[0] || 'Teacher';
  const stats = (dashboard.data ?? {}) as DashboardStats;
  const recentTests = (tests.data?.items ?? []).slice(0, 3);
  const unread = notifications.data?.unread ?? 0;
  const latestAlert = useMemo(
    () => (notifications.data?.notifications ?? []).find((item) => !item.read),
    [notifications.data?.notifications],
  );

  const refresh = () => {
    void Promise.all([dashboard.refetch(), tests.refetch(), notifications.refetch()]);
  };
  const refreshing = dashboard.isRefetching || tests.isRefetching || notifications.isRefetching;
  return (
<View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}><Text style={styles.brandLetter}>B</Text></View>
            <Text style={styles.brandName}>BanoQabil</Text>
          </View>
          <TouchableOpacity
            accessibilityLabel={unread ? `${unread} unread notifications` : 'Notifications'}
            accessibilityRole="button"
            style={styles.iconButton}
            onPress={() => navigation.navigate('More', { screen: 'Notifications' })}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.darkText} />
            {unread > 0 ? <View style={styles.notificationDot}><Text style={styles.notificationCount}>{unread > 9 ? '9+' : unread}</Text></View> : null}
          </TouchableOpacity>
        </View>

        <View style={styles.welcomeRow}>
          <View style={styles.welcomeCopy}>
            <Text style={styles.eyebrow}>TEACHER SPACE</Text>
            <Text style={styles.greeting}>Welcome back, {firstName}</Text>
            <Text style={styles.context}>Here’s a focused view of your teaching day.</Text>
          </View>
          <TouchableOpacity
            accessibilityLabel="Open profile"
            accessibilityRole="button"
            style={styles.avatar}
            onPress={() => navigation.navigate('More', { screen: 'Profile' })}
          >
            <Text style={styles.avatarText}>{firstName.charAt(0).toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.createButton} accessibilityRole="button" onPress={() => navigation.navigate('Tests', { screen: 'CreateTest' })}>
          <Ionicons name="add-circle" size={21} color="#fff" />
          <Text style={styles.createButtonText}>Create a test</Text>
          <Ionicons name="arrow-forward" size={18} color="#C7D2FE" style={styles.createArrow} />
        </TouchableOpacity>

        <SectionTitle title="At a glance" />
        <View style={styles.statsGrid}>
          {dashboard.isLoading ? <StatSkeleton /> : <StatsGrid stats={stats} />}
        </View>

        <SectionTitle title="Quick actions" />
        <View style={styles.actions}>
          <QuickAction icon="document-text-outline" label="My tests" onPress={() => navigation.navigate('Tests')} />
          <QuickAction icon="people-outline" label="Students" onPress={() => navigation.navigate('Courses')} />
          <QuickAction icon="bar-chart-outline" label="Analytics" onPress={() => navigation.navigate('Tests')} />
          <QuickAction icon="reader-outline" label="Reports" onPress={() => navigation.navigate('Courses', { screen: 'Marks' })} />
        </View>

        {latestAlert ? <AlertCard alert={latestAlert} onPress={() => navigation.navigate('More', { screen: 'Notifications' })} /> : null}

        <View style={styles.sectionHeader}>
          <SectionTitle title="Recent tests" noMargin />
          <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('Tests')}><Text style={styles.seeAll}>See all</Text></TouchableOpacity>
        </View>
        {tests.isLoading ? <RecentTestSkeleton /> : tests.isError ? <InlineState icon="cloud-offline-outline" message="Couldn’t load your tests. Pull to retry." /> : recentTests.length ? (
          <View style={styles.list}>{recentTests.map((test) => <RecentTest key={test._id} test={test} onPress={() => navigation.navigate('Tests', { screen: 'TestDetail', params: { testId: test._id } })} />)}</View>
        ) : <InlineState icon="document-outline" message="No tests yet. Create your first one when you’re ready." />}
      </ScrollView>
    </View>
  );
}

function StatsGrid({ stats }: { stats: DashboardStats }) {
    ['Active tests', stats.activeTests, 'radio-button-on-outline'],
    ['Submissions', stats.totalSubmissions, 'checkmark-done-outline'],
    ['Students', stats.totalStudents, 'people-outline'],
    // These values are part of the existing dashboard response in some deployments.
    // Keep them visible when supplied rather than discarding real teacher data.
    ['Pending grading', stats.pendingGrading, 'clipboard-outline'],
    ['Courses', stats.totalCourses, 'school-outline'],
  ].filter(([, value]) => value != null) as [string, number, string][];
  if (!cards.length) return <InlineState icon="bar-chart-outline" message="Your teaching summary will appear here when available." compact />;
  return <>{cards.map(([label, value, icon]) => <View key={label} style={styles.statCard}><View style={styles.statIcon}><Ionicons name={icon as any} size={18} color={colors.primary} /></View><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>)}</>;
}

function StatSkeleton() { return <>{[1, 2, 3, 4].map((item) => <View key={item} style={[styles.statCard, styles.skeleton]} />)}</>; }
function RecentTestSkeleton() { return <View style={[styles.recentCard, styles.skeleton, { height: 94 }]} />; }

function SectionTitle({ title, noMargin = false }: { title: string; noMargin?: boolean }) { return <Text style={[styles.sectionTitle, !noMargin && styles.sectionTitleMargin]}>{title}</Text>; }

function QuickAction({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return <TouchableOpacity accessibilityRole="button" style={styles.action} onPress={onPress}><View style={styles.actionIcon}><Ionicons name={icon as any} size={21} color={colors.primary} /></View><Text style={styles.actionLabel}>{label}</Text></TouchableOpacity>;
}

function AlertCard({ alert, onPress }: { alert: Notification; onPress: () => void }) {
  return <TouchableOpacity style={styles.alert} accessibilityRole="button" onPress={onPress}><View style={styles.alertIcon}><Ionicons name="notifications-outline" size={19} color="#C0841A" /></View><View style={styles.alertCopy}><Text style={styles.alertTitle} numberOfLines={1}>{alert.title}</Text><Text style={styles.alertMessage} numberOfLines={2}>{alert.message}</Text></View><Ionicons name="chevron-forward" size={19} color={colors.textMuted} /></TouchableOpacity>;
}

function RecentTest({ test, onPress }: { test: Test; onPress: () => void }) {
  const tone = test.status === 'published' ? 'success' : test.status === 'draft' ? 'warning' : 'neutral';
  return <TouchableOpacity style={styles.recentCard} accessibilityRole="button" onPress={onPress}><View style={styles.testTop}><View style={styles.testTitleWrap}><Text style={styles.testTitle} numberOfLines={1}>{test.title}</Text>{test.subject ? <Text style={styles.subject} numberOfLines={1}>{test.subject}</Text> : null}</View><Badge label={test.status} tone={tone as any} /></View><View style={styles.testMeta}><Meta icon="time-outline" label={`${test.duration} min`} />{test.totalMarks != null ? <Meta icon="ribbon-outline" label={`${test.totalMarks} marks`} /> : null}</View></TouchableOpacity>;
}
function Meta({ icon, label }: { icon: string; label: string }) { return <View style={styles.meta}><Ionicons name={icon as any} size={15} color={colors.textMuted} /><Text style={styles.metaText}>{label}</Text></View>; }
function InlineState({ icon, message, compact = false }: { icon: string; message: string; compact?: boolean }) { return <View style={[styles.inlineState, compact && styles.inlineCompact]}><Ionicons name={icon as any} size={21} color={colors.textMuted} /><Text style={styles.inlineText}>{message}</Text></View>; }

const styles = StyleSheet.create({
 screen: { flex: 1, backgroundColor: colors.background }, content: { padding: spacing.lg, paddingBottom: 36 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm }, brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, brandMark: { width: 29, height: 29, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, brandLetter: { color: '#fff', fontWeight: '800', fontSize: 16 }, brandName: { color: colors.darkBackground, fontWeight: '800', fontSize: 16 }, iconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.darkBackground, justifyContent: 'center', alignItems: 'center' }, notificationDot: { position: 'absolute', right: -3, top: -3, minWidth: 17, height: 17, paddingHorizontal: 3, borderRadius: 9, backgroundColor: colors.danger, borderWidth: 2, borderColor: colors.background, alignItems: 'center', justifyContent: 'center' }, notificationCount: { color: '#fff', fontSize: 9, fontWeight: '800' },
  welcomeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 29 }, welcomeCopy: { flex: 1, paddingRight: spacing.sm }, eyebrow: { fontSize: 11, letterSpacing: 1.2, fontWeight: '700', color: colors.primary }, greeting: { ...typography.h1, color: colors.darkBackground, marginTop: 5 }, context: { ...typography.body, color: colors.textMuted, marginTop: 5, lineHeight: 21 }, avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E0E7FF', borderWidth: 2, borderColor: '#C7D2FE', alignItems: 'center', justifyContent: 'center' }, avatarText: { color: colors.primaryDark, fontWeight: '800', fontSize: 19 },
  createButton: { height: 56, borderRadius: radius.md, marginTop: spacing.lg, backgroundColor: colors.primary, flexDirection: 'row', paddingHorizontal: spacing.md, alignItems: 'center', shadowColor: colors.primaryDark, shadowOpacity: 0.23, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4 }, createButtonText: { color: '#fff', fontWeight: '700', fontSize: 16, marginLeft: 10 }, createArrow: { marginLeft: 'auto' },
  sectionTitle: { ...typography.h3, color: colors.darkBackground }, sectionTitleMargin: { marginTop: 28, marginBottom: spacing.md }, statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, statCard: { width: '48.7%', minHeight: 116, padding: 13, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, statIcon: { width: 31, height: 31, borderRadius: 10, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }, statValue: { ...typography.h2, color: colors.darkBackground, marginTop: 10 }, statLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2 }, skeleton: { backgroundColor: '#E5E7EB', borderColor: '#E5E7EB' },
  actions: { flexDirection: 'row', gap: spacing.sm }, action: { flex: 1, minHeight: 86, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md }, actionIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#EEF2FF' }, actionLabel: { color: colors.text, fontSize: 12, fontWeight: '600', marginTop: 7, textAlign: 'center' },
  alert: { flexDirection: 'row', alignItems: 'center', marginTop: 28, backgroundColor: '#FFFBEB', borderRadius: radius.md, padding: 13, borderWidth: 1, borderColor: '#FDE68A' }, alertIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#FEF3C7', marginRight: 10 }, alertCopy: { flex: 1, paddingRight: 8 }, alertTitle: { color: '#92400E', fontWeight: '700', fontSize: 13 }, alertMessage: { color: '#A16207', fontSize: 12, lineHeight: 17, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: spacing.md }, seeAll: { color: colors.primary, fontSize: 13, fontWeight: '700' }, list: { gap: spacing.sm }, recentCard: { padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }, testTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }, testTitleWrap: { flex: 1 }, testTitle: { color: colors.text, fontSize: 15, fontWeight: '700' }, subject: { color: colors.textMuted, fontSize: 12, marginTop: 3 }, testMeta: { flexDirection: 'row', gap: spacing.md, marginTop: 13 }, meta: { flexDirection: 'row', alignItems: 'center', gap: 4 }, metaText: { color: colors.textMuted, fontSize: 12 }, inlineState: { minHeight: 88, padding: spacing.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: radius.md, borderColor: colors.border, borderWidth: 1 }, inlineCompact: { width: '100%' }, inlineText: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 19 },
});

