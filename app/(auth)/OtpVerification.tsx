import { CustomAlert } from "@/components/CustomAlert";
import HeaderAuth from "@/components/HeaderAuth";
import LinkAuth from "@/components/LinkAuth";
import LogoAuth from "@/components/LogoAuth";
import TitleAuth from "@/components/TitleAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { phoneVerificationService } from "@/services/phoneVerification";
import { useMutation } from "@tanstack/react-query";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import OTPVerification from "../../assets/images/vector/OTPVerificationCode.png";
import "../../global.css";

export default function OtpVerificationPage() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();

  const otpInputRef = useRef<TextInput>(null);
  const otpContainerRef = useRef<View>(null);

  const [otp, setOtp] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [navigating, setNavigating] = useState(false);
  const [timer, setTimer] = useState(300);

  const [alert, setAlert] = useState({
    visible: false,
    title: "",
    message: "",
    onCloseOverride: null as (() => void) | null,
  });

  /* ---------------- ALERT ---------------- */
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

  /* ---------------- NAV RESET ---------------- */
  useFocusEffect(
    useCallback(() => {
      setNavigating(false);
    }, []),
  );

  /* ---------------- LOAD + TIMER ---------------- */
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

  /* ---------------- VERIFY OTP ---------------- */
  const verifyMutation = useMutation({
    mutationFn: (otpCode: string) =>
      phoneVerificationService.verify({
        phone: phone as string,
        otp_code: otpCode,
      }),

    onSuccess: (data) => {
      setNavigating(true);

      showAlert("Success", "OTP verified successfully.", () => {
        router.push({
          pathname: "/createPassword",
          params: { token: data.verification_token, phone },
        });
      });
    },

    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Invalid OTP code. Please try again.";

      showAlert("Verification Failed", message);
      setOtp("");
    },
  });

  /* ---------------- RESEND OTP ---------------- */
  const resendMutation = useMutation({
    mutationFn: () =>
      phoneVerificationService.resend({ phone: phone as string }),

    onSuccess: (data) => {
      setTimer(300);
      showAlert(
        "OTP Sent",
        data.message || "A new verification code has been sent.",
      );
    },

    onError: (error: any) => {
      showAlert(
        "Resend Error",
        error.response?.data?.message || "Too many requests.",
      );
    },
  });

  const handleVerify = () => {
    if (otp.length === 6 && !verifyMutation.isPending) {
      verifyMutation.mutate(otp);
    }
  };

  const isBusy =
    verifyMutation.isPending || resendMutation.isPending || navigating;

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
    >
      <View className="flex-1 bg-slate-50">
        <HeaderAuth title="Join Us" />

        <View className="flex-1 -mt-10">
          <View className="bg-primary h-[240px] rounded-b-[60px] absolute w-full top-0" />

          <View className="mx-5 pb-10 max-w-[500px] w-[90%] self-center">
            <View className="bg-white p-6 rounded-[40px] shadow-md elevation-4">
              {pageLoading ? (
                <Skeleton className="w-32 h-32 rounded-full mt-[-76px] border-4 border-white" />
              ) : (
                <LogoAuth />
              )}

              {pageLoading ? (
                <View className="gap-y-6">
                  <Skeleton className="w-40 h-48 self-center mt-3" />
                  <Skeleton className="h-8 w-56 self-center" />
                </View>
              ) : (
                <>
                  <Image
                    source={OTPVerification}
                    className="w-40 h-48 self-center"
                    resizeMode="contain"
                  />

                  <TitleAuth
                    title="OTP Verification"
                    description={`Enter OTP sent to +${phone}`}
                  />

                  {/* OTP INPUT (SMOOTHER ONLY HERE) */}
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
                      className="border border-slate-200 rounded-2xl px-4 py-4 text-base text-slate-800 bg-slate-50 overflow-hidden"
                      editable={!isBusy}
                    />
                  </View>

                  {/* RESEND */}
                  <View className="flex-row justify-between items-center mt-6 mb-2 px-1">
                    <Text className="text-slate-500 text-sm">
                      Didn&apos;t get code?
                    </Text>

                    <TouchableOpacity
                      onPress={() => resendMutation.mutate()}
                      disabled={timer > 0 || resendMutation.isPending}
                    >
                      <Text
                        className={`font-semibold text-sm ${
                          timer > 0 || resendMutation.isPending
                            ? "text-slate-400"
                            : "text-primary"
                        }`}
                      >
                        {timer > 0
                          ? `Resend in ${formatTime(timer)}`
                          : "Resend OTP"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* VERIFY */}
                  <TouchableOpacity
                    onPress={handleVerify}
                    disabled={otp.length < 6 || isBusy}
                    className={`mt-5 p-5 rounded-2xl flex-row justify-center items-center ${
                      otp.length < 6 || isBusy ? "bg-slate-300" : "bg-primary"
                    }`}
                  >
                    {verifyMutation.isPending ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white font-bold text-lg">
                        {navigating ? "Verifying..." : "Verify OTP"}
                      </Text>
                    )}
                  </TouchableOpacity>

                  <LinkAuth
                    onNavigating={setNavigating}
                    isNavigating={navigating}
                  />
                </>
              )}
            </View>
          </View>
        </View>
      </View>

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
