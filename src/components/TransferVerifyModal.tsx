import { biometricService } from "@/services/biometricService";
import { profileService } from "@/services/profileService";
import { Ionicons } from "@expo/vector-icons";
import * as NavigationBar from "expo-navigation-bar";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export type TransferVerification =
  | { method: "password"; password: string }
  | { method: "biometric"; device_id: string };

interface TransferVerifyModalProps {
  visible: boolean;
  loading?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onVerify: (verification: TransferVerification) => void;
}

const MODAL_SHADOW = {
  shadowColor: "#000",
  shadowOffset: {
    width: 0,
    height: 4,
  },
  shadowOpacity: 0.15,
  shadowRadius: 10,
  elevation: 10,
};

type ViewMode = "checking" | "choose" | "password";

export function TransferVerifyModal({
  visible,
  loading = false,
  errorMessage,
  onClose,
  onVerify,
}: TransferVerifyModalProps) {
  const router = useRouter();

  const [viewMode, setViewMode] = useState<ViewMode>("checking");
  const [isSupported, setIsSupported] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [biometryLabel, setBiometryLabel] = useState("Biometrics");
  const [deviceId, setDeviceId] = useState("");

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(
    errorMessage || null,
  );

  // Sync external errorMessage prop with localError state
  useEffect(() => {
    setLocalError(errorMessage || null);
  }, [errorMessage, visible]);

  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setVisibilityAsync(visible ? "hidden" : "visible");
    }

    return () => {
      if (Platform.OS === "android") {
        NavigationBar.setVisibilityAsync("visible");
      }
    };
  }, [visible]);

  // Check hardware support + whether this device is registered & enabled
  // for Quick and Secure Login on this account.
  useEffect(() => {
    if (!visible) {
      return;
    }

    let cancelled = false;

    (async () => {
      setViewMode("checking");
      setPassword("");
      setShowPassword(false);

      try {
        const { available, biometryType } =
          await biometricService.isSupported();
        const id = await biometricService.getDeviceId();

        let registered = false;

        try {
          const devices = await profileService.getAuthDevices();
          const match = devices.find((d: any) => d.device_id === id);
          registered = !!match?.biometric_enabled;
        } catch {
          registered = false;
        }

        if (cancelled) {
          return;
        }

        setIsSupported(available);
        setIsRegistered(registered);
        setBiometryLabel(biometricService.getBiometryLabel(biometryType));
        setDeviceId(id);
        setViewMode(available && registered ? "choose" : "password");
      } catch {
        if (!cancelled) {
          setIsSupported(false);
          setIsRegistered(false);
          setViewMode("password");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible]);

  const handleClose = () => {
    if (loading) {
      return;
    }

    onClose();
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (localError) {
      setLocalError(null);
    }
  };

  const handleUseBiometric = async () => {
    if (loading) return;

    // Fallback check if deviceId is not set yet
    let activeDeviceId = deviceId;
    if (!activeDeviceId) {
      activeDeviceId = await biometricService.getDeviceId();
      setDeviceId(activeDeviceId);
    }

    if (!activeDeviceId) {
      setLocalError("Unable to identify device ID. Please use password.");
      return;
    }

    const authenticated = await biometricService.promptBiometrics(
      `Confirm your ${biometryLabel} to authorize this transfer`,
    );

    if (!authenticated) return;

    onVerify({ method: "biometric", device_id: activeDeviceId });
  };

  const handleGoSetupBiometrics = () => {
    if (loading) {
      return;
    }

    onClose();
    router.push("/(main-profile)/biometricSettings");
  };

  const handleSubmitPassword = () => {
    if (!password || loading) {
      return;
    }

    onVerify({ method: "password", password });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: 24,
          }}
          keyboardShouldPersistTaps="handled"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
        >
          <View
            className="bg-white w-full max-w-[400px] mx-auto rounded-[35px] p-6"
            style={MODAL_SHADOW}
          >
            <Text className="text-primary text-2xl font-bold text-center mb-3">
              Verify Transfer
            </Text>

            <Text className="text-slate-500 text-base text-center mb-6 leading-6">
              Confirm it{"'"}s really you before we send this transfer.
            </Text>

            {viewMode === "checking" && (
              <View className="items-center py-6">
                <ActivityIndicator color="#034194" />
              </View>
            )}

            {viewMode === "password" && (
              <View>
                <View className="flex-row items-center border border-gray-200 rounded-2xl px-4 mb-4">
                  <TextInput
                    value={password}
                    onChangeText={handlePasswordChange}
                    placeholder="Enter your account password"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    editable={!loading}
                    returnKeyType="done"
                    blurOnSubmit={false}
                    onSubmitEditing={handleSubmitPassword}
                    className="flex-1 text-[#333] text-base py-3.5"
                  />

                  <TouchableOpacity
                    onPress={() => setShowPassword((prev) => !prev)}
                    disabled={loading}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    className="pl-2"
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#64748B"
                    />
                  </TouchableOpacity>
                </View>

                {isSupported && !isRegistered && (
                  <View>
                    <View className="flex-row items-center mb-4">
                      <View className="flex-1 h-[1px] bg-gray-200" />
                      <Text className="px-3 text-gray-400 text-xs">OR</Text>
                      <View className="flex-1 h-[1px] bg-gray-200" />
                    </View>

                    <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                      <Text className="text-amber-800 text-sm mb-2">
                        Quick & Secure Login isn{"'"}t set up on this device
                        yet. Enable it for faster verification next time.
                      </Text>

                      <TouchableOpacity
                        onPress={handleGoSetupBiometrics}
                        disabled={loading}
                        className="self-start"
                      >
                        <Text className="text-primary text-sm font-bold">
                          Set it up now →
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {!!localError && (
                  <Text className="text-[#D70127] text-xs mb-2 ml-1">
                    {localError}
                  </Text>
                )}

                {isSupported && isRegistered && (
                  <TouchableOpacity
                    onPress={() => setViewMode("choose")}
                    disabled={loading}
                    className="items-center py-2 mt-1"
                  >
                    <Text className="text-primary underline text-sm font-medium">
                      Use {biometryLabel} instead
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {viewMode === "choose" && (
              <View>
                {/* Password option — now on top */}
                <TouchableOpacity
                  onPress={() => setViewMode("password")}
                  disabled={loading}
                  activeOpacity={0.8}
                  className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-3"
                  style={{ opacity: loading ? 0.6 : 1 }}
                >
                  <View className="bg-white p-2.5 rounded-xl mr-3">
                    <Ionicons
                      name="lock-closed-outline"
                      size={22}
                      color="#334155"
                    />
                  </View>

                  <View className="flex-1">
                    <Text className="text-slate-700 font-medium text-base">
                      Use account password
                    </Text>
                    <Text className="text-slate-500 text-xs mt-0.5">
                      Enter your account password
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </TouchableOpacity>

                <View className="flex-row items-center mb-4">
                  <View className="flex-1 h-[1px] bg-gray-200" />
                  <Text className="px-3 text-gray-400 text-xs">OR</Text>
                  <View className="flex-1 h-[1px] bg-gray-200" />
                </View>

                {/* Quick & Secure Login option — now on bottom */}
                <TouchableOpacity
                  onPress={handleUseBiometric}
                  disabled={loading}
                  activeOpacity={0.8}
                  className="flex-row items-center bg-primary/10 border border-primary rounded-2xl p-4"
                  style={{ opacity: loading ? 0.6 : 1 }}
                >
                  <View className="bg-white p-2.5 rounded-xl mr-3">
                    <Ionicons
                      name="finger-print-outline"
                      size={22}
                      color="#034194"
                    />
                  </View>

                  <View className="flex-1">
                    <Text className="text-primary font-medium text-base">
                      Use {biometryLabel}
                    </Text>
                    <Text className="text-slate-500 text-xs mt-0.5">
                      Quick & Secure Login on this device
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            )}

            {!!localError && viewMode === "choose" && (
              <Text className="text-[#D70127] text-xs mb-2 mt-2 text-center">
                {localError}
              </Text>
            )}

            <View className="flex-row gap-x-3 mt-5">
              <TouchableOpacity
                onPress={handleClose}
                disabled={loading}
                activeOpacity={0.8}
                className="flex-1 bg-gray-100 p-4 rounded-2xl"
                style={{ opacity: loading ? 0.6 : 1 }}
              >
                <Text className="text-gray-600 text-center font-bold text-base">
                  Cancel
                </Text>
              </TouchableOpacity>

              {viewMode === "password" && (
                <TouchableOpacity
                  onPress={handleSubmitPassword}
                  disabled={loading || !password}
                  activeOpacity={0.8}
                  className="flex-1 p-4 bg-primary rounded-2xl items-center justify-center"
                  style={{ opacity: loading || !password ? 0.6 : 1 }}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text className="text-white text-center font-bold text-base">
                      Confirm
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
