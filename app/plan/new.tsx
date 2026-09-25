import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { FitnessStatus, useCreatePlan, type ExerciseInput } from "@workspace/api-client-react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { FormInput } from "@/components/FormInput";
import { useColors } from "@/hooks/useColors";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const emptyExercise: ExerciseInput = {
  dayOfWeek: "Monday",
  exerciseName: "",
  durationMinutes: 30,
  focusArea: "",
};

export default function NewPlanScreen() {
  const colors = useColors();
  const createPlan = useCreatePlan();
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState<FitnessStatus>(FitnessStatus.FIT);
  const [exercises, setExercises] = useState<ExerciseInput[]>([{ ...emptyExercise }]);
  const [error, setError] = useState<string | null>(null);

  const updateExercise = (index: number, patch: Partial<ExerciseInput>) => {
    setExercises((prev) => prev.map((ex, i) => (i === index ? { ...ex, ...patch } : ex)));
  };

  const removeExercise = (index: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      setError("Enter a plan title.");
      return;
    }
    if (exercises.length === 0 || exercises.some((e) => !e.exerciseName.trim() || !e.focusArea.trim())) {
      setError("Every exercise needs a name and focus area.");
      return;
    }
    setError(null);
    createPlan.mutate(
      { data: { title: title.trim(), fitnessStatusTarget: target, exercises } },
      {
        onSuccess: () => router.back(),
        onError: (err) => Alert.alert("Error", err instanceof Error ? err.message : "Could not create plan"),
      },
    );
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
        onPress={() => setExercises((prev) => [...prev, { ...emptyExercise }])}
      />

      {error ? <Text style={{ color: colors.destructive, fontSize: 13 }}>{error}</Text> : null}

      <Button label="Create Plan" onPress={handleSubmit} loading={createPlan.isPending} style={{ marginTop: 8 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
