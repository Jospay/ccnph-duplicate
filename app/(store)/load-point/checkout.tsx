import { CustomAlert } from "@/components/CustomAlert";
import {
  calculatePointFee,
  getPaymentMethods,
  getPointBalance,
  getPointConfig,
  loadPoints,
  PaymentMethod,
  PointConfig,
} from "@/services/pointService";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

const DEFAULT_MIN = 100;

export default function PointsCheckoutPage() {
  const { amount } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [isTampered, setIsTampered] = useState(false);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [config, setConfig] = useState<PointConfig | null>(null);
  const [configReady, setConfigReady] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);

  const isProcessing = useRef(false);
  const hasNavigatedSuccess = useRef(false);

  const safeAmount = Array.isArray(amount) ? amount[0] : amount;
  const netPesos = Number(String(safeAmount).replace(/,/g, "")) || 0;
  const rate = 1; // ₱1 = 1 point

  const minLoad = config?.min_load ?? DEFAULT_MIN;
  const fee = config?.fee ? calculatePointFee(netPesos, config.fee) : 0;
  const totalPesos = netPesos + fee;
  const amountInvalid = netPesos < minLoad;

  const [alert, setAlert] = useState({
    visible: false,
    title: "",
    message: "",
    isConfirmation: false,
    redirectToMain: false,
    onConfirm: () => {},
  });

  const verifyIntegrity = async () => {
    try {
      const res = await getPointBalance();

      if (res?.data?.is_tampered) {
        setIsTampered(true);
        setAlert({
          visible: true,
          title: "Security Notice",
          message:
            res.data.message ||
            "Your points balance integrity check failed. Please contact chat support for assistance.",
          isConfirmation: false,
          redirectToMain: true,
          onConfirm: () => {},
        });
      }
    } catch (err) {
      console.log("Failed to verify points state", err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(false);
      setNavigating(false);
      isProcessing.current = false;
    }, []),
  );

  const fmt = (n: number) =>
    n.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const loadMethods = async () => {
    try {
      const res = await getPaymentMethods();

      const list = Array.isArray(res)
        ? res
        : Array.isArray((res as any)?.data)
          ? (res as any).data
          : [];

      const formatted: PaymentMethod[] = list.map((item: any) => ({
        id: item?.id,
        name: item?.attributes?.name,
        gateway_type: (item?.attributes?.gateway_type || "").toLowerCase(),
      }));

      const filtered = formatted.filter((m) =>
        ["qrph", "paymaya", "billease", "grab_pay"].includes(m.gateway_type),
      );

      setMethods(filtered);
      if (filtered.length > 0) setSelectedMethod(filtered[0]);
    } catch {
      setAlert({
        visible: true,
        title: "Connection Error",
        message:
          "Unable to load payment methods at this time. Please try again later.",
        isConfirmation: false,
        redirectToMain: false,
        onConfirm: () => {},
      });
    }
  };

  useEffect(() => {
    verifyIntegrity();
    // Wait for the fee config so the total shown is the real total
    getPointConfig()
      .then((res) => setConfig(res.data))
      .catch(() => {})
      .finally(() => setConfigReady(true));
    loadMethods();
  }, []);

  const showError = (title: string, message: string) =>
    setAlert({
      visible: true,
      title,
      message,
      isConfirmation: false,
      redirectToMain: false,
      onConfirm: () => {},
    });

  const executePayment = async () => {
    try {
      isProcessing.current = true;
      setLoading(true);

      const amountInCents = Math.round(netPesos * 100);

      const response: any = await loadPoints({
        amount: amountInCents,
        payment_method_id: Number(selectedMethod!.id),
        gateway_payment_method_id: null,
      });

      const nextAction = response?.next_action || response?.data?.next_action;
      const qr = nextAction?.qr_code_url || nextAction?.qr_url;
      const url = nextAction?.redirect_url || nextAction?.url;
      const paymentIntentId = response?.payment?.gateway_payment_intent_id;

      // Prefer the server's fee (cents) over the local estimate
      const serverFeeCents = response?.payment?.fee;
      const feePesos =
        typeof serverFeeCents === "number" ? serverFeeCents / 100 : fee;

      if (qr) {
        if (!paymentIntentId) {
          throw new Error("Payment intent ID was not returned by the server.");
        }

        setNavigating(true);

        router.push({
          pathname: "/load-point/points-qrph",
          params: {
            qrUrl: String(qr),
            paymentIntentId: String(paymentIntentId),
            amount: String(amountInCents / 100),
            fee: String(feePesos),
            totalCharged: String(amountInCents / 100 + feePesos),
          },
        });
        return;
      }

      if (url) {
        hasNavigatedSuccess.current = false;
        setCheckoutUrl(String(url));
        return;
      }

      showError(
        "Transaction Error",
        "No valid gateway redirect URL was returned by the system.",
      );
    } catch (error: any) {
      setAlert({
        visible: true,
        title: "Transaction Failed",
        message:
          error?.response?.data?.message ||
          error?.message ||
          "An unexpected error occurred during checkout.",
        redirectToMain: Boolean(error?.response?.data?.is_tampered),
        isConfirmation: false,
        onConfirm: () => {},
      });
    } finally {
      setLoading(false);
      isProcessing.current = false;
    }
  };

  const handleProceed = () => {
    if (isProcessing.current || loading || navigating) return;

    if (isTampered) {
      setAlert({
        visible: true,
        title: "Security Notice",
        message:
          "Your points balance integrity check failed. Please contact chat support for assistance.",
        isConfirmation: false,
        redirectToMain: true,
        onConfirm: () => {},
      });
      return;
    }

    if (amountInvalid) {
      showError(
        "Invalid Amount",
        `Minimum load amount is ₱${fmt(minLoad)}. Please go back and enter a valid amount.`,
      );
      return;
    }

    if (!selectedMethod) {
      showError(
        "Selection Required",
        "Please choose a payment method before proceeding.",
      );
      return;
    }

    setAlert({
      visible: true,
      title: "Confirm Points Load",
      message: `Load ${fmt(netPesos * rate)} points via ${selectedMethod.name}?${
        fee > 0
          ? ` A ₱${fmt(fee)} fee applies — you'll be charged ₱${fmt(totalPesos)} total.`
          : ""
      }`,
      isConfirmation: true,
      redirectToMain: false,
      onConfirm: () => {
        setAlert((prev) => ({ ...prev, visible: false }));
        executePayment();
      },
    });
  };

  if (checkoutUrl) {
    return (
      <WebView
        source={{ uri: checkoutUrl }}
        style={{ flex: 1 }}
        startInLoadingState
        onNavigationStateChange={(nav) => {
          if (
            nav.url.includes("payment/success") &&
            !hasNavigatedSuccess.current
          ) {
            hasNavigatedSuccess.current = true;
            router.replace("/load-point/payment-success");
          }
        }}
      />
    );
  }

  const buttonDisabled =
    loading ||
    navigating ||
    isTampered ||
    !configReady ||
    !selectedMethod ||
    amountInvalid;

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        {/* POINTS SUMMARY CARD */}
        <View className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-slate-100">
          <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider">
            Points Load
          </Text>

          <Text className="text-primary text-3xl font-black mt-1">
            {fmt(netPesos * rate)} pts
          </Text>
          <Text className="text-slate-400 text-xs mt-1">
            ₱{fmt(netPesos)} load amount
          </Text>

          {!configReady ? (
            <View className="mt-4 pt-4 border-t border-slate-100 items-center">
              <ActivityIndicator size="small" color="#3E4093" />
            </View>
          ) : (
            fee > 0 && (
              <View className="mt-4 pt-4 border-t border-slate-100">
                <View className="flex-row justify-between mb-1">
                  <Text className="text-slate-500 text-sm">Processing Fee</Text>
                  <Text className="text-slate-700 text-sm font-semibold">
                    ₱{fmt(fee)}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-slate-500 text-sm">Total to Pay</Text>
                  <Text className="text-slate-800 text-sm font-bold">
                    ₱{fmt(totalPesos)}
                  </Text>
                </View>
              </View>
            )
          )}
        </View>

        <Text className="font-semibold text-gray-800 mb-3 px-1">
          Select Payment Method
        </Text>

        {methods.map((m) => {
          const active = selectedMethod?.id === m.id;

          return (
            <TouchableOpacity
              key={m.id}
              disabled={loading || navigating || isTampered}
              onPress={() => setSelectedMethod(m)}
              className={`p-4 mb-3 rounded-xl border ${
                active ? "bg-blue border-primary" : "border-gray-200 bg-white"
              }`}
            >
              <Text
                className={`font-semibold ${active ? "text-primary" : "text-slate-800"}`}
              >
                {m.name}
              </Text>
              <Text className="text-xs text-gray-400 uppercase mt-0.5">
                {m.gateway_type}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View className="absolute bottom-0 w-full p-5 bg-white border-t border-gray-100">
        <TouchableOpacity
          onPress={handleProceed}
          disabled={buttonDisabled}
          className={`h-16 rounded-2xl justify-center items-center ${
            buttonDisabled ? "bg-slate-300" : "bg-primary"
          }`}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-lg">
              Confirm & Pay ₱{fmt(totalPesos)}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        confirmText={alert.isConfirmation ? "Proceed" : "Okay"}
        onConfirm={alert.isConfirmation ? alert.onConfirm : undefined}
        onClose={() => {
          const shouldRedirect = alert.redirectToMain;

          setAlert((prev) => ({ ...prev, visible: false }));

          if (shouldRedirect) router.dismissAll();
        }}
      />
    </View>
  );
}
