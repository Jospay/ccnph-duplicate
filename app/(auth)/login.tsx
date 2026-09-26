import { authService } from "@/services/authService";
import { biometricService } from "@/services/biometricService";
import { reactivationService } from "@/services/reactivationService";
import { useAuthStore } from "@/store/useAuthStore";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

// Components
import { AuthInput } from "@/components/AuthInput";
import { CustomAlert } from "@/components/CustomAlert";
import HeaderAuth from "@/components/HeaderAuth";
import LinkAuth from "@/components/LinkAuth";
import { LoginSkeleton } from "@/components/LoginSkeleton";
import LogoAuth from "@/components/LogoAuth";
import TitleAuth from "@/components/TitleAuth";
import "../../global.css";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [form, setForm] = useState({ number: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  const [alert, setAlert] = useState({
    visible: false,
    title: "",
    message: "",
    onCloseOverride: null as (() => void) | null,
  });

  const [biometricAlert, setBiometricAlert] = useState({
    visible: false,
    title: "",
    message: "",
  });

  const [reactivationAlert, setReactivationAlert] = useState({
    visible: false,
    title: "",
    message: "",
    phone: "",
  });

  const [loadingState, setLoadingState] = useState({
    page: true,
    action: false,
    nav: false,
    biometric: false,
  });

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometryLabel, setBiometryLabel] = useState<string>("Biometrics");
  const [currentDeviceId, setCurrentDeviceId] = useState<string>("");
  const [hasBiometricEnabled, setHasBiometricEnabled] = useState(false);

  const isProcessing = useRef(false);
  const isDisabled = loadingState.action || loadingState.nav;

  useEffect(() => {
    const timer = setTimeout(
      () => setLoadingState((prev) => ({ ...prev, page: false })),
      400,
    );
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const initBiometric = async () => {
      try {
        const { available, biometryType } =
          await biometricService.isSupported();
        setBiometricAvailable(available);
        setBiometryLabel(biometricService.getBiometryLabel(biometryType));

        const deviceId = await biometricService.getDeviceId();
        setCurrentDeviceId(deviceId);

        if (available) {
          const publicKey = await biometricService.createKeys();
          setHasBiometricEnabled(!!publicKey);
        }
      } catch (error) {
        console.error("Biometric initialization error:", error);
      }
    };

    initBiometric();
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

  const showBiometricAlert = (title: string, message: string) => {
    setBiometricAlert({ visible: true, title, message });
  };

  const sendReactivationOtp = async (phone: string) => {
    if (isProcessing.current) return;

    isProcessing.current = true;
    setLoadingState((prev) => ({ ...prev, action: true }));

    try {
      const data = await reactivationService.send({
        phone,
        password: form.password,
      });

      isProcessing.current = false;
      setLoadingState((prev) => ({ ...prev, action: false, nav: true }));

      router.push({
        pathname: "/reactivateOtp",
        params: {
          phone,
          retryAfter: String(data.retry_after ?? 300),
        },
      });
    } catch (error: any) {
      isProcessing.current = false;
      setLoadingState((prev) => ({ ...prev, action: false, nav: false }));

      const msg =
        error?.message || "Failed to send verification code. Please try again.";
      showAlert("Error", msg);
    }
  };

  const handleLogin = async () => {
    if (isProcessing.current || loadingState.action || loadingState.nav) return;

    if (!form.number.trim() || !form.password.trim()) {
      return showAlert(
        "Input Error",
        "Please fill in all required fields to continue.",
      );
    }

    isProcessing.current = true;
    setLoadingState((prev) => ({ ...prev, action: true }));

    try {
      const data = await authService.login(form.number, form.password);
      await setAuth(data.token, data.user);

      setLoadingState((prev) => ({ ...prev, nav: true }));
      router.replace("/(main)");
    } catch (error: any) {
      isProcessing.current = false;
      setLoadingState((prev) => ({ ...prev, action: false }));

      if (error?.status === "pending_reactivation") {
        setReactivationAlert({
          visible: true,
          title: "Account Scheduled for Deletion",
          message:
            error.message ||
            "Your account is scheduled for deletion. Would you like to reactivate it? We'll send a verification code to your phone.",
          phone: error.phone || form.number,
        });
        return;
      }

      let msg = "An unexpected error occurred. Please try again.";

      if (error?.errors) {
        const errorValues = Object.values(error.errors);
        msg = Array.isArray(errorValues[0])
          ? errorValues[0][0]
          : String(errorValues[0]);
      } else if (error?.message) {
        msg = error.message;
      }

      showAlert("Login Failed", msg);
    }
  };

  const handleBiometricLogin = async () => {
    if (
      isProcessing.current ||
      loadingState.action ||
      loadingState.nav ||
      loadingState.biometric
    )
      return;

    if (!biometricAvailable) {
      showBiometricAlert(
        "Not Supported",
        "Biometric authentication is not available on this device.",
      );
      return;
    }

    if (!hasBiometricEnabled) {
      showBiometricAlert(
        "Not Enabled",
        "Please enable biometric login in your security settings first.",
      );
      return;
    }

    isProcessing.current = true;
    setLoadingState((prev) => ({ ...prev, biometric: true }));

    try {
      const authenticated = await biometricService.promptBiometrics(
        `Authenticate with ${biometryLabel} to login`,
      );

      if (!authenticated) {
        isProcessing.current = false;
        setLoadingState((prev) => ({ ...prev, biometric: false }));
        return;
      }

      const publicKey = await biometricService.createKeys();
      const data = await authService.biometricLogin(currentDeviceId, publicKey);
      await setAuth(data.token, data.user);

      setLoadingState((prev) => ({ ...prev, nav: true }));
      router.replace("/(main)");
    } catch (error: any) {
      isProcessing.current = false;
      setLoadingState((prev) => ({ ...prev, biometric: false }));

      if (error?.status === "pending_reactivation") {
        showBiometricAlert(
          "Account Scheduled for Deletion",
          error.message ||
            "Your account is scheduled for deletion. Please log in with your phone number and password to reactivate it.",
        );
        return;
      }

      let msg = "Biometric login failed. Please try again.";

      if (error?.errors) {
        const errorValues = Object.values(error.errors);
        msg = Array.isArray(errorValues[0])
          ? errorValues[0][0]
          : String(errorValues[0]);
      } else if (error?.message) {
        msg = error.message;
      }

      showBiometricAlert("Login Failed", msg);
    }
  };

  const handleForgotPassword = () => {
    if (isDisabled) return;
    router.push("/forgetPassword");
  };

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      bounces={false}
      bottomOffset={20}
    >
      <View className="flex-1 bg-slate-50">
        <HeaderAuth title="Hello" subtitle="Welcome back!" />

        <View className="flex-1 -mt-10">
          <View className="bg-primary h-[240px] rounded-b-[60px] absolute w-full top-0" />

          <View className="mx-5 pb-10 pt-5 max-w-[500px] w-[90%] self-center">
            <View className="bg-white p-6 rounded-[40px] shadow-black/20 shadow-md elevation-4 mb-10">
              {loadingState.page ? (
                <LoginSkeleton />
              ) : (
                <>
                  <LogoAuth />

                  <TitleAuth
                    title="Login Account"
                    description="Log in to your account to securely access your dashboard and manage your features."
                  />

                  {biometricAvailable && hasBiometricEnabled && (
                    <TouchableOpacity
                      onPress={handleBiometricLogin}
                      disabled={isDisabled || loadingState.biometric}
                      activeOpacity={0.8}
                      className={`mb-4 p-4 rounded-2xl flex-row justify-center items-center border-2 ${
                        isDisabled || loadingState.biometric
                          ? "border-slate-300 bg-slate-50"
                          : "border-primary bg-primary/5"
                      }`}
                    >
                      {loadingState.biometric ? (
                        <ActivityIndicator color="#034194" />
                      ) : (
                        <>
                          <Ionicons
                            name="finger-print"
                            size={20}
                            color="#034194"
                            style={{ marginRight: 8 }}
                          />
                          <Text className="text-primary font-bold text-base">
                            Login with {biometryLabel}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {biometricAvailable && hasBiometricEnabled && (
                    <View className="flex-row items-center mb-4">
                      <View className="flex-1 h-[1px] bg-gray-200" />
                      <Text className="px-3 text-gray-400 text-xs">OR</Text>
                      <View className="flex-1 h-[1px] bg-gray-200" />
                    </View>
                  )}

                  <AuthInput
                    label="Mobile Number"
                    placeholder="09123456789"
                    value={form.number}
                    onChangeText={(val) => setForm({ ...form, number: val })}
                    keyboardType="phone-pad"
                    editable={!isDisabled}
                  />

                  <AuthInput
                    label="Password"
                    placeholder="••••••••"
                    value={form.password}
                    onChangeText={(val) => setForm({ ...form, password: val })}
                    editable={!isDisabled}
                    isPassword={true}
                    showPassword={showPassword}
                    onTogglePassword={() => setShowPassword(!showPassword)}
                    hasForgotPassword={true}
                    onForgotPassword={handleForgotPassword}
                  />

                  <TouchableOpacity
                    onPress={handleLogin}
                    disabled={isDisabled}
                    activeOpacity={0.8}
                    className={`mt-3 p-5 rounded-2xl shadow-lg flex-row justify-center items-center ${
                      isDisabled ? "bg-slate-400" : "bg-primary"
                    }`}
                  >
                    {loadingState.action ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white font-bold text-lg">
                        {loadingState.nav ? "Redirecting..." : "Log in"}
                      </Text>
                    )}
                  </TouchableOpacity>

                  <LinkAuth
                    onNavigating={(val) =>
                      setLoadingState((p) => ({
                        ...p,
                        nav: val,
                      }))
                    }
                    isNavigating={loadingState.nav}
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

      <CustomAlert
        visible={biometricAlert.visible}
        title={biometricAlert.title}
        message={biometricAlert.message}
        onClose={() => setBiometricAlert({ ...biometricAlert, visible: false })}
      />

      <CustomAlert
        visible={reactivationAlert.visible}
        title={reactivationAlert.title}
        message={reactivationAlert.message}
        confirmText="Okay"
        onClose={() =>
          setReactivationAlert((prev) => ({ ...prev, visible: false }))
        }
        onConfirm={() => {
          const targetPhone = reactivationAlert.phone;
          setReactivationAlert((prev) => ({ ...prev, visible: false }));
          sendReactivationOtp(targetPhone);
        }}
      />
    </KeyboardAwareScrollView>
  );
}
