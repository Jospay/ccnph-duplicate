import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

export default function CheckoutSuccessPage() {
  const { checkoutNumber, amount, method } = useLocalSearchParams();
  const router = useRouter();

  const pick = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  const ref = pick(checkoutNumber);
  const methodName = pick(method);
  const total = Number(pick(amount) || 0);

  return (
    <View className="flex-1 bg-white p-6 items-center justify-center">
      <View className="bg-green-100 p-6 rounded-full mb-6">
        <Ionicons name="checkmark-done-circle" size={80} color="#22c55e" />
      </View>

      <Text className="text-3xl font-black text-slate-800 text-center">
        Payment Successful!
      </Text>

      <Text className="text-slate-500 text-center mt-4 mb-6 px-6">
        Your payment was received and your order has been placed. The seller
        will start preparing it shortly.
      </Text>

      {(total > 0 || ref) && (
        <View className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-10">
          {total > 0 && (
            <View className="flex-row justify-between mb-2">
              <Text className="text-slate-500">Amount Paid</Text>
              <Text className="font-bold text-slate-800">
                ₱
                {total.toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
          )}
          {!!methodName && (
            <View className="flex-row justify-between mb-2">
              <Text className="text-slate-500">Payment Method</Text>
              <Text className="font-medium text-slate-700">{methodName}</Text>
            </View>
          )}
          {!!ref && (
            <View className="flex-row justify-between">
              <Text className="text-slate-500">Reference</Text>
              <Text className="font-medium text-slate-700">{ref}</Text>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity
        onPress={() => router.replace("/order-list")}
        className="w-full p-5 rounded-2xl bg-primary"
      >
        <Text className="text-white text-center font-bold text-lg">
          View My Orders
        </Text>
      </TouchableOpacity>
    </View>
  );
}
