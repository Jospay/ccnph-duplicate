import { CustomAlert } from "@/components/CustomAlert";
import { checkPaymentStatus } from "@/services/walletService";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function WalletLoadQRPage() {
  const { qrUrl, paymentIntentId, amount, fee, totalCharged } =
    useLocalSearchParams();

  const router = useRouter();

  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const hasShownSuccess = useRef(false);

  const [saving, setSaving] = useState(false);

  // =========================
  // ALERT STATE
  // =========================
  const [alert, setAlert] = useState({
    visible: false,
    title: "",
    message: "",
  });

  // =========================
  // ALERT HELPER
  // =========================
  const showAlert = (title: string, message: string) => {
    setAlert({
      visible: true,
      title,
      message,
    });
  };

  // =========================
  // POLLING
  // =========================
  useEffect(() => {
    if (!paymentIntentId) return;

    pollingInterval.current = setInterval(async () => {
      try {
        const res = await checkPaymentStatus(paymentIntentId as string);

        console.log("🔄 WALLET FULL RESPONSE:", res);

        const status = Number(res?.status);

        console.log("🔄 WALLET PARSED STATUS:", status);

        // PayMongo successful payment status
        const isSuccess = status === 11;

        if (isSuccess && !hasShownSuccess.current) {
          hasShownSuccess.current = true;

          if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
          }

          showAlert(
            "Wallet Loaded!",
            "Your payment was successful and your wallet has been loaded.",
          );
        }
      } catch (err) {
        console.log("Wallet payment polling error:", err, paymentIntentId);
      }
    }, 2000);

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    };
  }, [paymentIntentId]);

  // =========================
  // SAVE QR
  // =========================
  const handleSaveQR = async () => {
    if (!qrUrl) return;

    try {
      setSaving(true);

      const { status } = await MediaLibrary.requestPermissionsAsync();

      if (status !== "granted") {
        showAlert(
          "Permission Required",
          "Allow gallery access to save the QR.",
        );

        return;
      }

      const filename = `Wallet_Load_QR_${Date.now()}.png`;

      const fileUri = FileSystem.documentDirectory + filename;

      if ((qrUrl as string).startsWith("data:image")) {
        const base64Code = (qrUrl as string).split("base64,")[1];

        await FileSystem.writeAsStringAsync(fileUri, base64Code, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } else {
        const downloadResult = await FileSystem.downloadAsync(
          qrUrl as string,
          fileUri,
        );

        if (downloadResult.status !== 200) {
          throw new Error("Download failed");
        }
      }

      await MediaLibrary.saveToLibraryAsync(fileUri);

      showAlert("Saved!", "QR Code has been saved to your gallery.");
    } catch (error) {
      console.log("SAVE QR ERROR:", error);

      showAlert(
        "Error",
        "Could not save image. Try taking a screenshot instead.",
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // FORMAT AMOUNT
  // =========================
  const formatPesos = (value: any) =>
    Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const feeValue = Number(fee || 0);
  // Fall back to `amount` if totalCharged wasn't passed (e.g. old links) so
  // the page never breaks on a stale deep link — it just shows no fee row.
  const totalChargedValue = totalCharged
    ? Number(totalCharged)
    : Number(amount || 0);

  const formattedAmount = formatPesos(amount);
  const formattedFee = formatPesos(feeValue);
  const formattedTotal = formatPesos(totalChargedValue);

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{
          alignItems: "center",
          paddingVertical: 40,
          paddingHorizontal: 24,
          paddingBottom: 120,
        }}
      >
        {/* TITLE */}
        <Text className="text-xl font-bold mb-2">Scan to Load Wallet</Text>

        {/* AMOUNT TO BE CREDITED */}
        <Text className="text-primary text-3xl font-bold mb-1">
          ₱ {formattedAmount}
        </Text>
        <Text className="text-slate-400 text-xs mb-4">
          Will be credited to your wallet
        </Text>

        {/* FEE / TOTAL CHARGED BREAKDOWN */}
        {feeValue > 0 && (
          <View className="w-full max-w-[320px] bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 mb-6">
            <View className="flex-row justify-between mb-1">
              <Text className="text-slate-500 text-sm">Processing Fee</Text>
              <Text className="text-slate-700 text-sm font-semibold">
                ₱ {formattedFee}
              </Text>
            </View>
            <View className="flex-row justify-between pt-1 border-t border-slate-200">
              <Text className="text-slate-600 text-sm font-semibold">
                Total to Scan/Pay
              </Text>
              <Text className="text-slate-900 text-sm font-bold">
                ₱ {formattedTotal}
              </Text>
            </View>
          </View>
        )}

        {/* QR */}
        {qrUrl ? (
          <View className="items-center">
            <View className="p-4 border-2 border-gray-100 rounded-[32px] bg-white shadow-sm mb-4">
              <Image
                source={{
                  uri: qrUrl as string,
                }}
                style={{
                  width: 260,
                  height: 260,
                }}
                resizeMode="contain"
              />
            </View>

            {/* SAVE BUTTON */}
            <TouchableOpacity
              onPress={handleSaveQR}
              disabled={saving}
              className="flex-row items-center bg-primary/10 px-6 py-3 rounded-full mb-6"
            >
              {saving ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Ionicons name="download-outline" size={20} color="#000" />
              )}

              <Text className="text-primary font-bold ml-2">
                {saving ? "Saving..." : "Save to Gallery"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ActivityIndicator size="large" />
        )}

        {/* INFO */}
        <View className="bg-gray-50 p-5 rounded-2xl w-full border border-gray-100 mt-4">
          <Text className="text-gray-800 font-bold mb-3">
            Easy Payment Steps:
          </Text>

          <Text className="text-gray-600 mb-2">
            1. Save this QR or take a screenshot.
          </Text>

          <Text className="text-gray-600 mb-2">
            2. Open GCash, Maya, or your Bank App.
          </Text>

          <Text className="text-gray-600 mb-2">
            3. Select Scan QR and upload this image.
          </Text>

          <View className="mt-2 pt-2 border-t border-gray-200">
            <Text className="text-xs text-gray-400 italic">
              Waiting for wallet load confirmation...
            </Text>
          </View>
        </View>

        {/* CANCEL */}
        <TouchableOpacity
          onPress={() => {
            if (pollingInterval.current) {
              clearInterval(pollingInterval.current);
              pollingInterval.current = null;
            }

            router.back();
          }}
          className="mt-10"
        >
          <Text className="text-gray-400 underline">Cancel Payment</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* CUSTOM ALERT */}
      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        onClose={() => {
          const isSuccess = alert.title === "Wallet Loaded!";

          setAlert((prev) => ({
            ...prev,
            visible: false,
          }));

          if (isSuccess) {
            router.replace("/(load)/payment-success");
          }
        }}
      />
    </View>
  );
}
