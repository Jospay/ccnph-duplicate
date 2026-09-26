import { CustomAlert } from "@/components/CustomAlert";
import HeaderAuth from "@/components/HeaderAuth";
import LogoAuth from "@/components/LogoAuth";
import TitleAuth from "@/components/TitleAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { reactivationService } from "@/services/reactivationService";
import { useAuthStore } from "@/store/useAuthStore";
import { useMutation } from "@tanstack/react-query";
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

export default function ReactivateOtpPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { phone, retryAfter } = useLocalSearchParams<{
    phone: string;
    retryAfter?: string;
  }>();

  const otpContainerRef = useRef<View>(null);

  const [otp, setOtp] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [navigating, setNavigating] = useState(false);
  const [timer, setTimer] = useState(retryAfter ? Number(retryAfter) : 300);

  const [alert, setAlert] = useState({
    visible: false,
    title: "",
    message: "",
  });

  const showAlert = (title: string, message: string) => {
    setAlert({ visible: true, title, message });
  };

  useFocusEffect(
    useCallback(() => {
      setNavigating(false);
    }, []),
  );

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

  const verifyMutation = useMutation({
    mutationFn: (otpCode: string) =>
      reactivationService.verify({
        phone: phone as string,
        otp_code: otpCode,
      }),

    onSuccess: async (data) => {
      setNavigating(true);
      await setAuth(data.token, data.user);
      router.replace("/(main)");
    },

    onError: (error: any) => {
      showAlert(
        "Verification Failed",
        error?.message || "Invalid code. Please try again.",
      );
      setOtp("");
    },
  });

  const resendMutation = useMutation({
    mutationFn: () => reactivationService.resend({ phone: phone as string }),

    onSuccess: (data) => {
      setTimer(data.retry_after || 300);
      showAlert("Code Sent", data.message || "A new code has been sent.");
    },

    onError: (error: any) => {
      showAlert("Resend Error", error?.message || "Too many requests.");
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
        <HeaderAuth title="Welcome Back" />

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
                  <TitleAuth
                    title="Reactivate Your Account"
                    description={`Your account is scheduled for deletion. Enter the code sent to +${phone} to reactivate it.`}
                  />

                  <View ref={otpContainerRef}>
                    <TextInput
                      value={otp}
                      onChangeText={(val) =>
                        setOtp(val.replace(/[^0-9]/g, "").slice(0, 6))
                      }
                      keyboardType="number-pad"
                      maxLength={6}
                      placeholder="Enter Code"
                      className="border border-slate-200 rounded-2xl px-4 py-4 text-base text-slate-800 bg-slate-50 overflow-hidden"
                      editable={!isBusy}
                    />
                  </View>

                  <View className="flex-row justify-between items-center mt-6 mb-2 px-1">
                    <Text className="text-slate-500 text-sm">
                      Didn&apos;t get the code?
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
                          : "Resend Code"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={handleVerify}
                    disabled={otp.length < 6 || isBusy}
                    className={`mt-5 p-5 rounded-2xl flex-row justify-center items-center ${
                      otp.length < 6 || isBusy ? "bg-slate-300" : "bg-primary"
                    }`}
                  >
                    {verifyMutation.isPending || navigating ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white font-bold text-lg">
                        Reactivate & Log In
                      </Text>
                    )}
                  </TouchableOpacity>
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
        onClose={() => setAlert({ ...alert, visible: false })}
      />
    </KeyboardAwareScrollView>
  );
}
