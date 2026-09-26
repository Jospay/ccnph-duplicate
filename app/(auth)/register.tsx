import { AuthInput } from "@/components/AuthInput";
import { CustomAlert } from "@/components/CustomAlert";
import HeaderAuth from "@/components/HeaderAuth";
import LinkAuth from "@/components/LinkAuth";
import { LoginSkeleton } from "@/components/LoginSkeleton";
import LogoAuth from "@/components/LogoAuth";
import TitleAuth from "@/components/TitleAuth";
import {
  accountRegisterService,
  RegisterPayload,
} from "@/services/accountRegister";
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

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    fullName: "",
    number: "",
  });

  const [status, setStatus] = useState({
    navigating: false,
    pageLoading: true,
  });

  const [alert, setAlert] = useState({
    visible: false,
    title: "",
    message: "",
  });

  useFocusEffect(
    useCallback(() => {
      setStatus((prev) => ({ ...prev, navigating: false }));

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

  const showAlert = (title: string, message: string) => {
    setAlert({ visible: true, title, message });
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

  const mutation = useMutation({
    mutationFn: (data: RegisterPayload) =>
      accountRegisterService.register(data),

    onSuccess: (data) => {
      if (data.status === "otp_sent" || data.status === "pending") {
        setTimeout(() => {
          showAlert(
            data.status === "pending" ? "Note" : "Success",
            data.message || "OTP has been sent to your mobile number.",
          );
        }, 150);
      }
    },

    onError: (error: any) => {
      let msg = "Registration failed. Please try again.";

      if (error?.errors) {
        const errorValues = Object.values(error.errors);
        msg = Array.isArray(errorValues[0])
          ? errorValues[0][0]
          : String(errorValues[0]);
      } else if (error?.message) {
        msg = error.message;
      }

      setTimeout(() => {
        showAlert("Registration Error", msg);
      }, 150);
    },
  });

  const handleRegister = () => {
    if (mutation.isPending || status.navigating) return;

    if (!form.fullName.trim() || !form.number.trim()) {
      return showAlert("Required", "Please fill in all fields");
    }

    if (form.number.length !== 11) {
      return showAlert(
        "Invalid Number",
        "Mobile number must be exactly 11 digits (starting with 09).",
      );
    }

    mutation.mutate({
      name: form.fullName.trim(),
      phone: `63${form.number.substring(1)}`,
    });
  };

  const isBusy = mutation.isPending || status.navigating;

  return (
    <>
      <StatusBar hidden={true} />

      <KeyboardAwareScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 30,
        }}
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
              <View className="bg-white p-6 rounded-[40px] shadow-black/20 shadow-md elevation-4">
                {status.pageLoading ? (
                  <LoginSkeleton />
                ) : (
                  <>
                    <LogoAuth />

                    <TitleAuth
                      title="Register Account"
                      containerClass="mb-8 mt-2"
                      description="Create an Account to get started"
                    />

                    <AuthInput
                      label="Full Name"
                      placeholder="Enter your full name"
                      value={form.fullName}
                      onChangeText={(val) =>
                        setForm({ ...form, fullName: val })
                      }
                      autoCapitalize="words"
                      editable={!isBusy}
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

                    <TouchableOpacity
                      onPress={handleRegister}
                      disabled={isBusy}
                      activeOpacity={0.8}
                      className={`p-5 rounded-2xl shadow-lg flex-row justify-center items-center ${
                        isBusy ? "bg-slate-400" : "bg-primary"
                      }`}
                    >
                      {mutation.isPending ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <Text className="text-white font-bold text-lg">
                          {status.navigating
                            ? "Redirecting..."
                            : "Register Now"}
                        </Text>
                      )}
                    </TouchableOpacity>

                    <LinkAuth
                      onNavigating={(val) =>
                        setStatus((p) => ({
                          ...p,
                          navigating: val,
                        }))
                      }
                      isNavigating={status.navigating}
                    />
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
          setAlert({ ...alert, visible: false });

          if (mutation.isSuccess) {
            setStatus((prev) => ({ ...prev, navigating: true }));
            router.push({
              pathname: "/otpVerification",
              params: { phone: `63${form.number.substring(1)}` },
            });
          }
        }}
      />
    </>
  );
}
