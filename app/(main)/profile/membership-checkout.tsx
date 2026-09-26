import { CustomAlert } from "@/components/CustomAlert";
import {
  calculateMembershipFee,
  getMembershipConfig,
  getPaymentMethods,
  MembershipConfig,
  payMembership,
  PaymentMethod,
} from "@/services/membershipService";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

export default function MembershipCheckoutPage() {
  const { scheduleId, amount } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [membershipConfig, setMembershipConfig] =
    useState<MembershipConfig | null>(null);

  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);

  const isProcessing = useRef(false);

  const safeScheduleId = Array.isArray(scheduleId) ? scheduleId[0] : scheduleId;
  const safeAmount = Array.isArray(amount) ? amount[0] : amount;

  // CUSTOM ALERT STATE
  const [alert, setAlert] = useState({
    visible: false,
    title: "",
    message: "",
    redirectHome: false,
    isConfirmation: false,
    onConfirm: () => {},
  });

  // RESET LOCKS
  useFocusEffect(
    useCallback(() => {
      setLoading(false);
      setNavigating(false);
      isProcessing.current = false;
    }, []),
  );

  // =========================
  // FORMATTERS
  // =========================
  const formatAmount = (value: any) => {
    const num = Number(String(value).replace(/,/g, ""));
    if (isNaN(num)) return "0.00";

    return num.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const parseAmount = (value: any) => {
    const cleaned = String(value)
      .replace(/,/g, "")
      .replace(/[^\d.]/g, "");

    const num = Number(cleaned);
    return isNaN(num) ? 0 : Number(num.toFixed(2));
  };

  const parsedAmount = parseAmount(safeAmount);

  // =========================
  // DYNAMIC FEE
  // =========================
  const membershipFee = membershipConfig?.fee
    ? calculateMembershipFee(parsedAmount, membershipConfig.fee)
    : 0;

  const totalChargeAmount = parsedAmount + membershipFee;

  // =========================
  // LOAD FEE CONFIG
  // =========================
  const loadFeeConfig = async () => {
    try {
      const res = await getMembershipConfig();
      setMembershipConfig(res.data);
    } catch (err) {
      console.log("Failed to load membership fee config", err);
      // Not fatal — checkout still works, just without a fee breakdown shown
    }
  };

  // =========================
  // LOAD METHODS
  // =========================
  const loadMethods = async () => {
    try {
      const res = await getPaymentMethods();

      const list = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
          ? res.data
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
    }
  };

  useEffect(() => {
    loadFeeConfig();
    loadMethods();
  }, []);

  // =========================
  // ACTUAL TRANSACTION PROCESS
  // =========================
  const executePaymentPayload = async () => {
    try {
      isProcessing.current = true;
      setLoading(true);

      const payload = {
        membership_schedule_id: Number(safeScheduleId),
        payment_method_id: Number(selectedMethod!.id),
        amount: parsedAmount,
        gateway: "paymongo",
      };

      console.log("PAYLOAD:", payload);
      const response = await payMembership(String(safeScheduleId), payload);
      console.log("FULL PAYMENT RESPONSE:", JSON.stringify(response, null, 2));

      const result = response?.data || response;

      // =========================
      // FLEXIBLE EXTRACTION
      // =========================
      const nextAction =
        result?.next_action ||
        result?.data?.next_action ||
        result?.payment?.next_action ||
        result?.data?.payment?.next_action;

      const qr =
        nextAction?.qr_code_url || nextAction?.qr_url || result?.qr_code_url;

      const url =
        nextAction?.redirect_url || nextAction?.url || result?.redirect_url;

      const payment = result?.payment || result?.data?.payment || result?.data;

      const paymentIntentId =
        payment?.gateway_payment_intent_id ||
        payment?.payment_intent_id ||
        payment?.id ||
        result?.gateway_payment_intent_id;

      const paymentAmount =
        payment?.amount || result?.amount || parsedAmount * 100;

      // The fee actually charged by the gateway, in pesos — prefer the
      // server's number (payment?.fee is in cents) over our local estimate,
      // since transaction_fees may have changed between page loads.
      const serverFeeCents = payment?.fee;
      const feePesos =
        typeof serverFeeCents === "number"
          ? serverFeeCents / 100
          : membershipFee;

      const totalChargedPesos = Number(paymentAmount) / 100 + feePesos;

      // =========================
      // QR FLOW
      // =========================
      if (qr) {
        setNavigating(true);
        router.push({
          pathname: "/profile/membership-qrph",
          params: {
            qrUrl: String(qr),
            paymentIntentId: String(paymentIntentId || ""),
            amount: String(Number(paymentAmount) / 100),
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

      setAlert({
        visible: true,
        title: "Error",
        message: "No payment QR or checkout URL found.",
        redirectHome: false,
        isConfirmation: false,
        onConfirm: () => {},
      });
    } catch (error: any) {
      console.log("PAYMENT ERROR:", error);
      const message =
        error?.response?.data?.message || error?.message || "Payment failed";

      if (message.toLowerCase().includes("already paid")) {
        setAlert({
          visible: true,
          title: "Already Settled",
          message:
            "This membership schedule is already paid! Redirecting you home.",
          redirectHome: true,
          isConfirmation: false,
          onConfirm: () => {},
        });
      } else {
        setAlert({
          visible: true,
          title: "Transaction Error",
          message: message,
          redirectHome: true,
          isConfirmation: false,
          onConfirm: () => {},
        });
      }
    } finally {
      setLoading(false);
      isProcessing.current = false;
    }
  };

  // =========================
  // CONFIRMATION POPUP SYSTEM
  // =========================
  const handleProceed = () => {
    if (isProcessing.current || loading || navigating) return;

    if (!selectedMethod) {
      setAlert({
        visible: true,
        title: "Selection Required",
        message: "Please select a payment method to continue.",
        redirectHome: false,
        isConfirmation: false,
        onConfirm: () => {},
      });
      return;
    }

    setAlert({
      visible: true,
      title: "Confirm Payment",
      message: `Proceed with payment of ₱${formatAmount(safeAmount)} using ${
        selectedMethod.name
      }?${
        membershipFee > 0
          ? ` A ₱${membershipFee.toFixed(2)} fee applies — you'll be charged ₱${totalChargeAmount.toFixed(2)} total.`
          : ""
      }`,
      redirectHome: false,
      isConfirmation: true,
      onConfirm: () => {
        setAlert((prev) => ({ ...prev, visible: false }));
        executePaymentPayload();
      },
    });
  };

  // =========================
  // WEBVIEW
  // =========================
  if (checkoutUrl) {
    return (
      <WebView
        source={{ uri: checkoutUrl }}
        style={{ flex: 1 }}
        startInLoadingState
        onNavigationStateChange={(nav) => {
          if (nav.url.includes("payment/success")) {
            router.replace("/(main)/profile/payment-success");
          }
        }}
      />
    );
  }

  // =========================
  // UI
  // =========================
  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 120,
        }}
      >
        {/* CARD */}
        <View className="bg-white rounded-3xl p-6 mb-6 shadow-sm">
          <Text className="text-slate-400 text-xs font-bold uppercase">
            Membership Payment
          </Text>

          <Text className="text-primary text-3xl font-black mt-1">
            ₱{formatAmount(safeAmount)}
          </Text>

          {membershipFee > 0 && (
            <View className="mt-4 pt-4 border-t border-slate-100">
              <View className="flex-row justify-between mb-1">
                <Text className="text-slate-500 text-sm">Processing Fee</Text>
                <Text className="text-slate-700 text-sm font-semibold">
                  ₱{membershipFee.toFixed(2)}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-slate-500 text-sm">Total to Pay</Text>
                <Text className="text-slate-800 text-sm font-bold">
                  ₱{totalChargeAmount.toFixed(2)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* METHODS */}
        <Text className="font-semibold text-gray-800 mb-3 px-1">
          Select Payment Method
        </Text>

        {methods.map((m) => {
          const active = selectedMethod?.id === m.id;

          return (
            <TouchableOpacity
              key={m.id}
              disabled={loading || navigating}
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

      {/* FOOTER */}
      <View className="absolute bottom-0 w-full p-5 bg-white border-t border-gray-100">
        <TouchableOpacity
          onPress={handleProceed}
          disabled={loading || navigating}
          className={`h-16 rounded-2xl justify-center items-center ${
            loading || navigating ? "bg-slate-300" : "bg-primary"
          }`}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-lg">
              Pay ₱
              {membershipFee > 0
                ? totalChargeAmount.toFixed(2)
                : formatAmount(safeAmount)}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* CUSTOM ALERT */}
      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        confirmText={alert.isConfirmation ? "Proceed" : "Okay"}
        onConfirm={alert.isConfirmation ? alert.onConfirm : undefined}
        onClose={() => {
          const shouldRedirect = alert.redirectHome;

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
