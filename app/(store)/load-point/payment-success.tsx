import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

export default function PointsPaymentSuccessPage() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-white p-6 items-center justify-center">
      <View className="bg-green-100 p-6 rounded-full mb-6">
        <Ionicons name="checkmark-done-circle" size={80} color="#22c55e" />
      </View>

      <Text className="text-3xl font-black text-slate-800 text-center">
        Points Loaded Successfully!
      </Text>

      <Text className="text-slate-500 text-center mt-4 mb-10 px-6">
        Your points have been added to your balance and are ready to use in the
        CCNPH Online Store.
      </Text>

      {/* Navigate to the store profile */}
      <TouchableOpacity
        onPress={() => router.replace("/(store)/profile")}
        className="w-full p-5 rounded-2xl bg-primary"
      >
        <Text className="text-white text-center font-bold text-lg">
          Back to Profile
        </Text>
      </TouchableOpacity>
    </View>
  );
}
