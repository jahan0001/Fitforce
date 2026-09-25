import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { UserRole, useGetMyPlan, useListPlans, type FitnessPlan } from "@workspace/api-client-react";

import { AppHeader } from "@/components/AppHeader";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function PlanScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const isAdjutant = user?.role === UserRole.ADJUTANT;
  const myPlanQuery = useGetMyPlan({ query: { enabled: !isAdjutant } as never });
  const plansQuery = useListPlans({ query: { enabled: isAdjutant } as never });

  if (isAdjutant) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <AppHeader right={
          <Button label="+ New" onPress={() => router.push("/plan/new")} style={{ height: 36, paddingHorizontal: 14 }} />
        } />
        <ScrollView contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={plansQuery.isFetching && !plansQuery.isLoading} onRefresh={() => plansQuery.refetch()} tintColor={colors.primary} />}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Fitness Plans</Text>
          {!plansQuery.isLoading && (plansQuery.data ?? []).length === 0 ? (
            <EmptyState icon="clipboard" title="No plans yet" subtitle="Create a weekly fitness plan for FIT or UNFIT soldiers." />
          ) : null}
          {(plansQuery.data ?? []).map((plan) => (
            <PlanCard key={plan.id} plan={plan} onPress={() => router.push(`/plan/${plan.id}`)} />
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={myPlanQuery.isFetching && !myPlanQuery.isLoading} onRefresh={() => myPlanQuery.refetch()} tintColor={colors.primary} />}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>My Weekly Plan</Text>
        {myPlanQuery.isError ? (
          <EmptyState icon="clipboard" title="No plan assigned yet" subtitle="Your Adjutant has not assigned a fitness plan yet." />
        ) : myPlanQuery.data ? (
          <PlanDetail plan={myPlanQuery.data} />
        ) : null}
      </ScrollView>
    </View>
  );
}

function PlanCard({ plan, onPress }: { plan: FitnessPlan; onPress: () => void }) {
  const colors = useColors();
  return (
    <Card onPress={onPress}>
      <View style={styles.planHeader}>
        <Text style={[styles.planTitle, { color: colors.foreground }]}>{plan.title}</Text>
        <Badge label={plan.fitnessStatusTarget} tone={plan.fitnessStatusTarget === "UNFIT" ? "warning" : "success"} />
      </View>
      <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{plan.exercises.length} exercises</Text>
      {!plan.isActive ? <Badge label="Inactive" tone="muted" /> : null}
    </Card>
  );
}

function PlanDetail({ plan }: { plan: FitnessPlan }) {
  const colors = useColors();
  const byDay = plan.exercises.reduce<Record<string, typeof plan.exercises>>((acc, ex) => {
    acc[ex.dayOfWeek] = acc[ex.dayOfWeek] ? [...acc[ex.dayOfWeek], ex] : [ex];
    return acc;
  }, {});
  return (
    <View style={{ gap: 16 }}>
      <Card>
        <View style={styles.planHeader}>
          <Text style={[styles.planTitle, { color: colors.foreground }]}>{plan.title}</Text>
          <Badge label={plan.fitnessStatusTarget} tone={plan.fitnessStatusTarget === "UNFIT" ? "warning" : "success"} />
        </View>
      </Card>
      {Object.entries(byDay).map(([day, exercises]) => (
        <Card key={day} style={{ gap: 10 }}>
          <Text style={[styles.dayTitle, { color: colors.primary }]}>{day}</Text>
          {exercises.map((ex) => (
            <View key={ex.id} style={styles.exerciseRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontWeight: "600" }}>{ex.exerciseName}</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{ex.focusArea}</Text>
              </View>
              <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{ex.durationMinutes} min</Text>
            </View>
          ))}
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, flexGrow: 1 },
  sectionTitle: { fontSize: 20, fontWeight: "800", marginBottom: 4 },
  planHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  planTitle: { fontSize: 17, fontWeight: "700" },
  dayTitle: { fontSize: 13, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  exerciseRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
