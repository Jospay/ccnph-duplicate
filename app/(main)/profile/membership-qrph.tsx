import { CustomAlert } from "@/components/CustomAlert";
import { checkMembershipPaymentStatus } from "@/services/membershipService";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function QRPaymentPage() {
  const { qrUrl, paymentIntentId, amount, fee, totalCharged } =
    useLocalSearchParams();

  const router = useRouter();

  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  const hasShownSuccess = useRef(false);

  const [saving, setSaving] = useState(false);

  // ALERT STATE
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
        const res = await checkMembershipPaymentStatus(
          paymentIntentId as string,
        );

        console.log("🔄 FULL RESPONSE:", res);

        const status = Number(res?.status);

        console.log("🔄 PARSED STATUS:", status);

        const isSuccess = status === 11;

        if (isSuccess && !hasShownSuccess.current) {
          hasShownSuccess.current = true;

          if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
          }

          showAlert("Success", "Payment successful!");
        }
      } catch (err) {
        console.log("Polling error:", err, paymentIntentId);
      }
    }, 2000);

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [paymentIntentId]);

  // =========================
  // SAVE / SHARE QR
  // =========================
  const handleSaveQR = async () => {
    if (!qrUrl) return;

    try {
      setSaving(true);

      const filename = `QR_${Date.now()}.png`;

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

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "image/png",
          dialogTitle: "Save or share your QR code",
        });
      } else {
        showAlert("Error", "Sharing is not available on this device.");
      }
    } catch (error) {
      console.log("SAVE ERROR:", error);

      showAlert("Error", "Could not save image. Try screenshot instead.");
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
        <Text className="text-xl font-bold mb-2">Scan to Pay</Text>

        {/* AMOUNT */}
        <Text className="text-primary text-3xl font-bold mb-1">
          ₱ {formattedAmount}
        </Text>
        <Text className="text-slate-400 text-xs mb-4">
          Membership payment amount
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
                source={{ uri: qrUrl as string }}
                style={{ width: 260, height: 260 }}
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
                {saving ? "Saving..." : "Save or Share QR"}
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
              Waiting for payment confirmation...
            </Text>
          </View>
        </View>

        {/* BACK */}
        <TouchableOpacity onPress={() => router.back()} className="mt-10">
          <Text className="text-gray-400 underline">Cancel Payment</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* CUSTOM ALERT */}
      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        onClose={() => {
          const isSuccess =
            alert.title === "Success" &&
            alert.message === "Payment successful!";

          setAlert({
            ...alert,
            visible: false,
          });

          if (isSuccess) {
            router.replace("/(main)");
          }
        }}
      />
    </View>
  );
}
