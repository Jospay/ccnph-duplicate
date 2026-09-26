import { usePathname, useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import "../../global.css";

/**
 * Props Definition:
 * onNavigating: Function to update the parent's 'navigating' state
 * isNavigating: The current state shared with the LoginPage
 */
interface LinkAuthProps {
  onNavigating: (val: boolean) => void;
  isNavigating: boolean;
}

export default function AuthNavigationButton({
  onNavigating,
  isNavigating,
}: LinkAuthProps) {
  const router = useRouter();
  const pathname = usePathname();

  const registrationFlowPaths = ["/register", "/otpSend", "/otpVerification"];

  const isRegisterFlow = registrationFlowPaths.includes(pathname);

  const handleButtonNavigation = () => {
    onNavigating(true);

    const targetRoute = isRegisterFlow ? "/login" : "/register";
    router.push(targetRoute);

    setTimeout(() => {
      onNavigating(false);
    }, 1500);
  };

  return (
    <View className="flex-row justify-center mt-2">
      <TouchableOpacity
        onPress={handleButtonNavigation}
        disabled={isNavigating}
        activeOpacity={0.7}
        className="flex-row items-center justify-center py-2 h-10"
      >
        {isNavigating ? (
          <View className="flex-row items-center gap-x-2">
            <ActivityIndicator size="small" color="#034194" />
            <Text className="text-primary font-bold text-lg italic">
              Loading...
            </Text>
          </View>
        ) : (
          <Text className="text-primary text-lg font-bold">
            {isRegisterFlow ? "Back to Login" : "Create New Account?"}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
