import { CustomAlert } from "@/components/CustomAlert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  calculatePointFee,
  getPointBalance,
  getPointConfig,
  PointConfig,
} from "@/services/pointService";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import "../../../global.css";

const DEFAULT_MIN = 100;
const MAX_DIGITS = 9;

export default function LoadPointsPage() {
  const router = useRouter();

  const [pageLoading, setPageLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [points, setPoints] = useState(0);
  const [config, setConfig] = useState<PointConfig | null>(null);

  // Tamper Alert State
  const [tamperAlert, setTamperAlert] = useState({
    visible: false,
    title: "",
    message: "",
  });

  const fetchData = useCallback(async () => {
    try {
      setPageLoading(true);

      const [balanceRes, configRes] = await Promise.all([
        getPointBalance(),
        getPointConfig().catch(() => null),
      ]);

      setPoints(parseFloat(balanceRes?.data?.balance || "0"));

      if (configRes?.data) setConfig(configRes.data);

      if (balanceRes?.data?.is_tampered) {
        setTamperAlert({
          visible: true,
          title: "Security Notice",
          message:
            balanceRes.data.message ||
            "Your points balance integrity check failed. Please contact support.",
        });
      }
    } catch {
      Alert.alert(
        "Error",
        "Could not fetch your points. Please check your connection.",
      );
    } finally {
      setPageLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const handleChange = (value: string) => {
    const raw = value.replace(/[^0-9]/g, "").slice(0, MAX_DIGITS);
    // Fixed locale so the separator is always "," and parsing below never breaks
    setAmount(raw ? parseInt(raw, 10).toLocaleString("en-US") : "");
  };

  const cleanAmount = parseFloat(amount.replace(/,/g, "") || "0");
  const minLoad = config?.min_load ?? DEFAULT_MIN;
  const rate = 1; // ₱1 = 1 point

  const fee = config?.fee ? calculatePointFee(cleanAmount, config.fee) : 0;
  const totalToPay = cleanAmount + fee;
  const pointsToReceive = cleanAmount * rate;
  const isValid = cleanAmount >= minLoad;
  const showMinError = cleanAmount > 0 && !isValid;

  const fmt = (n: number) =>
    n.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const handleProceed = () => {
    if (!isValid) {
      Alert.alert(
        "Invalid Amount",
        `Minimum load amount is ₱${minLoad.toFixed(2)}.`,
      );
      return;
    }

    router.push({
      pathname: "/load-point/checkout",
      params: { amount: cleanAmount.toString() },
    });
  };

  const handleCloseTamperAlert = () => {
    setTamperAlert((prev) => ({ ...prev, visible: false }));
    router.back();
  };

  if (pageLoading) {
    return (
      <View className="flex-1 bg-white p-5 pt-20">
        <Skeleton className="h-10 w-3/4 self-center mb-4" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center py-10 px-6 w-full max-w-[600px] mx-auto">
          <View className="mx-5 pb-10 max-w-[500px] w-full self-center">
            {/* CURRENT POINTS */}
            <View className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
              <Text className="text-slate-500 text-xs uppercase mb-2">
                Current Points
              </Text>
              <Text className=" text-primary text-3xl font-bold">
                {fmt(points)} pts
              </Text>
            </View>

            {/* AMOUNT INPUT */}
            <View
              style={{ borderColor: showMinError ? "#ef4444" : "#3E4093" }}
              className="flex-row items-center border-b-2 w-full py-2 justify-center"
            >
              <Text className="text-3xl text-primary font-bold mr-2">₱</Text>
              <TextInput
                value={amount}
                onChangeText={handleChange}
                keyboardType="number-pad"
                placeholder="Enter amount"
                returnKeyType="done"
                className="text-3xl font-bold flex-1 text-primary"
              />
            </View>

            {showMinError ? (
              <Text className="p-1 text-xs text-red-500 mt-1">
                Minimum load is ₱{minLoad.toFixed(2)}.
              </Text>
            ) : (
              <Text className="p-1 text-xs text-slate-400 mt-1">
                Minimum load is ₱{minLoad.toFixed(2)} · ₱1.00 = 1 point
                (Processed via secure gateway)
              </Text>
            )}

            {/* SUMMARY */}
            <View className="mt-8 border border-slate-200 rounded-xl p-4 bg-white">
              <Text className="text-xs text-slate-500 mb-2">Load Summary</Text>

              <View className="flex-row justify-between mb-2">
                <Text className="text-slate-600">Points to Receive</Text>
                <Text className="text-priamry font-bold">
                  {fmt(pointsToReceive)} pts
                </Text>
              </View>

              {fee > 0 && (
                <>
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-slate-600">Processing Fee</Text>
                    <Text className="font-bold text-slate-700">
                      ₱{fmt(fee)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between mb-2 pt-2 border-t border-slate-100">
                    <Text className="text-slate-600">Total to Pay</Text>
                    <Text className="font-bold text-slate-800">
                      ₱{fmt(totalToPay)}
                    </Text>
                  </View>
                </>
              )}

              <View className="flex-row justify-between">
                <Text className="text-slate-600">New Points Balance</Text>
                <Text className="font-bold">
                  {fmt(points + pointsToReceive)} pts
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="w-full p-5 bg-white border-t border-slate-200">
        <TouchableOpacity
          onPress={handleProceed}
          disabled={!isValid}
          className={`h-16 rounded-2xl justify-center items-center ${
            !isValid ? "bg-slate-300" : "bg-primary"
          }`}
        >
          <Text className="text-white font-bold text-lg">
            Proceed to Payment
          </Text>
        </TouchableOpacity>
      </View>

      {/* TAMPER DETECTED CUSTOM ALERT */}
      <CustomAlert
        visible={tamperAlert.visible}
        title={tamperAlert.title}
        message={tamperAlert.message}
        onClose={handleCloseTamperAlert}
      />
    </View>
  );
}
