import { CustomAlert } from "@/components/CustomAlert";
import { checkPaymentStatus } from "@/services/loanService";
import { Ionicons } from "@expo/vector-icons";

// Use the legacy import to stop the warnings and fix the "undefined" errors
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

export default function SharedQRPaymentPage() {
  const { qrUrl, paymentIntentId, shareCapitalId, amount } =
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
        const res = await checkPaymentStatus(paymentIntentId as string);

        console.log("🔄 FULL RESPONSE:", res);

        // DIRECT STATUS ACCESS
        const rawStatus = res?.status;

        const status = Number(rawStatus);

        console.log("🔄 PARSED STATUS:", status);

        // SUCCESS STATUS
        const isSuccess = status === 11;

        if (isSuccess && !hasShownSuccess.current) {
          hasShownSuccess.current = true;

          if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
          }

          showAlert("Success", "Payment confirmed!");
        }
      } catch (err) {
        console.log("Polling error:", err, "PAYMENT INTENT:", paymentIntentId);
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

      const filename = `QR_${Date.now()}.png`;

      const fileUri = FileSystem.documentDirectory + filename;

      // BASE64 IMAGE
      if ((qrUrl as string).startsWith("data:image")) {
        const base64Code = (qrUrl as string).split("base64,")[1];

        await FileSystem.writeAsStringAsync(fileUri, base64Code, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } else {
        // NORMAL URL IMAGE
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
      console.log("SAVE ERROR:", error);

      showAlert("Error", "Could not save image. Try taking a screenshot.");
    } finally {
      setSaving(false);
    }
  };

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
        {/* TOTAL */}
        <View className="items-center mb-6">
          <Text className="text-gray-500 text-base mb-1">Total Payment</Text>

          <Text className="text-primary text-3xl font-bold">
            ₱{" "}
            {Number(amount || 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </Text>
        </View>

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
              className="flex-row items-center bg-primary/10 px-6 py-3 rounded-full mb-8"
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
          <ActivityIndicator size="large" className="h-64" />
        )}

        {/* INFO BOX */}
        <View className="bg-gray-50 p-5 rounded-2xl w-full border border-gray-100">
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

        {/* CANCEL */}
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

          if (alert.title === "Success") {
            router.replace("/(main)");
          }
        }}
      />
    </>
  );
}
