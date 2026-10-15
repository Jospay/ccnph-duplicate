import { CustomAlert } from "@/components/CustomAlert";
import { checkPaymentStatus } from "@/services/pointService";
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

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000; // stop polling after 10 minutes
const TIMEOUT_TITLE = "Still Waiting";

export default function PointsLoadQRPage() {
  const { qrUrl, paymentIntentId, amount, fee, totalCharged } =
    useLocalSearchParams();

  const router = useRouter();

  const pollingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasFinished = useRef(false);
  const isPolling = useRef(false);

  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState({
    visible: false,
    title: "",
    message: "",
  });

  const showAlert = (title: string, message: string) =>
    setAlert({ visible: true, title, message });

  const stopPolling = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  };

  // POLL PAYMENT STATUS
  useEffect(() => {
    if (!paymentIntentId) return;

    const startedAt = Date.now();

    pollingInterval.current = setInterval(async () => {
      if (hasFinished.current || isPolling.current) return;

      // Give up after the timeout so we don't poll forever
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        hasFinished.current = true;
        stopPolling();
        showAlert(
          TIMEOUT_TITLE,
          "We haven't received your payment yet. If you already paid, your points will be added automatically once it's confirmed.",
        );
        return;
      }

      isPolling.current = true;
      try {
        const res = await checkPaymentStatus(paymentIntentId as string);

        // 11 = paid (same status code used by the wallet load flow)
        if (Number(res?.status) === 11 && !hasFinished.current) {
          hasFinished.current = true;
          stopPolling();
          // Go straight to the success screen (no double confirmation)
          router.replace("/load-point/payment-success");
        }
      } catch {
      } finally {
        isPolling.current = false;
      }
    }, POLL_INTERVAL_MS);

    return stopPolling;
  }, [paymentIntentId]);

  const handleSaveQR = async () => {
    if (!qrUrl) return;

    try {
      setSaving(true);

      const fileUri =
        FileSystem.documentDirectory + `Points_Load_QR_${Date.now()}.png`;

      if ((qrUrl as string).startsWith("data:image")) {
        const base64Code = (qrUrl as string).split("base64,")[1];
        await FileSystem.writeAsStringAsync(fileUri, base64Code, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } else {
        const result = await FileSystem.downloadAsync(qrUrl as string, fileUri);
        if (result.status !== 200) throw new Error("Download failed");
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "image/png",
          dialogTitle: "Save or share your QR code",
        });
      } else {
        showAlert("Error", "Sharing is not available on this device.");
      }
    } catch {
      showAlert(
        "Error",
        "Could not save image. Try taking a screenshot instead.",
      );
    } finally {
      setSaving(false);
    }
  };

  const formatPesos = (value: any) =>
    Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const amountValue = Number(amount || 0);
  const feeValue = Number(fee || 0);
  const totalValue = totalCharged ? Number(totalCharged) : amountValue;

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
        <Text className="text-xl font-bold mb-2">Scan to Load Points</Text>

        {/* Big number = what the user actually pays */}
        <Text className="text-3xl text-primary font-bold mb-1">
          ₱ {formatPesos(totalValue)}
        </Text>
        <Text className="text-slate-400 text-xs mb-4">
          {formatPesos(amountValue)} pts will be added once paid
        </Text>

        {feeValue > 0 && (
          <View className="w-full max-w-[320px] bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 mb-6">
            <View className="flex-row justify-between mb-1">
              <Text className="text-slate-500 text-sm">Load Amount</Text>
              <Text className="text-slate-700 text-sm font-semibold">
                ₱ {formatPesos(amountValue)}
              </Text>
            </View>
            <View className="flex-row justify-between mb-1">
              <Text className="text-slate-500 text-sm">Processing Fee</Text>
              <Text className="text-slate-700 text-sm font-semibold">
                ₱ {formatPesos(feeValue)}
              </Text>
            </View>
            <View className="flex-row justify-between pt-1 border-t border-slate-200">
              <Text className="text-slate-600 text-sm font-semibold">
                Total to Scan/Pay
              </Text>
              <Text className="text-slate-900 text-sm font-bold">
                ₱ {formatPesos(totalValue)}
              </Text>
            </View>
          </View>
        )}

        {qrUrl ? (
          <View className="items-center">
            <View className="p-4 border-2 border-gray-100 rounded-[32px] bg-white shadow-sm mb-4">
              <Image
                source={{ uri: qrUrl as string }}
                style={{ width: 260, height: 260 }}
                resizeMode="contain"
              />
            </View>

            <TouchableOpacity
              onPress={handleSaveQR}
              disabled={saving}
              className="flex-row bg-blue items-center px-6 py-3 rounded-full mb-6"
            >
              {saving ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Ionicons name="download-outline" size={20} color="#000" />
              )}
              <Text className="font-bold ml-2 text-primary">
                {saving ? "Saving..." : "Save or Share QR"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ActivityIndicator size="large" />
        )}

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
          <View className="mt-2 pt-2 border-t border-gray-200 flex-row items-center">
            <ActivityIndicator size="small" color="#9ca3af" />
            <Text className="text-xs text-gray-400 italic ml-2">
              Waiting for payment confirmation...
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => {
            hasFinished.current = true;
            stopPolling();
            router.back();
          }}
          className="mt-10"
        >
          <Text className="text-gray-400 underline">Cancel Payment</Text>
        </TouchableOpacity>
      </ScrollView>

      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        onClose={() => {
          const wasTimeout = alert.title === TIMEOUT_TITLE;
          setAlert((prev) => ({ ...prev, visible: false }));
          if (wasTimeout) router.dismissAll();
        }}
      />
    </View>
  );
}
