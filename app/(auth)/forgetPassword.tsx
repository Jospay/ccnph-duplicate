import { AuthInput } from "@/components/AuthInput";
import { CustomAlert } from "@/components/CustomAlert";
import HeaderAuth from "@/components/HeaderAuth";
import { LoginSkeleton } from "@/components/LoginSkeleton";
import LogoAuth from "@/components/LogoAuth";
import TitleAuth from "@/components/TitleAuth";
import { authService } from "@/services/forgetService";
import { useMutation } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import "../../global.css";

type Step = "PHONE" | "OTP" | "RESET";

export default function ForgotPasswordPage() {
  const router = useRouter();

  // Flow Tracking States
  const [step, setStep] = useState<Step>("PHONE");
  const [verificationToken, setVerificationToken] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // local safety flag to strictly prevent race conditions from rapid micro-clicks
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Management States
  const [form, setForm] = useState({
    number: "",
    otpCode: "",
    password: "",
    passwordConfirmation: "",
  });

  const [status, setStatus] = useState({
    navigating: false,
    pageLoading: true,
  });

  const [alert, setAlert] = useState({
    visible: false,
    title: "",
    message: "",
    onCloseOverride: null as (() => void) | null,
  });

  // Handle countdown timer for OTP retry states
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  useFocusEffect(
    useCallback(() => {
      setStatus((prev) => ({ ...prev, navigating: false }));
      setIsSubmitting(false);
      if (Platform.OS === "android") {
        StatusBar.setTranslucent(true);
        StatusBar.setBackgroundColor("transparent");
      }
    }, []),
  );

  useEffect(() => {
    const timer = setTimeout(
      () => setStatus((prev) => ({ ...prev, pageLoading: false })),
      400,
    );
    return () => clearTimeout(timer);
  }, []);

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

  const handleNumberChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    if (cleaned === "") {
      setForm({ ...form, number: "" });
      return;
    }
    let formatted = cleaned;
    if (formatted.length >= 1 && formatted[0] !== "0") {
      formatted = "0" + formatted;
    }
    if (formatted.length >= 2 && formatted[1] !== "9") {
      formatted = "09" + formatted.substring(1);
    }
    setForm({ ...form, number: formatted.slice(0, 11) });
  };

  // Helper to send the standard 09XXXXXXXXX local format to the backend safely
  const getBackendPhone = () => form.number;

  // Extracted Helper to accurately parse validation/exception errors from backend
  const getBackendErrorMessage = (error: any, fallback: string) => {
    if (error?.response?.data?.errors) {
      const errorValues = Object.values(error.response.data.errors);
      return Array.isArray(errorValues[0])
        ? errorValues[0][0]
        : String(errorValues[0]);
    }
    if (error?.response?.data?.message) {
      return error.response.data.message;
    }
    if (error?.message) {
      return error.message;
    }
    return fallback;
  };

  // Step 1 Mutation: Request OTP Code
  const sendOtpMutation = useMutation({
    mutationFn: () => authService.sendForgotOtp({ phone: getBackendPhone() }),
    onSuccess: (data) => {
      if (data.retry_after) setCooldown(data.retry_after);
      setTimeout(() => {
        showAlert(
          data.status === "pending" ? "Request Pending" : "Success",
          data.message || "An OTP validation code was sent.",
          () => setStep("OTP"),
        );
      }, 150);
    },
    onError: (error: any) => {
      const msg = getBackendErrorMessage(
        error,
        "Failed to initiate recovery context.",
      );
      setTimeout(() => showAlert("Request Failed", msg), 150);
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  // Resend Mutation Trigger
  const resendOtpMutation = useMutation({
    mutationFn: () => authService.resendForgotOtp({ phone: getBackendPhone() }),
    onSuccess: (data) => {
      if (data.retry_after) setCooldown(data.retry_after);
      setTimeout(() => {
        showAlert("Success", data.message || "A fresh code was dispatched.");
      }, 150);
    },
    onError: (error: any) => {
      const msg = getBackendErrorMessage(
        error,
        "Could not re-route dynamic verification code.",
      );
      setTimeout(() => showAlert("OTP Resend Failed", msg), 150);
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  // Step 2 Mutation: Acknowledge & Validate OTP Code
  const verifyOtpMutation = useMutation({
    mutationFn: () =>
      authService.verifyForgotOtp({
        phone: getBackendPhone(),
        otp_code: form.otpCode,
      }),
    onSuccess: (data) => {
      if (data.verification_token) {
        setVerificationToken(data.verification_token);
        setTimeout(() => {
          showAlert(
            "Success",
            "Identity verified. Please set your new password.",
            () => {
              setStep("RESET");
            },
          );
        }, 150);
      }
    },
    onError: (error: any) => {
      const msg = getBackendErrorMessage(
        error,
        "Original validation token mismatch or invalid code.",
      );
      setTimeout(() => showAlert("Verification Failed", msg), 150);
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  // Step 3 Mutation: Save Password Update
  const resetPasswordMutation = useMutation({
    mutationFn: () =>
      authService.resetPassword({
        phone: getBackendPhone(),
        verification_token: verificationToken,
        password: form.password,
        password_confirmation: form.passwordConfirmation,
      }),
    onSuccess: (data) => {
      setTimeout(() => {
        showAlert(
          "Password Updated",
          data.message || "Password updated completely.",
          () => {
            setStatus((prev) => ({ ...prev, navigating: true }));
            router.replace("/login");
          },
        );
      }, 150);
    },
    onError: (error: any) => {
      const msg = getBackendErrorMessage(
        error,
        "Could not update credentials data.",
      );
      setTimeout(() => showAlert("Password Update Failed", msg), 150);
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  // Unified Multi-Step Flow Router Handler
  const handlePrimaryAction = () => {
    // Rigid sync layer locking out incoming microtask triggers
    if (isBusy || isSubmitting) return;

    if (step === "PHONE") {
      if (form.number.length !== 11) {
        return showAlert(
          "Validation Error",
          "Mobile number must be exactly 11 digits.",
        );
      }
      setIsSubmitting(true);
      sendOtpMutation.mutate();
    } else if (step === "OTP") {
      if (!form.otpCode.trim()) {
        return showAlert(
          "Validation Error",
          "Please provide the active OTP token code.",
        );
      }
      setIsSubmitting(true);
      verifyOtpMutation.mutate();
    } else if (step === "RESET") {
      if (!form.password || !form.passwordConfirmation) {
        return showAlert("Required", "Please fill in both password fields.");
      }
      if (form.password.length < 8) {
        return showAlert(
          "Security",
          "Password must be at least 8 characters long.",
        );
      }
      if (form.password !== form.passwordConfirmation) {
        return showAlert("Mismatch", "Passwords do not match.");
      }
      setIsSubmitting(true);
      resetPasswordMutation.mutate();
    }
  };

  const handleResendAction = () => {
    if (cooldown > 0 || isBusy || isSubmitting) return;
    setIsSubmitting(true);
    resendOtpMutation.mutate();
  };

  const isPendingState =
    sendOtpMutation.isPending ||
    verifyOtpMutation.isPending ||
    resetPasswordMutation.isPending ||
    resendOtpMutation.isPending;

  const isBusy = isPendingState || status.navigating || isSubmitting;

  return (
    <>
      <StatusBar hidden={true} />

      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
        bottomOffset={20}
      >
        <View className="flex-1 bg-slate-50">
          <HeaderAuth title="Security" />

          <View className="flex-1 -mt-10">
            <View className="bg-primary h-[240px] rounded-b-[60px] absolute w-full top-0" />

            <View className="mx-5 pb-10 max-w-[500px] w-[90%] self-center">
              <View className="bg-white p-6 rounded-[40px] shadow-black/20 shadow-md elevation-4">
                {status.pageLoading ? (
                  <LoginSkeleton />
                ) : (
                  <>
                    <LogoAuth />

                    {/* Step 1 UI Context */}
                    {step === "PHONE" && (
                      <>
                        <TitleAuth
                          title="Forgot Password"
                          containerClass="mb-8 mt-2"
                          description="Enter your registered phone to receive verification details."
                        />
                        <AuthInput
                          label="Mobile Number"
                          placeholder="09123456789"
                          value={form.number}
                          onChangeText={handleNumberChange}
                          keyboardType="phone-pad"
                          maxLength={11}
                          editable={!isBusy}
                        />
                      </>
                    )}

                    {/* Step 2 UI Context */}
                    {step === "OTP" && (
                      <>
                        <TitleAuth
                          title="OTP Verification"
                          containerClass="mb-8 mt-2"
                          description={`Enter OTP sent to ${form.number}`}
                        />
                        <AuthInput
                          label="OTP Verification Code"
                          placeholder="Enter OTP Code"
                          value={form.otpCode}
                          onChangeText={(val) =>
                            setForm({ ...form, otpCode: val })
                          }
                          keyboardType="number-pad"
                          editable={!isBusy}
                        />
                        <View className="flex-row justify-between items-center mb-6 px-1">
                          <Text className="text-slate-500 text-sm">
                            Didn&apos;t get code?
                          </Text>
                          <TouchableOpacity
                            onPress={handleResendAction}
                            disabled={cooldown > 0 || isBusy}
                          >
                            <Text
                              className={`font-semibold text-sm ${
                                cooldown > 0 || isBusy
                                  ? "text-slate-400"
                                  : "text-primary"
                              }`}
                            >
                              {cooldown > 0
                                ? `Resend in ${cooldown}s`
                                : "Resend OTP"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}

                    {/* Step 3 UI Context */}
                    {step === "RESET" && (
                      <>
                        <TitleAuth
                          title="Reset Password"
                          containerClass="mb-8 mt-2"
                          description="Please configure a fresh password update context configuration secure credentials."
                        />

                        <AuthInput
                          label="New Password"
                          placeholder="Minimum 8 characters"
                          value={form.password}
                          onChangeText={(val) =>
                            setForm({ ...form, password: val })
                          }
                          editable={!isBusy}
                          isPassword
                          showPassword={showPassword}
                          onTogglePassword={() =>
                            setShowPassword(!showPassword)
                          }
                        />

                        <AuthInput
                          label="Confirm New Password"
                          placeholder="Repeat your password"
                          value={form.passwordConfirmation}
                          onChangeText={(val) =>
                            setForm({
                              ...form,
                              passwordConfirmation: val,
                            })
                          }
                          editable={!isBusy}
                          isPassword
                          showPassword={showConfirmPassword}
                          onTogglePassword={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                        />
                      </>
                    )}

                    {/* Central Dispatch Interface Trigger Action */}
                    <TouchableOpacity
                      onPress={handlePrimaryAction}
                      disabled={isBusy}
                      activeOpacity={0.8}
                      className={`p-5 rounded-2xl shadow-lg flex-row justify-center items-center ${
                        isBusy ? "bg-slate-400" : "bg-primary"
                      }`}
                    >
                      {isPendingState ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <Text className="text-white font-bold text-lg">
                          {status.navigating
                            ? "Processing..."
                            : step === "PHONE"
                              ? "Send Verification"
                              : step === "OTP"
                                ? "Verify OTP"
                                : "Update Password"}
                        </Text>
                      )}
                    </TouchableOpacity>

                    {/* Return Route Control Footer */}
                    <TouchableOpacity
                      className="mt-5 self-center"
                      disabled={isBusy}
                      onPress={() => {
                        if (step === "OTP") setStep("PHONE");
                        else router.back();
                      }}
                    >
                      <Text className="text-primary text-lg font-bold">
                        {step === "OTP"
                          ? "Back to Change Number"
                          : "Back to Login"}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </View>
        </View>
      </KeyboardAwareScrollView>

      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        onClose={() => {
          setAlert((prev) => ({ ...prev, visible: false }));
          if (alert.onCloseOverride) {
            alert.onCloseOverride();
          }
        }}
      />
    </>
  );
}
