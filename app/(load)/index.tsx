import { CustomAlert } from "@/components/CustomAlert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  calculateLoadFee,
  getLoadConfig,
  getWalletBalance,
  LoadConfig,
} from "@/services/walletService";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import "../../global.css";

const DEFAULT_MIN = 1.0;

export default function WalletPage() {
  const router = useRouter();

  // STATES
  const [pageLoading, setPageLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [walletBalance, setWalletBalance] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadConfig, setLoadConfig] = useState<LoadConfig | null>(null);

  // Tamper Alert State
  const [tamperAlert, setTamperAlert] = useState({
    visible: false,
    title: "",
    message: "",
  });

  // FETCH LIVE WALLET BALANCE + DYNAMIC LOAD CONFIG
  const fetchWalletData = useCallback(async () => {
    try {
      setPageLoading(true);

      const [balanceRes, configRes] = await Promise.all([
        getWalletBalance(),
        getLoadConfig().catch(() => null), // don't block the page if config fails
      ]);

      // Type assertion for response data
      const responseData = balanceRes?.data as {
        balance?: string;
        is_tampered?: boolean;
        message?: string;
      };

      const balanceStr = responseData?.balance || "0";
      setWalletBalance(parseFloat(balanceStr));

      if (configRes?.data) {
        setLoadConfig(configRes.data);
      }

      if (responseData?.is_tampered) {
        setTamperAlert({
          visible: true,
          title: "Security Notice",
          message:
            responseData.message ||
            "Your wallet balance integrity check failed. Please contact support.",
        });
      }
    } catch {
      Alert.alert(
        "Error",
        "Could not fetch wallet data. Please check your connection.",
      );
    } finally {
      setPageLoading(false);
    }
  }, []);

  // Re-fetch balance whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchWalletData();
    }, [fetchWalletData]),
  );

  // FORMAT INPUT
  const handleChange = (value: string) => {
    const raw = value.replace(/[^0-9]/g, "");
    if (raw) {
      setAmount(parseInt(raw, 10).toLocaleString());
    } else {
      setAmount("");
    }
  };

  const cleanAmount = parseFloat(amount.replace(/,/g, "") || "0");

  const minRecharge = loadConfig?.min_recharge ?? DEFAULT_MIN;

  const loadFee = loadConfig?.fee
    ? calculateLoadFee(cleanAmount, loadConfig.fee)
    : 0;

  const totalToPay = cleanAmount + loadFee;

  // VALIDATION AGAINST DYNAMIC BACKEND RULE
  const isValid = cleanAmount >= minRecharge;

  // SUBMIT (LOAD WALLET → CHECKOUT)
  const handleProceed = () => {
    if (!isValid) {
      Alert.alert(
        "Invalid Amount",
        `Minimum load amount is ₱${minRecharge.toFixed(2)}.`,
      );
      return;
    }

    setIsProcessing(true);

    router.push({
      pathname: "/(load)/checkout",
      params: {
        amount: cleanAmount.toString(),
        type: "wallet_load",
      },
    });

    setIsProcessing(false);
  };

  // HANDLE TAMPER ALERT CLOSE & REDIRECT TO HOME
  const handleCloseTamperAlert = () => {
    setTamperAlert((prev) => ({ ...prev, visible: false }));
    router.replace("./(home)");
  };

  // LOADING UI
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
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="items-center py-10 px-6 w-full max-w-[600px] mx-auto">
          <View className="mx-5 pb-10 max-w-[500px] w-full self-center">
            {/* CURRENT BALANCE */}
            <View className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
              <Text className="text-slate-500 text-xs uppercase mb-2">
                Current Wallet Balance
              </Text>
              <Text className="text-primary text-3xl font-bold">
                ₱
                {walletBalance.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>

            {/* INPUT AMOUNT */}
            <View className="flex-row items-center border-b-2 border-primary w-full py-2 justify-center">
              <Text className="text-primary text-3xl font-bold mr-2">₱</Text>
              <TextInput
                value={amount}
                onChangeText={handleChange}
                keyboardType="numeric"
                placeholder="Enter load amount"
                className="text-primary text-3xl font-bold flex-1"
              />
            </View>

            <Text className="p-1 text-xs text-slate-400 mt-1">
              Minimum load is ₱{minRecharge.toFixed(2)} (Processed via secure
              gateway)
            </Text>

            {/* SUMMARY */}
            <View className="mt-8 border border-slate-200 rounded-xl p-4 bg-white">
              <Text className="text-xs text-slate-500 mb-2">Load Summary</Text>

              <View className="flex-row justify-between mb-2">
                <Text className="text-slate-600">Load Amount</Text>
                <Text className="font-bold text-primary">
                  ₱
                  {cleanAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>

              {loadFee > 0 && (
                <View className="flex-row justify-between mb-2">
                  <Text className="text-slate-600">Processing Fee</Text>
                  <Text className="font-bold text-slate-700">
                    ₱
                    {loadFee.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </View>
              )}

              {loadFee > 0 && (
                <View className="flex-row justify-between mb-2 pt-2 border-t border-slate-100">
                  <Text className="text-slate-600">Total to Pay</Text>
                  <Text className="font-bold text-slate-800">
                    ₱
                    {totalToPay.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </View>
              )}

              <View className="flex-row justify-between">
                <Text className="text-slate-600">New Balance After Load</Text>
                <Text className="font-bold">
                  ₱
                  {(walletBalance + cleanAmount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* FOOTER */}
      <View className="w-full p-5 bg-white border-t border-slate-200">
        <TouchableOpacity
          onPress={handleProceed}
          disabled={!isValid || isProcessing}
          className={`h-16 rounded-2xl justify-center items-center ${
            !isValid || isProcessing ? "bg-slate-300" : "bg-primary"
          }`}
        >
          {isProcessing ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">
              Proceed to Payment
            </Text>
          )}
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
