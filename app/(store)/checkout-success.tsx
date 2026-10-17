import PaymentBreakdownCard from "@/components/PaymentBreakdownCard";
import {
  CheckoutPaymentStatusResponse,
  getCheckoutPaymentStatus,
} from "@/services/checkout";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type PaymentData = CheckoutPaymentStatusResponse["data"];

const pick = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

const fmt = (n: number) =>
  Number(n || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function CheckoutSuccessPage() {
  const { checkoutId, checkoutNumber, amount, method } = useLocalSearchParams();
  const router = useRouter();

  const id = pick(checkoutId);
  const [data, setData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState<boolean>(!!id);

  // load the full receipt (items total, discounts, shipping, fee) from the backend
  useEffect(() => {
    if (!id) return;

    let active = true;
    (async () => {
      try {
        const res = await getCheckoutPaymentStatus(id);
        if (active) setData(res.data);
      } catch {
        // fall back to the params below
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [id]);

  const ref = data?.checkout_number ?? pick(checkoutNumber);
  const methodName = data?.method ?? pick(method);
  const total = Number(data?.amount ?? pick(amount) ?? 0);
  const breakdown = data?.breakdown;

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
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

      {loading ? (
        <ActivityIndicator size="small" color="#3E4093" className="mb-10" />
      ) : (
        (total > 0 || !!ref) && (
          <View className="w-full mb-10">
            {breakdown ? (
              <PaymentBreakdownCard
                breakdown={breakdown}
                totalLabel="Total Paid"
              />
            ) : (
              total > 0 && (
                <View className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4">
                  <View className="flex-row justify-between">
                    <Text className="text-slate-500">Amount Paid</Text>
                    <Text className="font-bold text-slate-800">
                      ₱{fmt(total)}
                    </Text>
                  </View>
                </View>
              )
            )}

            {(!!methodName || !!ref) && (
              <View className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 mt-3">
                {!!methodName && (
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-slate-500">Payment Method</Text>
                    <Text className="font-medium text-slate-700">
                      {methodName}
                    </Text>
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
          </View>
        )
      )}

      <TouchableOpacity
        onPress={() => router.replace("/order-list")}
        className="w-full p-5 rounded-2xl bg-primary"
      >
        <Text className="text-white text-center font-bold text-lg">
          View My Orders
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
