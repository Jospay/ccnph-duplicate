import { CustomAlert } from "@/components/CustomAlert";
import {
  applyShareCapital,
  getShareCapital,
  getShareCapitalSettings,
} from "@/services/loanService";

import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function SharedPaymentPage() {
  const router = useRouter();
  const localParams = useLocalSearchParams();

  const id = React.useMemo(() => {
    if (!localParams.id) return "";
    return Array.isArray(localParams.id) ? localParams.id[0] : localParams.id;
  }, [localParams.id]);

  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);

  const [options, setOptions] = useState<any[]>([]);
  const [amount, setAmount] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<any>(null);

  const [submitting, setSubmitting] = useState(false);

  const isProcessing = useRef(false);
  const successFlowLock = useRef(false);

  const [hasSchedules, setHasSchedules] = useState(false);

  const [alert, setAlert] = useState({
    visible: false,
    title: "",
    message: "",
    isConfirmation: false,
    onConfirm: undefined as undefined | (() => void),
  });

  // =========================
  // ALERT HANDLER
  // =========================
  const showAlert = (
    title: string,
    message: string,
    onConfirm?: () => void,
    isConfirmation = false,
  ) => {
    setAlert({
      visible: true,
      title,
      message,
      isConfirmation,
      // ✅ FORCE undefined if it's not a confirmation modal to match CustomAlert's layout logic
      onConfirm: isConfirmation ? onConfirm : undefined,
    });
  };

  // =========================
  // INIT LOAD
  // =========================
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        const res = await getShareCapital();

        if (!isMounted) return;

        const shareCapital = res?.data;
        const attr = shareCapital?.attributes || {};
        const relationships = shareCapital?.relationships || {};

        const rawSchedules =
          shareCapital?.schedules ||
          relationships?.schedules?.data ||
          relationships?.schedules ||
          [];

        const schedules = Array.isArray(rawSchedules) ? rawSchedules : [];
        const alreadyHasSchedules = schedules.length > 0;

        setHasSchedules(alreadyHasSchedules);

        const currentTermSetting = Number(
          attr?.term_months || shareCapital?.term_months || 0,
        );

        const hasAssignedTerm = currentTermSetting > 0;

        const targetId = String(shareCapital?.id || id || "");

        // ✅ prevent auto redirect after success
        if (
          !successFlowLock.current &&
          (alreadyHasSchedules || hasAssignedTerm)
        ) {
          router.replace({
            pathname: "/shared-breakdown",
            params: targetId ? { id: targetId } : {},
          });
          return;
        }

        const settings = await getShareCapitalSettings();
        if (!isMounted) return;

        let totalAmountPesos = 0;

        if (settings?.required_amount) {
          totalAmountPesos =
            Number(String(settings.required_amount).replace(/,/g, "")) || 0;
        } else if (attr?.required_amount) {
          totalAmountPesos =
            Number(String(attr.required_amount).replace(/,/g, "")) / 100 || 0;
        }

        const allowedTerms = settings?.allowed_term_months || [];

        const mappedOptions = allowedTerms.map((months: number) => ({
          term_months: months,
          label:
            months === 1 ? "Pay in Full" : `${months} Monthly Installments`,
          amount_per_term: totalAmountPesos / months,
        }));

        setAmount(totalAmountPesos);
        setOptions(mappedOptions);
      } catch (e: any) {
        showAlert(
          "Error",
          e?.response?.data?.message || "Failed to load data.",
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

  // =========================
  // SUBMIT
  // =========================
  const processSubmit = async () => {
    if (!selectedOption || submitting || isProcessing.current) return;

    try {
      isProcessing.current = true;
      setSubmitting(true);

      const payload = {
        term_months: Number(selectedOption.term_months),
      };

      const response = await applyShareCapital(payload);

      const targetId = String(response?.data?.id || response?.id || id || "");

      successFlowLock.current = true;

      // ✅ FIXED SUCCESS ALERT (NO CANCEL, NO CONFIRM LOGIC)
      showAlert("Success", "Payment schedule created successfully.");

      setTimeout(() => {
        setAlert((prev) => ({ ...prev, visible: false }));
        router.replace({
          pathname: "/shared-breakdown",
          params: targetId ? { id: targetId } : {},
        });
      }, 1200);
    } catch (e: any) {
      showAlert(
        "Cannot Proceed",
        e?.response?.data?.message ||
          "Account profile not eligible for this tier.",
      );
    } finally {
      setSubmitting(false);
      isProcessing.current = false;
    }
  };

  const handleSubmit = () => {
    if (hasSchedules) {
      router.replace({
        pathname: "/shared-breakdown",
        params: id ? { id } : {},
      });
      return;
    }

    if (!selectedOption || submitting || isProcessing.current) return;

    showAlert(
      "Confirm Selection",
      `Initialize "${selectedOption.label}" structure?`,
      () => {
        setAlert((prev) => ({ ...prev, visible: false }));
        processSubmit();
      },
      true,
    );
  };

  // =========================
  // LOADING
  // =========================
  if (checking || loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#034194" />
        <Text className="mt-2 text-slate-500">Loading...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white pt-12">
      <ScrollView className="px-5">
        <Text className="text-2xl font-bold text-primary mb-3">
          Share Capital Requirement
        </Text>

        <Text className="text-slate-500">Required Deposit Balance</Text>

        <Text className="text-3xl font-black text-primary mb-6">
          ₱{" "}
          {amount.toLocaleString("en-PH", {
            minimumFractionDigits: 2,
          })}
        </Text>

        {options.map((opt, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => setSelectedOption(opt)}
            disabled={hasSchedules || submitting}
            className={`p-4 mb-3 border rounded-2xl flex-row justify-between items-center ${
              selectedOption?.term_months === opt.term_months
                ? "border-primary bg-blue"
                : "border-gray-200"
            }`}
          >
            <View>
              <Text className="font-bold text-slate-800">{opt.label}</Text>
              <Text className="text-sm text-gray-500 mt-0.5">
                ₱ {opt.amount_per_term.toLocaleString("en-PH")} / month
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View className="p-5 border-t border-gray-100">
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!selectedOption || submitting}
          className={`h-14 rounded-xl justify-center items-center ${
            !selectedOption || submitting ? "bg-gray-400" : "bg-primary"
          }`}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-base">
              {hasSchedules ? "View Breakdown" : "Continue"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ALERT */}
      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        confirmText={alert.isConfirmation ? "Proceed" : "Okay"}
        onConfirm={alert.onConfirm}
        onClose={() => setAlert((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
}
