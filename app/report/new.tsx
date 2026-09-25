import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";
import { useCreateReport } from "@workspace/api-client-react";

import { Button } from "@/components/Button";
import { FormInput } from "@/components/FormInput";
import { useColors } from "@/hooks/useColors";

export default function NewReportScreen() {
  const colors = useColors();
  const createReport = useCreateReport();
  const [title, setTitle] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!title.trim() || !messageBody.trim()) {
      setError("Title and message are both required.");
      return;
    }
    setError(null);
    createReport.mutate(
      { data: { title: title.trim(), messageBody: messageBody.trim() } },
      {
        onSuccess: () => router.back(),
        onError: (err) => Alert.alert("Error", err instanceof Error ? err.message : "Could not send report"),
      },
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <FormInput label="Report Title" value={title} onChangeText={setTitle} placeholder="Weekly Training Summary" />
      <FormInput
        label="Message"
        value={messageBody}
        onChangeText={setMessageBody}
        placeholder="Details for the Adjutant..."
        multiline
        numberOfLines={6}
        style={{ height: 140, textAlignVertical: "top", paddingTop: 12 }}
      />
      {error ? <Text style={{ color: colors.destructive, fontSize: 13 }}>{error}</Text> : null}
      <Button label="Send Report" onPress={handleSubmit} loading={createReport.isPending} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
  },
});
