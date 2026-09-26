import { CustomAlert } from "@/components/CustomAlert";
import {
  applyMembership,
  getMembership,
  getMembershipSettings,
} from "@/services/membershipService";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function MembershipPage() {
  const router = useRouter();

  // States
  const [checking, setChecking] = useState(true); // Start as true
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<any[]>([]);
  const [amount, setAmount] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  /**
   * ✅ CUSTOM ALERT STATE
   */
  const [alert, setAlert] = useState({
    visible: false,
    title: "",
    message: "",
    isConfirmation: false,
    onConfirm: () => {},
  });

  // Fix: Use a single useEffect to handle logic sequentially
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        // 1. Check if user already has membership
        const res = await getMembership();

        if (res?.data && isMounted) {
          const attr = res.data.attributes;

          // If ACTIVE,
          if (attr.status.toLowerCase() === "active") {
            router.replace("../profile/index");
            return; // STOP execution here
          }

          // If they have unpaid installments, go to breakdown
          if (attr.unpaid_schedules > 0) {
            router.replace("/profile/membership-breakdown");
            return; // STOP execution here
          }
        }
      } catch (e) {
        console.log("No existing membership found.");
      } finally {
        if (isMounted) setChecking(false);
      }

      // 2. Only load settings if no redirect happened
      try {
        const settings = await getMembershipSettings();
        if (isMounted) {
          setAmount(settings?.share_capital_amount || 0);
          setOptions(settings?.payment_options || []);
        }
      } catch (e) {
        console.log("Settings error", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initialize();
    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * ✅ ACTUAL API SUBMISSION FUNCTION
   */
  const processSubmit = async () => {
    if (!selectedOption || submitting) return;
    setSubmitting(true);

    try {
      const res = await applyMembership({
        term_months: selectedOption.term_months,
      });

      const membership = res?.data;

      // JSON:API relationships
      const schedules =
        res?.included?.filter(
          (i: any) => i.type === "api_membership_schedules",
        ) || membership?.relationships?.schedules?.data;

      const firstScheduleId = schedules?.[0]?.id;

      // IF PAY IN FULL (1 month) -> Go to Checkout
      if (selectedOption.term_months === 1 && firstScheduleId) {
        router.push({
          pathname: "/profile/membership-checkout",
          params: {
            scheduleId: firstScheduleId,
            amount: membership.attributes.amount,
          },
        });
      } else {
        router.replace("/profile/membership-breakdown");
      }
    } catch (e: any) {
      router.replace("/profile/membership-breakdown");
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * ✅ TRIGGER CONFIRMATION MODAL FIRST
   */
  const handleSubmit = () => {
    if (!selectedOption || submitting) return;

    setAlert({
      visible: true,
      title: "Confirm Membership",
      message: `Are you sure you want to select the "${selectedOption.label}" option?`,
      isConfirmation: true,
      onConfirm: () => {
        setAlert((prev) => ({ ...prev, visible: false })); // Close alert safely before submission
        processSubmit();
      },
    });
  };

  // CRITICAL: If checking or loading, don't show the form!
  if (checking || loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#0000ff" />
        <Text className="mt-2 text-slate-500">
          Checking membership status...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white pt-12">
      <ScrollView className="px-5">
        <Text className="text-2xl font-bold text-primary mb-3">Membership</Text>
        <Text className="text-slate-500">Share Capital Amount</Text>
        <Text className="text-3xl font-black text-primary mb-6">
          ₱{(amount / 100).toFixed(2)}
        </Text>

        {options.map((opt, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => setSelectedOption(opt)}
            className={`p-4 mb-3 border rounded-2xl flex-row justify-between items-center ${
              selectedOption?.term_months === opt.term_months
                ? "border-primary bg-blue"
                : "border-gray-200"
            }`}
          >
            <View>
              <Text className="font-bold">{opt.label}</Text>
              <Text className="text-sm text-gray-500">
                ₱{(opt.amount_per_term / 100).toFixed(2)} / month
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
          disabled={!selectedOption || submitting}
          className={`h-14 rounded-xl justify-center items-center ${
            !selectedOption || submitting ? "bg-gray-400" : "bg-primary"
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
