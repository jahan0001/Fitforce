import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  FitnessStatus,
  useDeletePlan,
  useListPlans,
  useUpdatePlan,
  type ExerciseInput,
} from "@workspace/api-client-react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { FormInput } from "@/components/FormInput";
import { useColors } from "@/hooks/useColors";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function EditPlanScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const planId = Number(id);
  const plansQuery = useListPlans();
  const updatePlan = useUpdatePlan();
  const deletePlan = useDeletePlan();

  const plan = (plansQuery.data ?? []).find((p) => p.id === planId);

  const [title, setTitle] = useState("");
  const [target, setTarget] = useState<FitnessStatus>(FitnessStatus.FIT);
  const [isActive, setIsActive] = useState(true);
  const [exercises, setExercises] = useState<ExerciseInput[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (plan && !initialized) {
      setTitle(plan.title);
      setTarget(plan.fitnessStatusTarget);
      setIsActive(plan.isActive);
      setExercises(plan.exercises.map(({ id: _id, planId: _planId, ...rest }) => rest));
      setInitialized(true);
    }
  }, [plan, initialized]);

  const updateExercise = (index: number, patch: Partial<ExerciseInput>) => {
    setExercises((prev) => prev.map((ex, i) => (i === index ? { ...ex, ...patch } : ex)));
  };

  const removeExercise = (index: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  };

  if (!plan) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: colors.mutedForeground }}>Loading plan...</Text>
      </View>
    );
  }

  const handleSubmit = () => {
    if (!title.trim() || exercises.some((e) => !e.exerciseName.trim() || !e.focusArea.trim())) {
      setError("Fill in the title and every exercise field.");
      return;
    }
    setError(null);
    updatePlan.mutate(
      { id: planId, data: { title: title.trim(), fitnessStatusTarget: target, isActive, exercises } },
      {
        onSuccess: () => router.back(),
        onError: (err) => Alert.alert("Error", err instanceof Error ? err.message : "Could not update plan"),
      },
    );
  };

  const handleDelete = () => {
    Alert.alert("Delete plan", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          deletePlan.mutate(
            { id: planId },
            { onSuccess: () => router.back() },
          ),
      },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <FormInput label="Plan Title" value={title} onChangeText={setTitle} placeholder="Week 1 - Standard Fitness" />

      <View style={{ gap: 8 }}>
        <Text style={{ color: colors.mutedForeground, fontSize: 13, fontWeight: "600" }}>Target Group</Text>
        <View style={styles.chipRow}>
          {[FitnessStatus.FIT, FitnessStatus.UNFIT].map((status) => (
            <Button
              key={status}
              label={status === "UNFIT" ? "UNFIT (Remedial)" : "FIT"}
              variant={target === status ? "primary" : "outline"}
              onPress={() => setTarget(status)}
              style={{ flex: 1, height: 44 }}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ color: colors.mutedForeground, fontSize: 13, fontWeight: "600" }}>Status</Text>
        <View style={styles.chipRow}>
          <Button label="Active" variant={isActive ? "primary" : "outline"} onPress={() => setIsActive(true)} style={{ flex: 1, height: 44 }} />
          <Button label="Inactive" variant={!isActive ? "primary" : "outline"} onPress={() => setIsActive(false)} style={{ flex: 1, height: 44 }} />
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Exercises</Text>
      {exercises.map((exercise, index) => (
        <Card key={index} style={{ gap: 12 }}>
          <View style={styles.exerciseHeader}>
            <Text style={{ color: colors.foreground, fontWeight: "700" }}>Exercise {index + 1}</Text>
            {exercises.length > 1 ? (
              <Pressable onPress={() => removeExercise(index)} hitSlop={10}>
                <Feather name="trash-2" size={18} color={colors.destructive} />
              </Pressable>
            ) : null}
          </View>

          <View style={{ gap: 6 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 12, fontWeight: "600" }}>Day of Week</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {DAYS.map((day) => (
                  <Pressable
                    key={day}
                    onPress={() => updateExercise(index, { dayOfWeek: day })}
                    style={[
                      styles.dayChip,
                      {
                        backgroundColor: exercise.dayOfWeek === day ? colors.primary : colors.secondary,
                        borderRadius: colors.radius,
                      },
                    ]}
                  >
                    <Text style={{ color: exercise.dayOfWeek === day ? colors.primaryForeground : colors.secondaryForeground, fontWeight: "600", fontSize: 12 }}>
                      {day.slice(0, 3)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          <FormInput
            label="Exercise Name"
            value={exercise.exerciseName}
            onChangeText={(v) => updateExercise(index, { exerciseName: v })}
            placeholder="Push-ups"
          />
          <FormInput
            label="Focus Area"
            value={exercise.focusArea}
            onChangeText={(v) => updateExercise(index, { focusArea: v })}
            placeholder="Upper Body"
          />
          <FormInput
            label="Duration (minutes)"
            keyboardType="numeric"
            value={String(exercise.durationMinutes)}
            onChangeText={(v) => updateExercise(index, { durationMinutes: Number(v) || 0 })}
            placeholder="30"
          />
        </Card>
      ))}

      <Button
        label="Add Exercise"
        variant="outline"
        onPress={() => setExercises((prev) => [...prev, { dayOfWeek: "Monday", exerciseName: "", durationMinutes: 30, focusArea: "" }])}
      />

      {error ? <Text style={{ color: colors.destructive, fontSize: 13 }}>{error}</Text> : null}

      <Button label="Save Changes" onPress={handleSubmit} loading={updatePlan.isPending} style={{ marginTop: 8 }} />
      <Button label="Delete Plan" variant="destructive" onPress={handleDelete} loading={deletePlan.isPending} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 60,
  },
  chipRow: {
    flexDirection: "row",
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginTop: 8,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
