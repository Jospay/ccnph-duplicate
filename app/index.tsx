import { useAuthStore } from "@/store/useAuthStore";
import { Href, Redirect } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const { token, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (token) {
    return <Redirect href={"/(main)" as Href} />;
  }

  return <Redirect href={"/(auth)/login" as Href} />;
}
