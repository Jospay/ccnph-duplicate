import { CustomAlert } from "@/components/CustomAlert";
import { checkPaymentStatus } from "@/services/loanService";
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

export default function QRPaymentPage() {
  const { qrUrl, paymentIntentId, amount } = useLocalSearchParams();
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
        const res = await checkPaymentStatus(paymentIntentId as string);

        console.log("🔄 FULL RESPONSE:", res);

        const rawStatus = res?.status;
        const status = Number(rawStatus);

        console.log("🔄 PARSED STATUS:", status);

        const isSuccess = status === 11;

        if (isSuccess && !hasShownSuccess.current) {
          hasShownSuccess.current = true;

          clearInterval(pollingInterval.current!);

          showAlert("Success", "Payment successful!");
        }
      } catch (err) {
        console.log("❌ Polling error:", err);
      }
    }, 2000);

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
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

      const filename = `LOAN_QR_${Date.now()}.png`;
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

      showAlert("Saved!", "QR Code saved to your gallery.");
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
  const formatAmount = (value: any) => {
    const num = Number(String(value).replace(/,/g, ""));

    if (isNaN(num)) return "0.00";

    return num.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // =========================
  // UI
  // =========================
  return (
    <>
      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{
          alignItems: "center",
          paddingVertical: 40,
          paddingHorizontal: 24,
        }}
      >
        {/* TITLE */}
        <Text className="text-xl font-bold mb-2">Scan to Pay</Text>

        {/* AMOUNT */}
        {amount && (
          <Text className="text-primary text-2xl font-bold mb-6">
            ₱ {formatAmount(amount)}
          </Text>
        )}

        {/* QR CARD */}
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
                {saving ? "Saving..." : "Save to Gallery"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ActivityIndicator size="large" />
        )}

        {/* INFO BOX */}
        <View className="bg-gray-50 p-5 rounded-2xl w-full border border-gray-100 mt-4">
          <Text className="text-gray-800 font-bold mb-3">
            Easy Payment Steps:
          </Text>

          <Text className="text-gray-600 mb-2">
            1. Save this QR or take a screenshot.
          </Text>

          <Text className="text-gray-600 mb-2">
            2. Open GCash, Maya, or Bank App.
          </Text>

          <Text className="text-gray-600 mb-2">
            3. Scan QR to pay your loan.
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
          setAlert({
            ...alert,
            visible: false,
          });

          // REDIRECT AFTER SUCCESS CLOSE
          if (alert.title === "Success") {
            router.replace("/(main)");
          }
        }}
      />
    </>
  );
}
