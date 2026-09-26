import { CustomAlert } from "@/components/CustomAlert";
import {
  calculateLoadFee,
  getLoadConfig,
  getPaymentMethods,
  getWalletBalance,
  LoadConfig,
  PaymentMethod,
  rechargeWallet,
} from "@/services/walletService";
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

export default function CheckoutPage() {
  const { amount, type } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [isTampered, setIsTampered] = useState(false);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [loadConfig, setLoadConfig] = useState<LoadConfig | null>(null);

  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);

  const isProcessing = useRef(false);

  const safeAmount = Array.isArray(amount) ? amount[0] : amount;
  const isWalletLoad = type === "wallet_load";

  // Net load amount, in pesos (this is the amount that gets credited to the wallet)
  const netAmountPesos = Number(String(safeAmount).replace(/,/g, "")) || 0;

  const loadFee = loadConfig?.fee
    ? calculateLoadFee(netAmountPesos, loadConfig.fee)
    : 0;

  const totalChargePesos = netAmountPesos + loadFee;

  // =========================
  // CUSTOM ALERT STATE
  // =========================
  const [alert, setAlert] = useState({
    visible: false,
    title: "",
    message: "",
    redirectToMain: false,
    isConfirmation: false,
    onConfirm: () => {},
  });

  // =========================
  // RESET LOCKS WHEN SCREEN
  // COMES INTO FOCUS
  // =========================
  useFocusEffect(
    useCallback(() => {
      setLoading(false);
      setNavigating(false);
      isProcessing.current = false;
    }, []),
  );

  // =========================
  // FORMAT AMOUNT (pesos in)
  // =========================
  const formatAmount = (value: any) => {
    const num = Number(String(value).replace(/,/g, ""));

    if (isNaN(num)) {
      return "0.00";
    }

    return num.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // =========================
  // PARSE PESO AMOUNT TO CENTS
  // =========================
  const parseAmountInCents = (value: any) => {
    const cleaned = String(value)
      .replace(/,/g, "")
      .replace(/[^\d.]/g, "");

    const num = Number(cleaned);

    return isNaN(num) ? 0 : Math.round(num * 100);
  };

  // =========================
  // WALLET INTEGRITY CHECK
  // =========================
  const verifyWalletIntegrity = async () => {
    try {
      const response: any = await getWalletBalance();

      const walletData = response?.data || response;

      if (Boolean(walletData?.is_tampered)) {
        setIsTampered(true);

        setAlert({
          visible: true,
          title: "Security Notice",
          message:
            walletData?.message ||
            "Your wallet balance integrity check failed. Please contact chat support for assistance.",
          redirectToMain: true,
          isConfirmation: false,
          onConfirm: () => {},
        });
      }
    } catch (err) {
      console.log("Failed to verify wallet state", err);
    }
  };

  // =========================
  // LOAD DYNAMIC FEE CONFIG
  // =========================
  const loadFeeConfig = async () => {
    try {
      const res = await getLoadConfig();
      setLoadConfig(res.data);
    } catch (err) {
      console.log("Failed to load fee config", err);
      // Not fatal — checkout still works, just without a fee breakdown shown
    }
  };

  // =========================
  // LOAD PAYMENT METHODS
  // =========================
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

      if (filtered.length > 0) {
        setSelectedMethod(filtered[0]);
      }
    } catch (err) {
      console.log("Failed to load payment methods", err);

      setAlert({
        visible: true,
        title: "Connection Error",
        message:
          "Unable to load payment methods at this time. Please try again later.",
        redirectToMain: false,
        isConfirmation: false,
        onConfirm: () => {},
      });
    }
  };

  // =========================
  // INITIAL LOAD
  // =========================
  useEffect(() => {
    verifyWalletIntegrity();
    loadFeeConfig();
    loadMethods();
  }, []);

  // =========================
  // PAYMENT EXECUTION
  // =========================
  const executePaymentPayload = async () => {
    try {
      isProcessing.current = true;
      setLoading(true);

      // Net amount to be credited to the wallet (in cents) — the backend
      // adds the fee on top and charges amount + fee at the gateway.
      const amountInCents = parseAmountInCents(safeAmount);

      if (!isWalletLoad) {
        throw new Error("Invalid payment context routing channel.");
      }

      // =========================
      // WALLET RECHARGE PAYLOAD
      // =========================
      const payload = {
        amount: amountInCents,
        payment_method_id: Number(selectedMethod!.id),
        gateway_payment_method_id: null,
      };

      console.log("WALLET RECHARGE PAYLOAD:", payload);

      const response = await rechargeWallet(payload);

      console.log(
        "WALLET RECHARGE RESPONSE:",
        JSON.stringify(response, null, 2),
      );

      const resAny = response as any;

      // =========================
      // GET NEXT ACTION
      // =========================
      const nextAction = resAny?.next_action || resAny?.data?.next_action;

      const qr = nextAction?.qr_code_url || nextAction?.qr_url;

      const url = nextAction?.redirect_url || nextAction?.url;

      // =========================
      // GET PAYMENT INTENT ID
      // =========================
      const paymentIntentId = resAny?.payment?.gateway_payment_intent_id;

      console.log("WALLET PAYMENT DATABASE ID:", resAny?.payment?.id);
      console.log("WALLET PAYMENT INTENT ID:", paymentIntentId);
      console.log("WALLET ID:", resAny?.data?.id);

      // The fee actually charged by the gateway, in pesos — prefer the
      // server's number (resAny?.payment?.fee is in cents) over our local
      // estimate, since transaction_fees may have changed between page loads.
      const serverFeeCents = resAny?.payment?.fee;
      const feePesos =
        typeof serverFeeCents === "number" ? serverFeeCents / 100 : loadFee;

      const totalChargedPesos = amountInCents / 100 + feePesos;

      // =========================
      // QR FLOW
      // =========================
      if (qr) {
        if (!paymentIntentId) {
          throw new Error("Payment intent ID was not returned by the server.");
        }

        setNavigating(true);

        router.push({
          pathname: "/(load)/load-qrph",
          params: {
            qrUrl: String(qr),
            paymentIntentId: String(paymentIntentId),
            amount: String(amountInCents / 100),
            fee: String(feePesos),
            totalCharged: String(totalChargedPesos),
          },
        });

        return;
      }

      // =========================
      // WEBVIEW FLOW
      // =========================
      if (url) {
        setCheckoutUrl(String(url));
        return;
      }

      // =========================
      // INVALID GATEWAY RESPONSE
      // =========================
      setAlert({
        visible: true,
        title: "Transaction Error",
        message: "No valid gateway redirect URL was returned by the system.",
        redirectToMain: false,
        isConfirmation: false,
        onConfirm: () => {},
      });
    } catch (error: any) {
      console.log("PAYMENT SUBMISSION ERROR:", error);

      const isTamperResponse = Boolean(error?.response?.data?.is_tampered);

      const message =
        error?.response?.data?.message ||
        error?.message ||
        "An unexpected error occurred during checkout execution.";

      setAlert({
        visible: true,
        title: "Transaction Failed",
        message,
        redirectToMain: isTamperResponse,
        isConfirmation: false,
        onConfirm: () => {},
      });
    } finally {
      setLoading(false);
      isProcessing.current = false;
    }
  };

  // =========================
  // CONFIRMATION DIALOG
  // =========================
  const handleProceed = () => {
    if (isProcessing.current || loading || navigating) {
      return;
    }

    if (isTampered) {
      setAlert({
        visible: true,
        title: "Security Notice",
        message:
          "Your wallet balance integrity check failed. Please contact chat support for assistance.",
        redirectToMain: true,
        isConfirmation: false,
        onConfirm: () => {},
      });

      return;
    }

    if (!selectedMethod) {
      setAlert({
        visible: true,
        title: "Selection Required",
        message: "Please choose a payment method before proceeding.",
        redirectToMain: false,
        isConfirmation: false,
        onConfirm: () => {},
      });

      return;
    }

    setAlert({
      visible: true,
      title: "Confirm Wallet Load",
      message: `Load ₱${formatAmount(safeAmount)} into your wallet via ${
        selectedMethod.name
      }?${
        loadFee > 0
          ? ` A ₱${loadFee.toFixed(2)} fee applies — you'll be charged ₱${totalChargePesos.toFixed(2)} total.`
          : ""
      }`,
      redirectToMain: false,
      isConfirmation: true,
      onConfirm: () => {
        setAlert((prev) => ({
          ...prev,
          visible: false,
        }));

        executePaymentPayload();
      },
    });
  };

  // =========================
  // EMBEDDED WEBVIEW
  // =========================
  if (checkoutUrl) {
    return (
      <WebView
        source={{ uri: checkoutUrl }}
        style={{ flex: 1 }}
        startInLoadingState
        onNavigationStateChange={(nav) => {
          if (nav.url.includes("payment/success")) {
            router.replace("/(load)/payment-success");
          }
        }}
      />
    );
  }

  // =========================
  // SCREEN
  // =========================
  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 120,
        }}
      >
        {/* WALLET METRIC CARD */}
        <View className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-slate-100">
          <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider">
            Wallet Funds Recharge
          </Text>

          <Text className="text-primary text-3xl font-black mt-1">
            ₱{formatAmount(safeAmount)}
          </Text>

          {loadFee > 0 && (
            <View className="mt-4 pt-4 border-t border-slate-100">
              <View className="flex-row justify-between mb-1">
                <Text className="text-slate-500 text-sm">Processing Fee</Text>
                <Text className="text-slate-700 text-sm font-semibold">
                  ₱{loadFee.toFixed(2)}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-slate-500 text-sm">Total to Pay</Text>
                <Text className="text-slate-800 text-sm font-bold">
                  ₱{totalChargePesos.toFixed(2)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* PAYMENT METHOD SELECTION */}
        <Text className="font-semibold text-gray-800 mb-3 px-1">
          Select Gateway Method
        </Text>

        {methods.map((m) => {
          const active = selectedMethod?.id === m.id;

          return (
            <TouchableOpacity
              key={m.id}
              disabled={loading || navigating || isTampered}
              onPress={() => setSelectedMethod(m)}
              className={`p-4 mb-3 rounded-xl border ${
                active
                  ? "border-primary bg-blue-50/60"
                  : "border-gray-200 bg-white"
              }`}
            >
              <Text
                className={`font-semibold ${
                  active ? "text-primary" : "text-slate-800"
                }`}
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

      {/* FOOTER CTA */}
      <View className="absolute bottom-0 w-full p-5 bg-white border-t border-gray-100">
        <TouchableOpacity
          onPress={handleProceed}
          disabled={loading || navigating || isTampered}
          className={`h-16 rounded-2xl justify-center items-center ${
            loading || navigating || isTampered ? "bg-slate-300" : "bg-primary"
          }`}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-lg">
              Confirm & Pay ₱
              {loadFee > 0
                ? totalChargePesos.toFixed(2)
                : formatAmount(safeAmount)}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* SYSTEM FEEDBACK CUSTOM ALERT */}
      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        confirmText={alert.isConfirmation ? "Proceed" : "Okay"}
        onConfirm={alert.isConfirmation ? alert.onConfirm : undefined}
        onClose={() => {
          const shouldRedirect = alert.redirectToMain;

          setAlert((prev) => ({
            ...prev,
            visible: false,
          }));

          if (shouldRedirect) {
            router.replace("/(main)");
          }
        }}
      />
    </View>
  );
}
