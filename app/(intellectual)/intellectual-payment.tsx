import { CustomAlert } from "@/components/CustomAlert";
import {
  applyIntellectualPayment,
  getIntellectualProperty,
  getIntellectualSettings,
} from "@/services/intellectualService";

import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function IntellectualPaymentPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);

  const [options, setOptions] = useState<any[]>([]);
  const [amount, setAmount] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<any>(null);

  const [submitting, setSubmitting] = useState(false);
  const isProcessing = useRef(false);

  const [hasSchedules, setHasSchedules] = useState(false);

  /**
   * ✅ UPDATE: Configured state to explicitly support confirmation behavior
   */
  const [alert, setAlert] = useState({
    visible: false,
    title: "",
    message: "",
    isConfirmation: false,
    onConfirm: () => {},
  });

  const showAlert = (title: string, message: string) => {
    setAlert({
      visible: true,
      title,
      message,
      isConfirmation: false,
      onConfirm: () => {},
    });
  };

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        const res = await getIntellectualProperty(id as string);

        if (!isMounted) return;

        const ip = res?.data;
        const attr = ip?.attributes || {};
        const relationships = ip?.relationships || {};

        const status = String(attr?.status || "").toLowerCase();
        const schedules = relationships?.schedules?.data || [];
        const alreadyHasSchedules = schedules.length > 0;

        setHasSchedules(alreadyHasSchedules);

        if (alreadyHasSchedules) {
          router.replace({
            pathname: "/intellectual-breakdown",
            params: {
              id: String(id),
            },
          });
          return;
        }

        if (status !== "waiting_for_payment") {
          showAlert(
            "Not Ready",
            "This intellectual property is not ready for payment.",
          );
          setTimeout(() => {
            router.back();
          }, 1500);
          return;
        }

        const settings = await getIntellectualSettings(id as string);

        if (!isMounted) return;

        const paymentOptions = settings?.payment_options || [];

        // 🪙 CONVERT TOTAL AMOUNT FROM CENTS TO PESOS
        const totalAmountRaw = Number(settings?.amount || attr?.amount || 0);
        const totalAmountPesos = totalAmountRaw / 100;

        if (!paymentOptions.length) {
          showAlert(
            "Not Ready",
            "No payment options configured for this property.",
          );
          setTimeout(() => {
            router.back();
          }, 1500);
          return;
        }

        if (totalAmountPesos <= 0) {
          showAlert("Not Ready", "Payment amount is not set properly.");
          setTimeout(() => {
            router.back();
          }, 1500);
          return;
        }

        // 🪙 CONVERT TERM AMOUNTS FROM CENTS TO PESOS
        const mappedOptions = paymentOptions.map((opt: any) => ({
          ...opt,
          amount_per_term: Number(opt.amount_per_term || 0) / 100,
        }));

        setAmount(totalAmountPesos);
        setOptions(mappedOptions);
      } catch (e: any) {
        showAlert(
          "Error",
          e?.response?.data?.message || "Failed to load payment options.",
        );
      } finally {
        setChecking(false);
        setLoading(false);
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, [id]);

  /**
   * ✅ SUBMISSION EXECUTION HANDLER
   */
  const processSubmit = async () => {
    if (!selectedOption || submitting || isProcessing.current) return;

    try {
      isProcessing.current = true;
      setSubmitting(true);

      const payload = {
        term_months: Number(selectedOption.term_months),
      };

      const response = await applyIntellectualPayment(id as string, payload);

      if (response?.conflict) {
        router.replace({
          pathname: "/intellectual-breakdown",
          params: {
            id: String(id),
          },
        });
        return;
      }

      showAlert("Success", "Schedule created.");

      setTimeout(() => {
        router.replace({
          pathname: "/intellectual-breakdown",
          params: {
            id: String(id),
          },
        });
      }, 1500);
    } catch (e: any) {
      showAlert(
        "Cannot Proceed",
        e?.response?.data?.message || "Property not ready for payment.",
      );
    } finally {
      setSubmitting(false);
      isProcessing.current = false;
    }
  };

  /**
   * ✅ INTERCEPT HANDLER FOR THE CONFIRMATION WINDOW
   */
  const handleSubmit = () => {
    if (!selectedOption || submitting || isProcessing.current) {
      return;
    }

    if (hasSchedules) {
      router.replace({
        pathname: "/intellectual-breakdown",
        params: {
          id: String(id),
        },
      });
      return;
    }

    setAlert({
      visible: true,
      title: "Confirm Payment Option",
      message: `Are you sure you want to select the "${selectedOption.label}" option?`,
      isConfirmation: true,
      onConfirm: () => {
        setAlert((prev) => ({ ...prev, visible: false }));
        processSubmit();
      },
    });
  };

  if (checking || loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" />
        <Text className="mt-2 text-slate-500">Loading payment options...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white pt-12">
      <ScrollView className="px-5">
        <Text className="text-2xl font-bold text-primary mb-3">
          Intellectual Property Payment
        </Text>

        <Text className="text-slate-500">Amount</Text>

        <Text className="text-3xl font-black text-primary mb-6">
          ₱
          {amount.toLocaleString("en-PH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Text>

        {options.map((opt, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => setSelectedOption(opt)}
            disabled={hasSchedules || submitting || isProcessing.current}
            className={`p-4 mb-3 border rounded-2xl flex-row justify-between items-center ${
              selectedOption?.term_months === opt.term_months
                ? "border-primary bg-blue"
                : "border-gray-200"
            }`}
          >
            <View>
              <Text className="font-bold">{opt.label}</Text>

              <Text className="text-sm text-gray-500">
                ₱
                {opt.amount_per_term.toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                / month
              </Text>
            </View>

            <View
              className={`w-5 h-5 rounded-full border ${
                selectedOption?.term_months === opt.term_months
                  ? "border-4 border-primary"
                  : "border-gray-400"
              }`}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View className="p-5 border-t border-gray-100">
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={
            !selectedOption ||
            submitting ||
            isProcessing.current ||
            hasSchedules
          }
          className={`h-14 rounded-xl justify-center items-center ${
            !selectedOption ||
            submitting ||
            isProcessing.current ||
            hasSchedules
              ? "bg-gray-400"
              : "bg-primary"
          }`}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold">Continue</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* CUSTOM ALERT COMPONENT */}
      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        confirmText={alert.isConfirmation ? "Proceed" : "Okay"}
        onConfirm={alert.isConfirmation ? alert.onConfirm : undefined}
        onClose={() => {
          setAlert((prev) => ({
            ...prev,
            visible: false,
          }));
        }}
      />
    </View>
  );
}
