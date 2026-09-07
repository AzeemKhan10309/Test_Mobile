import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { subscriptionsAPI } from '../../api/subscriptions.api';
import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ErrorState, LoadingState } from '../../components/StateViews';
import { colors, spacing, typography } from '../../theme';

export default function SubscriptionScreen() {
  const status = useQuery({ queryKey: ['subscriptions', 'status'], queryFn: subscriptionsAPI.getStatus });
  const plans = useQuery({ queryKey: ['subscriptions', 'plans'], queryFn: subscriptionsAPI.getPlans });
  const [checkoutMsg, setCheckoutMsg] = useState<string | null>(null);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);

  if (status.isLoading || plans.isLoading) return <LoadingState />;
  if (status.isError || plans.isError) return <ErrorState message="Could not load subscription info." onRetry={() => { status.refetch(); plans.refetch(); }} />;

  const planList = (plans.data as any[]) ?? [];

  const upgrade = async (planId: string) => {
    setBusyPlan(planId);
    setCheckoutMsg(null);
    try {
      const res = await subscriptionsAPI.checkout(planId);
      // Honest handling: the backend may return a real checkout URL or just
      // a configuration message — never assume payment succeeded.
      if (res.checkoutUrl && res.checkoutUrl !== '#') {
        await Linking.openURL(res.checkoutUrl);
      } else {
        setCheckoutMsg(res.message || 'Checkout is not fully configured on the backend yet.');
      }
    } catch (err: any) {
      setCheckoutMsg(err?.response?.data?.message || 'Could not start checkout.');
    } finally {
      setBusyPlan(null);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={styles.title}>Subscription</Text>
      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={styles.currentLabel}>Current plan</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={styles.currentPlan}>{status.data?.plan ?? 'Free'}</Text>
          <Badge label={status.data?.status ?? 'active'} tone={status.data?.status === 'active' ? 'success' : 'neutral'} />
        </View>
      </Card>

      {checkoutMsg && (
        <Card style={{ marginBottom: spacing.md, backgroundColor: '#FEF3C7' }}>
          <Text style={{ color: colors.warning }}>{checkoutMsg}</Text>
        </Card>
      )}

      {planList.map((p: any) => (
        <Card key={p.id ?? p._id} style={{ marginBottom: spacing.sm }}>
          <Text style={styles.planName}>{p.name}</Text>
          {p.price != null && <Text style={styles.planPrice}>{p.price}</Text>}
          <PrimaryButton title="Choose plan" loading={busyPlan === (p.id ?? p._id)} onPress={() => upgrade(p.id ?? p._id)} style={{ marginTop: spacing.sm }} />
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.lg },
  currentLabel: { ...typography.caption, color: colors.textMuted },
  currentPlan: { ...typography.h2, color: colors.text },
  planName: { ...typography.h3, color: colors.text },
  planPrice: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
});
