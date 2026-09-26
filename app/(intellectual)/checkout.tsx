import { payIntellectual } from "@/services/intellectualService";
import { getPaymentMethods } from "@/services/loanService";
import { PaymentMethod } from "@/types/loan.types";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

export default function IntellectualCheckoutPage() {
  const { id, scheduleId, amount } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const [navigating, setNavigating] = useState(false);
  const isProcessing = useRef(false);

  useFocusEffect(
    useCallback(() => {
      setLoading(false);
      setNavigating(false);
      isProcessing.current = false;
    }, []),
  );

  const formatAmount = (value: any) => {
    const num = Number(value);
    return isNaN(num)
      ? "0.00"
      : num.toLocaleString("en-PH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  };

  useEffect(() => {
    const loadMethods = async () => {
      try {
        const res = await getPaymentMethods();
        const list = Array.isArray(res?.data) ? res.data : [];
        const formatted = list
          .map((item: any) => ({
            id: item?.id,
            name: item?.attributes?.name,
            gateway_type: (item?.attributes?.gateway_type || "").toLowerCase(),
          }))
          .filter((m: any) =>
            ["qrph", "paymaya", "grab_pay"].includes(m.gateway_type),
          );

        setMethods(formatted);
        if (formatted.length > 0) setSelectedMethod(formatted[0]);
      } catch (err) {
        console.log("❌ Failed to load methods", err);
      }
    };
    loadMethods();
  }, []);

  const handleProceed = async () => {
    if (isProcessing.current || navigating || loading) return;

    if (!selectedMethod) {
      Alert.alert("Error", "Please select a payment method");
      return;
    }

    isProcessing.current = true;
    setLoading(true);
    setNavigating(true);

    try {
      const response = await payIntellectual(Number(scheduleId), {
        payment_method_id: selectedMethod.id,
      });

      const nextAction = response?.next_action;
      const url = nextAction?.redirect_url;
      const qr = nextAction?.qr_code_url;

      if (url) {
        setCheckoutUrl(url);
      } else if (qr) {
        router.push({
          pathname: "/qrph",
          params: {
            qrUrl: qr,
            paymentIntentId: response?.payment?.gateway_payment_intent_id,
          },
        });
      } else {
        router.replace("/congratulations");
      }
    } catch (error: any) {
      setLoading(false);
      setNavigating(false);
      isProcessing.current = false;
      Alert.alert(
        "Payment Failed",
        error?.response?.data?.message || "Failed to process payment",
      );
    }
  };

  if (checkoutUrl) {
    return (
      <WebView
        source={{ uri: checkoutUrl }}
        style={{ flex: 1 }}
        onNavigationStateChange={(nav) => {
          if (nav.url.includes("payment/success")) {
            router.replace("/congratulations");
          }
        }}
      />
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        <View className="bg-white rounded-3xl p-6 mb-6 shadow-sm">
          <Text className="text-slate-400 text-xs font-bold uppercase">
            Registration Fee
          </Text>
          <Text className="text-primary text-3xl font-black mt-1">
            ₱{formatAmount(amount)}
          </Text>
        </View>

        <Text className="font-semibold text-gray-800 mb-3 px-1">
          Select Payment Method
        </Text>

        {methods.map((m) => (
          <TouchableOpacity
            key={m.id}
            onPress={() => !navigating && setSelectedMethod(m)}
            disabled={navigating}
            className={`p-4 mb-3 rounded-xl border ${selectedMethod?.id === m.id ? "border-primary bg-blue" : "border-gray-200 bg-white"}`}
          >
            <Text className="font-semibold text-gray-900">{m.name}</Text>
            <Text className="text-xs text-gray-500 mt-1 uppercase">
              {m.gateway_type}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View className="absolute bottom-0 w-full p-5 bg-white border-t border-slate-200">
        <TouchableOpacity
          onPress={handleProceed}
          disabled={loading || navigating}
          className={`h-16 rounded-2xl justify-center items-center ${loading || navigating ? "bg-slate-300" : "bg-primary"}`}
        >
          {loading || navigating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-center font-bold text-lg">
              Pay Now
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
