import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import {
  getSoldiers, getIPFTResults, getIPFTSchedule,
  getNotifications, getPTPlans, getReports, calcBMI, getIPFTResultsBySoldier,
} from '@/lib/storage';
import type { Soldier, IPFTResult, IPFTSchedule } from '@/lib/types';
import { BarChart } from '@/components/BarChart';

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>({});
  const isWeb = Platform.OS === 'web';

  const load = useCallback(async () => {
    if (!user) return;
    const [soldiers, results, schedule, notifications, plans, reports] = await Promise.all([
      getSoldiers(), getIPFTResults(), getIPFTSchedule(), getNotifications(), getPTPlans(), getReports(),
    ]);

    const approvedSoldiers = soldiers.filter(s => s.isApproved);

    const mySoldiers = user.role === 'coy_comd'
      ? approvedSoldiers.filter(s => s.company === user.company)
      : approvedSoldiers;

    const unreadNotifs = notifications.filter(n => !n.read).length;
    const overweight = mySoldiers.filter(s => s.isOverweight);
    const fit = mySoldiers.filter(s => s.ptStatus === 'fit');
    const unfit = mySoldiers.filter(s => s.ptStatus === 'unfit');

    let ipftDaysLeft: number | null = null;
    if (schedule?.proposedDate && schedule.status === 'approved') {
      const target = new Date(schedule.proposedDate);
      const now = new Date();
      const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      ipftDaysLeft = Math.max(0, diff);
    }

    let soldierResults: IPFTResult[] = [];
    let soldierBMI: number | null = null;
    let myPlan = null;
    if (user.role === 'soldier') {
      const mySol = soldiers.find(s => s.userId === user.id);
      if (mySol) {
        soldierResults = await getIPFTResultsBySoldier(mySol.id);
        soldierBMI = calcBMI(mySol.weight, mySol.height);
        myPlan = plans.find(p => p.type === (mySol.ptStatus === 'unfit' ? 'unfit' : 'fit'));
      }
    }

    const companyBreakdown: Record<string, { total: number; fit: number; unfit: number }> = {};
    ['A', 'B', 'C', 'D'].forEach(c => {
      const cs = approvedSoldiers.filter(s => s.company === c);
      companyBreakdown[c] = {
        total: cs.length,
        fit: cs.filter(s => s.ptStatus === 'fit').length,
        unfit: cs.filter(s => s.ptStatus === 'unfit').length,
      };
    });

    setData({ soldiers: mySoldiers, allSoldiers: soldiers, approvedSoldiers, results, schedule, ipftDaysLeft, unreadNotifs, overweight, fit, unfit, soldierResults, soldierBMI, myPlan, companyBreakdown, plans, reports });
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-BD', { day: '2-digit', month: 'long', year: 'numeric' });

  if (!user) return null;

  const StatCard = ({ label, value, icon, color, onPress }: { label: string; value: string | number; icon: string; color: string; onPress?: () => void }) => (
    <TouchableOpacity style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onPress} activeOpacity={onPress ? 0.75 : 1}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <MaterialCommunityIcons name={icon as any} size={22} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </TouchableOpacity>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={[styles.sectionHeader, { color: colors.foreground }]}>{title}</Text>
  );

  const renderIPFTBanner = () => {
    const s = data.schedule as IPFTSchedule | null;
    if (!s) return null;
    const statusColor = s.status === 'approved' ? colors.success : s.status === 'rejected' ? colors.destructive : colors.accent;
    const statusLabel = s.status === 'approved' ? 'CONFIRMED' : s.status === 'rejected' ? 'REJECTED' : 'PENDING CO APPROVAL';
    return (
      <View style={[styles.ipftBanner, { backgroundColor: statusColor + '15', borderColor: statusColor }]}>
        <MaterialCommunityIcons name="calendar-check" size={24} color={statusColor} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.ipftBannerTitle, { color: statusColor }]}>Next IPFT — {statusLabel}</Text>
          <Text style={[styles.ipftBannerDate, { color: colors.foreground }]}>{formatDate(s.proposedDate)}</Text>
          {data.ipftDaysLeft !== null && <Text style={[styles.ipftCountdown, { color: statusColor }]}>{data.ipftDaysLeft} days remaining</Text>}
        </View>
      </View>
    );
  };

  const paddingTop = 16;
  const paddingBottom = isWeb ? 34 : insets.bottom + 90;

  if (user.role === 'co') {
    return (
      <ScrollView style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingTop, paddingBottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        <View style={styles.greetRow}>
          <View>
            <Text style={[styles.greetSmall, { color: colors.mutedForeground }]}>Commanding Officer</Text>
            <Text style={[styles.greetName, { color: colors.foreground }]}>{user.name}</Text>
            <Text style={[styles.greetBA, { color: colors.mutedForeground }]}>{user.ba} · {user.rank}</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.roleBadgeText}>CO</Text>
          </View>
        </View>
        {renderIPFTBanner()}
        <SectionHeader title="Unit Strength" />
        <View style={styles.statsGrid}>
          <StatCard label="Total" value={data.approvedSoldiers?.length ?? 0} icon="account-group" color={colors.primary} onPress={() => router.push('/(tabs)/soldiers')} />
          <StatCard label="Fit" value={data.approvedSoldiers?.filter((s: Soldier) => s.ptStatus === 'fit').length ?? 0} icon="check-circle" color={colors.success} />
          <StatCard label="Unfit" value={data.approvedSoldiers?.filter((s: Soldier) => s.ptStatus === 'unfit').length ?? 0} icon="close-circle" color={colors.destructive} />
          <StatCard label="Overweight" value={data.approvedSoldiers?.filter((s: Soldier) => s.isOverweight).length ?? 0} icon="alert" color={colors.warning} />
        </View>
        <SectionHeader title="IPFT Pass Rate by Company" />
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <BarChart
            unit="%"
            height={110}
            maxValue={100}
            labelColor={colors.foreground}
            subColor={colors.mutedForeground}
            trackColor={colors.muted}
            data={['A', 'B', 'C', 'D'].map(c => {
              const cb = data.companyBreakdown?.[c];
              const passRate = cb && cb.total > 0 ? Math.round((cb.fit / cb.total) * 100) : 0;
              return { label: `${c} Coy`, value: passRate, color: passRate >= 70 ? colors.success : passRate > 0 ? colors.destructive : colors.mutedForeground };
            })}
          />
        </View>
        <SectionHeader title="Company Breakdown" />
        {['A', 'B', 'C', 'D'].map(c => {
          const cb = data.companyBreakdown?.[c];
          if (!cb) return null;
          const passRate = cb.total > 0 ? Math.round((cb.fit / cb.total) * 100) : 0;
          return (
            <View key={c} style={[styles.companyRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.companyBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.companyBadgeText}>{c}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.companyLabel, { color: colors.foreground }]}>{c} Company</Text>
                <Text style={[styles.companyStats, { color: colors.mutedForeground }]}>{cb.total} soldiers · {cb.fit} fit · {cb.unfit} unfit</Text>
              </View>
              <Text style={[styles.passRate, { color: passRate >= 70 ? colors.success : colors.destructive }]}>{passRate}%</Text>
            </View>
          );
        })}
      </ScrollView>
    );
  }

  if (user.role === '2ic') {
    return (
      <ScrollView style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingTop, paddingBottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        <View style={styles.greetRow}>
          <View>
            <Text style={[styles.greetSmall, { color: colors.mutedForeground }]}>Second in Command</Text>
            <Text style={[styles.greetName, { color: colors.foreground }]}>{user.name}</Text>
            <Text style={[styles.greetBA, { color: colors.mutedForeground }]}>{user.ba}</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.roleBadgeText}>2IC</Text>
          </View>
        </View>
        {renderIPFTBanner()}
        <SectionHeader title="Unit Overview" />
        <View style={styles.statsGrid}>
          <StatCard label="Total Soldiers" value={data.approvedSoldiers?.length ?? 0} icon="account-group" color={colors.primary} />
          <StatCard label="Fit" value={data.approvedSoldiers?.filter((s: Soldier) => s.ptStatus === 'fit').length ?? 0} icon="check-circle" color={colors.success} />
          <StatCard label="Unfit" value={data.approvedSoldiers?.filter((s: Soldier) => s.ptStatus === 'unfit').length ?? 0} icon="close-circle" color={colors.destructive} />
          <StatCard label="PT Plans" value={data.plans?.length ?? 0} icon="dumbbell" color={colors.accent} />
        </View>
        <SectionHeader title="PT Plans" />
        <TouchableOpacity style={[styles.newPlanBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/plan/new')}>
          <Feather name="plus-circle" size={20} color="#FFF" />
          <Text style={styles.newPlanBtnText}>Create New PT Plan</Text>
        </TouchableOpacity>
        {data.plans?.map((plan: any) => (
          <TouchableOpacity key={plan.id} style={[styles.planCard, { backgroundColor: colors.card, borderColor: plan.type === 'fit' ? colors.success : colors.warning }]}
            onPress={() => router.push(`/plan/${plan.id}`)} activeOpacity={0.75}>
            <View style={[styles.planType, { backgroundColor: plan.type === 'fit' ? colors.success : colors.warning }]}>
              <Text style={styles.planTypeText}>{plan.type === 'fit' ? 'FIT' : 'UNFIT'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.planTitle, { color: colors.foreground }]}>{plan.title}</Text>
              <Text style={[styles.planMeta, { color: colors.mutedForeground }]}>Week {plan.weekNumber} · {plan.days.length} days</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  }

  if (user.role === 'coy_comd') {
    const comp = user.company ?? 'A';
    const mySoldiers = data.soldiers ?? [];
    const passRate = mySoldiers.length > 0 ? Math.round(((data.fit?.length ?? 0) / mySoldiers.length) * 100) : 0;
    return (
      <ScrollView style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingTop, paddingBottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        <View style={styles.greetRow}>
          <View>
            <Text style={[styles.greetSmall, { color: colors.mutedForeground }]}>{comp} Company Commander</Text>
            <Text style={[styles.greetName, { color: colors.foreground }]}>{user.name}</Text>
            <Text style={[styles.greetBA, { color: colors.mutedForeground }]}>{user.ba}</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.roleBadgeText}>{comp} COY</Text>
          </View>
        </View>
        {renderIPFTBanner()}
        <SectionHeader title={`${comp} Company Strength`} />
        <View style={styles.statsGrid}>
          <StatCard label="Total" value={mySoldiers.length} icon="account-group" color={colors.primary} onPress={() => router.push('/(tabs)/soldiers')} />
          <StatCard label="Fit" value={data.fit?.length ?? 0} icon="check-circle" color={colors.success} />
          <StatCard label="Unfit" value={data.unfit?.length ?? 0} icon="close-circle" color={colors.destructive} />
          <StatCard label="Overweight" value={data.overweight?.length ?? 0} icon="alert" color={colors.warning} />
        </View>
        <View style={[styles.passRateCard, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
          <Text style={[styles.passRateTitle, { color: colors.primary }]}>PT Pass Rate</Text>
          <Text style={[styles.passRateBig, { color: passRate >= 70 ? colors.success : colors.destructive }]}>{passRate}%</Text>
          <Text style={[styles.passRateSub, { color: colors.mutedForeground }]}>{data.fit?.length ?? 0} of {mySoldiers.length} soldiers</Text>
        </View>
        <SectionHeader title="IPFT Result Breakdown" />
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <BarChart
            height={100}
            labelColor={colors.foreground}
            subColor={colors.mutedForeground}
            trackColor={colors.muted}
            data={[
              { label: 'Fit', value: data.fit?.length ?? 0, color: colors.success },
              { label: 'Unfit', value: data.unfit?.length ?? 0, color: colors.destructive },
              { label: 'Overweight', value: data.overweight?.length ?? 0, color: colors.warning },
            ]}
          />
        </View>
        {(data.overweight?.length ?? 0) > 0 && (
          <>
            <SectionHeader title="Overweight Soldiers" />
            {data.overweight?.map((s: Soldier) => (
              <TouchableOpacity key={s.id} style={[styles.alertCard, { backgroundColor: colors.warning + '10', borderColor: colors.warning }]}
                onPress={() => router.push(`/soldier/${s.id}`)} activeOpacity={0.75}>
                <MaterialCommunityIcons name="alert" size={20} color={colors.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.alertName, { color: colors.foreground }]}>{s.rank} {s.name}</Text>
                  <Text style={[styles.alertSub, { color: colors.mutedForeground }]}>{s.serviceNumber} · BMI: {calcBMI(s.weight, s.height)}</Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    );
  }

  if (user.role === 'adjutant') {
    const pending = data.allSoldiers?.filter((s: Soldier) => !s.isApproved) ?? [];
    const unreadReports = data.reports?.filter((r: any) => !r.read && r.toRole === 'adjutant') ?? [];
    return (
      <ScrollView style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingTop, paddingBottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        <View style={styles.greetRow}>
          <View>
            <Text style={[styles.greetSmall, { color: colors.mutedForeground }]}>Adjutant</Text>
            <Text style={[styles.greetName, { color: colors.foreground }]}>{user.name}</Text>
            <Text style={[styles.greetBA, { color: colors.mutedForeground }]}>{user.ba}</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.roleBadgeText}>ADJT</Text>
          </View>
        </View>
        {renderIPFTBanner()}
        <View style={styles.statsGrid}>
          <StatCard label="Total Soldiers" value={data.approvedSoldiers?.length ?? 0} icon="account-group" color={colors.primary} onPress={() => router.push('/(tabs)/soldiers')} />
          <StatCard label="Pending Approval" value={pending.length} icon="account-clock" color={colors.warning} />
          <StatCard label="New Reports" value={unreadReports.length} icon="file-alert" color={colors.accent} onPress={() => router.push('/(tabs)/reports')} />
          <StatCard label="Unfit Soldiers" value={data.approvedSoldiers?.filter((s: Soldier) => s.ptStatus === 'unfit').length ?? 0} icon="close-circle" color={colors.destructive} />
        </View>
        <TouchableOpacity style={[styles.newPlanBtn, { backgroundColor: colors.accent }]} onPress={() => router.push('/(tabs)/notifications')}>
          <Feather name="send" size={20} color="#FFF" />
          <Text style={styles.newPlanBtnText}>Propose IPFT Date to CO</Text>
        </TouchableOpacity>
        <SectionHeader title="IPFT Schedule Status" />
        {data.schedule ? (
          <View style={[styles.scheduleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.scheduleDateLabel, { color: colors.mutedForeground }]}>Proposed Date</Text>
            <Text style={[styles.scheduleDate, { color: colors.foreground }]}>{formatDate(data.schedule.proposedDate)}</Text>
            <View style={[styles.scheduleStatus, { backgroundColor: data.schedule.status === 'approved' ? colors.success + '20' : data.schedule.status === 'rejected' ? colors.destructive + '20' : colors.warning + '20' }]}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: data.schedule.status === 'approved' ? colors.success : data.schedule.status === 'rejected' ? colors.destructive : colors.warning }}>
                {data.schedule.status.toUpperCase()}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={[styles.noSchedule, { color: colors.mutedForeground }]}>No IPFT date proposed yet.</Text>
        )}
      </ScrollView>
    );
  }

  if (user.role === 'clerk') {
    return (
      <ScrollView style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingTop, paddingBottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        <View style={styles.greetRow}>
          <View>
            <Text style={[styles.greetSmall, { color: colors.mutedForeground }]}>Clerk</Text>
            <Text style={[styles.greetName, { color: colors.foreground }]}>{user.name}</Text>
            <Text style={[styles.greetBA, { color: colors.mutedForeground }]}>{user.ba}</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.roleBadgeText}>CLERK</Text>
          </View>
        </View>
        {renderIPFTBanner()}
        <View style={styles.statsGrid}>
          <StatCard label="Total Soldiers" value={data.approvedSoldiers?.length ?? 0} icon="account-group" color={colors.primary} onPress={() => router.push('/(tabs)/soldiers')} />
          <StatCard label="Results Logged" value={data.results?.length ?? 0} icon="clipboard-check" color={colors.success} />
          <StatCard label="Overweight" value={data.approvedSoldiers?.filter((s: Soldier) => s.isOverweight).length ?? 0} icon="alert" color={colors.warning} />
          <StatCard label="Unfit" value={data.approvedSoldiers?.filter((s: Soldier) => s.ptStatus === 'unfit').length ?? 0} icon="close-circle" color={colors.destructive} />
        </View>
        <TouchableOpacity style={[styles.newPlanBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/result/new')}>
          <Feather name="plus-circle" size={20} color="#FFF" />
          <Text style={styles.newPlanBtnText}>Record IPFT Result</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.newPlanBtn, { backgroundColor: colors.accent, marginTop: 8 }]} onPress={() => router.push('/(tabs)/reports')}>
          <Feather name="file-text" size={20} color="#FFF" />
          <Text style={styles.newPlanBtnText}>Send Report</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (user.role === 'soldier') {
    const mySol = data.allSoldiers?.find((s: Soldier) => s.userId === user.id);
    const latestResult = data.soldierResults?.[0];
    const failedItems = latestResult?.items.filter((i: any) => i.status === 'fail') ?? [];
    const bmi = data.soldierBMI;
    const bmiOk = bmi ? bmi < 25 : true;

    return (
      <ScrollView style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingTop, paddingBottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        <View style={styles.greetRow}>
          <View>
            <Text style={[styles.greetSmall, { color: colors.mutedForeground }]}>{user.rank} · {mySol?.company ?? ''} Company</Text>
            <Text style={[styles.greetName, { color: colors.foreground }]}>{user.name}</Text>
            <Text style={[styles.greetBA, { color: colors.mutedForeground }]}>{user.ba}</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: mySol?.ptStatus === 'fit' ? colors.success : mySol?.ptStatus === 'unfit' ? colors.destructive : colors.muted }]}>
            <Text style={styles.roleBadgeText}>{mySol?.ptStatus?.toUpperCase() ?? 'PENDING'}</Text>
          </View>
        </View>
        {data.schedule?.status === 'approved' && (
          <View style={[styles.countdownCard, { backgroundColor: colors.primary }]}>
            <Text style={styles.countdownLabel}>Next IPFT</Text>
            <Text style={styles.countdownDate}>{formatDate(data.schedule.proposedDate)}</Text>
            <View style={styles.countdownDaysRow}>
              <Text style={styles.countdownDays}>{data.ipftDaysLeft ?? '—'}</Text>
              <Text style={styles.countdownDaysLabel}>days remaining</Text>
            </View>
          </View>
        )}
        {mySol?.isOverweight && (
          <View style={[styles.alertBanner, { backgroundColor: colors.warning + '15', borderColor: colors.warning }]}>
            <MaterialCommunityIcons name="alert" size={20} color={colors.warning} />
            <Text style={[styles.alertBannerText, { color: colors.warning }]}>You are currently OVERWEIGHT. BMI: {bmi}. Follow your assigned rehabilitation plan.</Text>
          </View>
        )}
        {failedItems.length > 0 && (
          <View style={[styles.alertBanner, { backgroundColor: colors.destructive + '10', borderColor: colors.destructive }]}>
            <Feather name="x-circle" size={20} color={colors.destructive} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.alertBannerText, { color: colors.destructive }]}>Failed IPFT Items:</Text>
              {failedItems.map((item: any, i: number) => (
                <Text key={i} style={[styles.failedItem, { color: colors.destructive }]}>• {item.name} ({item.achieved} / target: {item.target})</Text>
              ))}
            </View>
          </View>
        )}
        <View style={styles.statsGrid}>
          {bmi && <StatCard label="BMI" value={bmi} icon={bmiOk ? 'check-circle' : 'alert'} color={bmiOk ? colors.success : colors.warning} />}
          <StatCard label="IPFT Records" value={data.soldierResults?.length ?? 0} icon="history" color={colors.primary} />
          <StatCard label="Height" value={mySol ? `${mySol.height}cm` : '—'} icon="human-male-height" color={colors.mutedForeground} />
          <StatCard label="Weight" value={mySol ? `${mySol.weight}kg` : '—'} icon="weight-kilogram" color={colors.mutedForeground} />
        </View>
        {(data.soldierResults?.length ?? 0) > 1 && (
          <>
            <SectionHeader title="IPFT Trend" />
            <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <BarChart
                height={90}
                maxValue={Math.max(...data.soldierResults.map((r: IPFTResult) => r.items.length))}
                labelColor={colors.foreground}
                subColor={colors.mutedForeground}
                trackColor={colors.muted}
                data={[...data.soldierResults].reverse().slice(-6).map((r: IPFTResult) => ({
                  label: new Date(r.date).toLocaleDateString('en-BD', { day: '2-digit', month: 'short' }),
                  value: r.items.filter(i => i.status === 'pass').length,
                  color: r.overallStatus === 'pass' ? colors.success : colors.destructive,
                  sublabel: `${r.items.filter(i => i.status === 'pass').length}/${r.items.length}`,
                }))}
              />
            </View>
          </>
        )}
        {latestResult && (
          <>
            <SectionHeader title="Last IPFT Result" />
            <View style={[styles.resultCard, { backgroundColor: latestResult.overallStatus === 'pass' ? colors.success + '10' : colors.destructive + '10', borderColor: latestResult.overallStatus === 'pass' ? colors.success : colors.destructive }]}>
              <View style={styles.resultHeader}>
                <Text style={[styles.resultDate, { color: colors.foreground }]}>{latestResult.date}</Text>
                <View style={[styles.resultBadge, { backgroundColor: latestResult.overallStatus === 'pass' ? colors.success : colors.destructive }]}>
                  <Text style={styles.resultBadgeText}>{latestResult.overallStatus.toUpperCase()}</Text>
                </View>
              </View>
              {latestResult.items.map((item: any, i: number) => (
                <View key={i} style={styles.resultItem}>
                  <Text style={[styles.resultItemName, { color: colors.foreground }]}>{item.name}</Text>
                  <View style={styles.resultItemRight}>
                    <Text style={[styles.resultItemVal, { color: item.status === 'pass' ? colors.success : colors.destructive }]}>{item.achieved}</Text>
                    <MaterialCommunityIcons name={item.status === 'pass' ? 'check-circle' : 'close-circle'} size={16} color={item.status === 'pass' ? colors.success : colors.destructive} />
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
        {data.myPlan && (
          <>
            <SectionHeader title="My PT Plan" />
            <TouchableOpacity style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(`/plan/${data.myPlan.id}`)} activeOpacity={0.75}>
              <View style={[styles.planType, { backgroundColor: data.myPlan.type === 'fit' ? colors.success : colors.warning }]}>
                <Text style={styles.planTypeText}>{data.myPlan.type === 'fit' ? 'FIT' : 'REHAB'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.planTitle, { color: colors.foreground }]}>{data.myPlan.title}</Text>
                <Text style={[styles.planMeta, { color: colors.mutedForeground }]}>Week {data.myPlan.weekNumber} · Tap to view</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 8 },
  greetRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 },
  greetSmall: { fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 2 },
  greetName: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  greetBA: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  roleBadge: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  roleBadgeText: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#FFF', letterSpacing: 1 },
  sectionHeader: { fontSize: 15, fontFamily: 'Inter_700Bold', marginTop: 8, marginBottom: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  statCard: { flex: 1, minWidth: '45%', borderRadius: 12, padding: 14, gap: 6, alignItems: 'center', borderWidth: 1 },
  statIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  ipftBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1.5, marginBottom: 8 },
  ipftBannerTitle: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  ipftBannerDate: { fontSize: 16, fontFamily: 'Inter_700Bold', marginTop: 2 },
  ipftCountdown: { fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 1 },
  chartCard: { borderRadius: 14, borderWidth: 1, padding: 16, paddingTop: 18, marginBottom: 8 },
  companyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  companyBadge: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  companyBadgeText: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#FFF' },
  companyLabel: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  companyStats: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  passRate: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  passRateCard: { borderRadius: 14, padding: 20, alignItems: 'center', borderWidth: 1.5, marginBottom: 8, gap: 4 },
  passRateTitle: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1.5 },
  passRateBig: { fontSize: 44, fontFamily: 'Inter_700Bold' },
  passRateSub: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  alertCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  alertName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  alertSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  scheduleCard: { borderRadius: 12, padding: 16, borderWidth: 1, gap: 6 },
  scheduleDateLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  scheduleDate: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  scheduleStatus: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start' },
  noSchedule: { fontSize: 14, fontFamily: 'Inter_400Regular', fontStyle: 'italic' },
  newPlanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 14, marginBottom: 8 },
  newPlanBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#FFF' },
  planCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1.5, marginBottom: 8 },
  planType: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  planTypeText: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#FFF', letterSpacing: 0.5 },
  planTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  planMeta: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  countdownCard: { borderRadius: 16, padding: 24, alignItems: 'center', gap: 4, marginBottom: 8 },
  countdownLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5 },
  countdownDate: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#FFF' },
  countdownDaysRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 },
  countdownDays: { fontSize: 48, fontFamily: 'Inter_700Bold', color: '#FFF' },
  countdownDaysLabel: { fontSize: 14, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.8)' },
  alertBanner: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8, alignItems: 'flex-start' },
  alertBannerText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', flex: 1 },
  failedItem: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  resultCard: { borderRadius: 12, padding: 14, borderWidth: 1.5, marginBottom: 8, gap: 10 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultDate: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  resultBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  resultBadgeText: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#FFF' },
  resultItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultItemName: { fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 },
  resultItemRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resultItemVal: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
});
