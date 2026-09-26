import { CustomAlert } from "@/components/CustomAlert";
import { Skeleton } from "@/components/ui/skeleton";
import { accountDeletionService } from "@/services/accountDeletionService";
import { useAuthStore } from "@/store/useAuthStore";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import "../../global.css";

export default function DeleteVerificationScreen() {
  const router = useRouter();
  const { clearAuth } = useAuthStore();
  const { phone } = useLocalSearchParams<{ phone: string }>();

  const otpInputRef = useRef<TextInput>(null);
  const otpContainerRef = useRef<View>(null);

  const [otp, setOtp] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [timer, setTimer] = useState(300);
  const [deletionToken, setDeletionToken] = useState<string | null>(null);

  const [alert, setAlert] = useState({
    visible: false,
    title: "",
    message: "",
    onCloseOverride: null as (() => void) | null,
  });

  /* -------- ALERT -------- */
  const showAlert = (
    title: string,
    message: string,
    onCloseOverride?: () => void,
  ) => {
    setAlert({
      visible: true,
      title,
      message,
      onCloseOverride: onCloseOverride || null,
    });
  };

  /* -------- NAV RESET -------- */
  useFocusEffect(
    useCallback(() => {
      setNavigating(false);
    }, []),
  );

  /* -------- LOAD + TIMER -------- */
  useEffect(() => {
    const load = setTimeout(() => setPageLoading(false), 400);

    const countdown = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      clearTimeout(load);
      clearInterval(countdown);
    };
  }, []);

  /* -------- VERIFY OTP -------- */
  const handleVerify = async () => {
    if (otp.length !== 6 || verifying) return;

    setVerifying(true);

    try {
      const data = await accountDeletionService.verifyDeletion(otp);

      if (data.deletion_token) {
        setDeletionToken(data.deletion_token);
        setNavigating(true);

        showAlert(
          "Verified",
          "Your account deletion has been scheduled. You will be logged out now.",
          () => {
            completeDeletion(data.deletion_token!);
          },
        );
      }
    } catch (error: any) {
      const message =
        error?.message ||
        error?.response?.data?.message ||
        "Invalid OTP code. Please try again.";

      showAlert("Verification Failed", message);
      setOtp("");
    } finally {
      setVerifying(false);
    }
  };

  /* -------- RESEND OTP -------- */
  const handleResend = async () => {
    if (timer > 0 || resending) return;

    setResending(true);

    try {
      const data = await accountDeletionService.resendDeletionOtp();

      setTimer(300);
      showAlert(
        "OTP Sent",
        data.message || "A new verification code has been sent.",
      );
    } catch (error: any) {
      showAlert(
        "Resend Error",
        error?.message ||
          error?.response?.data?.message ||
          "Too many requests.",
      );
    } finally {
      setResending(false);
    }
  };

  /* -------- COMPLETE DELETION -------- */
  const completeDeletion = async (token: string) => {
    try {
      await accountDeletionService.completeDeletion(token);
      await clearAuth();
      router.replace("/login");
    } catch (error: any) {
      const message =
        error?.message || "Failed to complete account deletion. Try again.";
      showAlert("Error", message);
      setNavigating(false);
    }
  };

  const isBusy = verifying || resending || navigating;

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      bounces={false}
      bottomOffset={20}
      className="px-4 py-6"
    >
      {pageLoading ? (
        <View className="gap-y-6">
          <Skeleton className="w-14 h-14 rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-3xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </View>
      ) : (
        <>
          {/* HEADER CARD */}
          <View className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mb-6">
            <View
              className="w-14 h-14 rounded-2xl items-center justify-center mb-4"
              style={{ backgroundColor: "#FEE2E2" }}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={28}
                color="#DC2626"
              />
            </View>

            <Text className="text-xl font-bold text-gray-900 mb-2">
              Confirm Account Deletion
            </Text>

            <Text className="text-gray-600 leading-6">
              Enter the OTP sent to {phone} to confirm your account deletion
              request.
            </Text>
          </View>

          {/* OTP INPUT CARD */}
          <View className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mb-6">
            <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
              Verification Code
            </Text>

            <View ref={otpContainerRef}>
              <TextInput
                ref={otpInputRef}
                value={otp}
                onChangeText={(val) =>
                  setOtp(val.replace(/[^0-9]/g, "").slice(0, 6))
                }
                keyboardType="number-pad"
                maxLength={6}
                placeholder="Enter OTP Code"
                className="border border-gray-200 rounded-2xl px-4 py-4 text-base text-gray-800 bg-gray-50"
                editable={!isBusy}
              />
            </View>

            {/* RESEND */}
            <View className="flex-row justify-between items-center mt-4 px-1">
              <Text className="text-gray-500 text-sm">
                Didn&apos;t get code?
              </Text>

              <TouchableOpacity
                onPress={handleResend}
                disabled={timer > 0 || resending}
              >
                <Text
                  className="font-semibold text-sm"
                  style={{
                    color: timer > 0 || resending ? "#9CA3AF" : "#DC2626",
                  }}
                >
                  {timer > 0 ? `Resend in ${formatTime(timer)}` : "Resend OTP"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* POLICY DETAILS CARD */}
          <View className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mb-6">
            <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
              What Happens Next
            </Text>

            <View className="flex-row items-start">
              <View
                className="p-2 rounded-xl mr-3"
                style={{ backgroundColor: "#FEE2E2" }}
              >
                <Ionicons name="warning-outline" size={20} color="#DC2626" />
              </View>
              <View className="flex-1">
                <Text className="font-bold text-gray-800 text-sm">
                  30-Day Deactivation
                </Text>
                <Text className="text-gray-500 text-xs mt-1 leading-4">
                  Your account will be hidden from public view. You can cancel
                  anytime by logging in within 30 days.
                </Text>
              </View>
            </View>
          </View>

          {/* VERIFY BUTTON */}
          <TouchableOpacity
            onPress={handleVerify}
            disabled={otp.length < 6 || isBusy}
            className="flex-row items-center justify-center p-4 rounded-2xl border mb-12"
            style={{
              backgroundColor: "#FEF2F2",
              borderColor: "#FECACA",
              opacity: otp.length < 6 ? 0.6 : 1,
            }}
          >
            {verifying ? (
              <ActivityIndicator color="#DC2626" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={22}
                  color="#DC2626"
                />
                <Text
                  className="font-bold ml-2 text-base"
                  style={{ color: "#DC2626" }}
                >
                  {navigating ? "Processing..." : "Confirm Deletion"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </>
      )}

      {/* ALERT MODAL */}
      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        onClose={() => {
          const callback = alert.onCloseOverride;
          setAlert((prev) => ({ ...prev, visible: false }));

          if (callback) callback();
        }}
      />
    </KeyboardAwareScrollView>
  );
}
