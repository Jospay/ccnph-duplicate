import { CustomAlert } from "@/components/CustomAlert";
import {
  cancelCheckoutPayment,
  CheckoutPaymentStatusResponse,
  getCheckoutPaymentStatus,
} from "@/services/checkout";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

type PaymentData = CheckoutPaymentStatusResponse["data"];

export default function CheckoutPaymentPage() {
  const { checkoutId, total } = useLocalSearchParams();
  const router = useRouter();
  const id = Array.isArray(checkoutId) ? checkoutId[0] : checkoutId;

  const [data, setData] = useState<PaymentData | null>(null);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [alert, setAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onClose: () => void;
  }>({ visible: false, title: "", message: "", onClose: () => {} });

  const hasFinished = useRef(false);
  const isPolling = useRef(false);
  const isCancelling = useRef(false);

  const showAlert = (title: string, message: string, onClose: () => void) =>
    setAlert({
      visible: true,
      title,
      message,
      onClose: () => {
        setAlert((p) => ({ ...p, visible: false }));
        onClose();
      },
    });

  // Payment confirmed -> success screen (same idea as the points load flow)
  const goToSuccess = (d: PaymentData) => {
    router.replace({
      pathname: "/(store)/checkout-success",
      params: {
        checkoutNumber: d.checkout_number ?? "",
        amount: String(d.amount ?? 0),
        method: d.method ?? "",
      },
    });
  };

  const checkStatus = useCallback(async () => {
    if (!id || hasFinished.current || isPolling.current) return;

    isPolling.current = true;
    try {
      const res = await getCheckoutPaymentStatus(id);
      const d = res.data;
      setData(d);

      if (d.status === "paid" && !hasFinished.current) {
        hasFinished.current = true;
        goToSuccess(d);
      } else if (d.status === "failed" && !hasFinished.current) {
        hasFinished.current = true;
        showAlert(
          "Payment Failed",
          "Your payment was not completed. Please try again or choose another payment method.",
          () => router.back(),
        );
      }
    } catch {
      // transient network error, the next poll will retry
    } finally {
      isPolling.current = false;
    }
  }, [id]);

  // Poll the backend. The backend asks PayMongo directly, so this confirms the
  // payment even when the webhook can't reach the server (local development).
  useEffect(() => {
    const startedAt = Date.now();
    checkStatus();

    const timer = setInterval(() => {
      if (hasFinished.current) return;

      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        hasFinished.current = true;
        clearInterval(timer);
        showAlert(
          "Still Waiting",
          "We haven't received your payment yet. If you already paid, your order will show up in your orders once it's confirmed.",
          () => router.replace("/order-list"),
        );
        return;
      }

      checkStatus();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [checkStatus]);

  // Back from the GCash / Maya / bank app after scanning the QR: confirm right away
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") checkStatus();
    });
    return () => sub.remove();
  }, [checkStatus]);

  const handleCancel = async () => {
    if (isCancelling.current) return;

    isCancelling.current = true;
    setCancelling(true);
    hasFinished.current = true;

    try {
      if (id) await cancelCheckoutPayment(id);
      router.back();
    } catch (error: any) {
      const httpStatus = error?.response?.status;

      if (httpStatus === 422) {
        // the backend found the payment already went through: confirm instead of leaving
        hasFinished.current = false;
        await checkStatus();
        return;
      }

      if (httpStatus === 403 || httpStatus === 404) {
        router.back();
        return;
      }

      // could not verify / cancel: stay here and keep checking
      hasFinished.current = false;
      showAlert(
        "Unable to Cancel",
        error?.response?.data?.message ||
          "We could not cancel your payment right now. Please try again.",
        () => {},
      );
    } finally {
      isCancelling.current = false;
      setCancelling(false);
    }
  };

  // Android back button behaves like "Cancel" so the reserved stock is released
  const cancelRef = useRef(handleCancel);
  cancelRef.current = handleCancel;

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      cancelRef.current();
      return true;
    });
    return () => sub.remove();
  }, []);

  const handleSaveQR = async () => {
    const qr = data?.qr_image;
    if (!qr) return;

    try {
      setSaving(true);
      const fileUri =
        FileSystem.documentDirectory + `Order_QR_${Date.now()}.png`;

      if (qr.startsWith("data:image")) {
        await FileSystem.writeAsStringAsync(fileUri, qr.split("base64,")[1], {
          encoding: FileSystem.EncodingType.Base64,
        });
      } else {
        const result = await FileSystem.downloadAsync(qr, fileUri);
        if (result.status !== 200) throw new Error("Download failed");
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "image/png",
          dialogTitle: "Save or share your QR code",
        });
      }
    } catch {
      showAlert(
        "Error",
        "Could not save image. Try taking a screenshot instead.",
        () => {},
      );
    } finally {
      setSaving(false);
    }
  };

  const fmtPeso = (value: number) =>
    Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // amount = order total + processing fee (what the user actually pays)
  const amount = fmtPeso(Number(data?.amount ?? total ?? 0));
  const feeValue = Number(data?.fee ?? 0);
  const orderTotalLabel = fmtPeso(Number(data?.order_total ?? 0));

  const alertModal = (
    <CustomAlert
      visible={alert.visible}
      title={alert.title}
      message={alert.message}
      onClose={alert.onClose}
    />
  );

  // swipe-back / header back would leave an unpaid checkout holding stock
  const lockBack = (
    <Stack.Screen
      options={{ gestureEnabled: false, headerBackVisible: false }}
    />
  );

  // MAYA / BILLEASE / GRABPAY: gateway page
  if (data?.status === "pending" && data.redirect_url) {
    return (
      <View className="flex-1 bg-white">
        {lockBack}
        <WebView
          source={{ uri: data.redirect_url }}
          style={{ flex: 1 }}
          startInLoadingState
          onNavigationStateChange={(nav) => {
            // back from the gateway: confirm right away instead of waiting for the next poll
            if (nav.url.includes("payment/success")) checkStatus();
          }}
        />
        <TouchableOpacity
          onPress={handleCancel}
          disabled={cancelling}
          className="absolute top-12 right-4 bg-white/90 px-4 py-2 rounded-full border border-slate-200"
        >
          <Text className="text-slate-700 font-semibold">
            {cancelling ? "Cancelling..." : "Cancel"}
          </Text>
        </TouchableOpacity>
        {alertModal}
      </View>
    );
  }

  // QR CODE
  if (data?.status === "pending" && data.qr_image) {
    return (
      <View className="flex-1 bg-white">
        {lockBack}
        <ScrollView
          contentContainerStyle={{
            alignItems: "center",
            paddingVertical: 40,
            paddingHorizontal: 24,
            paddingBottom: 120,
          }}
        >
          <Text className="text-xl font-bold mb-2">Scan to Pay Your Order</Text>
          <Text className="text-3xl text-primary font-bold mb-1">
            ₱ {amount}
          </Text>
          <Text className="text-slate-400 text-xs mb-4">
            Your order is placed once payment is confirmed
          </Text>

          {feeValue > 0 && (
            <View className="w-full max-w-[320px] bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 mb-6">
              <View className="flex-row justify-between mb-1">
                <Text className="text-slate-500 text-sm">Order Total</Text>
                <Text className="text-slate-700 text-sm font-semibold">
                  ₱ {orderTotalLabel}
                </Text>
              </View>
              <View className="flex-row justify-between mb-1">
                <Text className="text-slate-500 text-sm">Processing Fee</Text>
                <Text className="text-slate-700 text-sm font-semibold">
                  ₱ {fmtPeso(feeValue)}
                </Text>
              </View>
              <View className="flex-row justify-between pt-1 border-t border-slate-200">
                <Text className="text-slate-600 text-sm font-semibold">
                  Total to Scan/Pay
                </Text>
                <Text className="text-slate-900 text-sm font-bold">
                  ₱ {amount}
                </Text>
              </View>
            </View>
          )}

          <View className="p-4 border-2 border-gray-100 rounded-[32px] bg-white shadow-sm mb-4">
            <Image
              source={{ uri: data.qr_image }}
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
            onPress={handleCancel}
            disabled={cancelling}
            className="mt-10"
          >
            <Text className="text-gray-400 underline">
              {cancelling ? "Cancelling..." : "Cancel Payment"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
        {alertModal}
      </View>
    );
  }

  // loading / confirming
  return (
    <View className="flex-1 justify-center items-center bg-white px-8">
      {lockBack}
      <ActivityIndicator size="large" color="#3E4093" />
      <Text className="mt-4 font-bold text-slate-800 text-lg">
        {data ? "Confirming your payment..." : "Preparing your payment..."}
      </Text>
      <TouchableOpacity
        onPress={handleCancel}
        disabled={cancelling}
        className="mt-8"
      >
        <Text className="text-gray-400 underline">
          {cancelling ? "Cancelling..." : "Cancel"}
        </Text>
      </TouchableOpacity>
      {alertModal}
    </View>
  );
}
