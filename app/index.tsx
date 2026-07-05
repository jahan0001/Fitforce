import { Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { View, ActivityIndicator } from "react-native";
import { useColors } from "@/hooks/useColors";

export default function IndexScreen() {
  const { token, user, isBootstrapping, isLoadingUser } = useAuth();
  const colors = useColors();

  // Still loading token from storage or fetching user profile
  if (isBootstrapping || isLoadingUser) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!token || !user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!user.isApproved) {
    return <Redirect href="/(auth)/pending" />;
  }

  return <Redirect href="/(tabs)" />;
}
