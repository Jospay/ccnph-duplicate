import { CustomAlert } from "@/components/CustomAlert";
import { PasswordPromptModal } from "@/components/PasswordPromptModal";
import { biometricService } from "@/services/biometricService";
import { profileService } from "@/services/profileService";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface AuthDevice {
  id: number;
  device_id: string;
  platform: "android" | "ios";
  device_name: string | null;
  biometric_enabled: boolean;
  last_used_at: string | null;
  created_at: string;
}

const CARD_SHADOW = {
  shadowColor: "#000",
  shadowOffset: {
    width: 0,
    height: 1,
  },
  shadowOpacity: 0.05,
  shadowRadius: 2,
  elevation: 2,
};

type PasswordModalMode = "enable" | "remove" | null;

export default function BiometricSettingsScreen() {
  const router = useRouter();
  const isMounted = useRef(true);

  // Prevent state updates after unmount
  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  // Hardware & local state
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [biometryLabel, setBiometryLabel] = useState<string>("Biometrics");
  const [currentDeviceId, setCurrentDeviceId] = useState<string>("");

  // UI state
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);

  // Device list
  const [devices, setDevices] = useState<AuthDevice[]>([]);
  const [currentDevice, setCurrentDevice] = useState<AuthDevice | null>(null);

  // Custom Alert
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    visible: false,
    title: "",
    message: "",
  });

  const [successAlertConfig, setSuccessAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({
    visible: false,
    title: "",
    message: "",
  });

  // Password confirmation modal (used for both enabling and removing a device)
  const [passwordModal, setPasswordModal] = useState<{
    visible: boolean;
    mode: PasswordModalMode;
    target: AuthDevice | null;
    errorMessage: string | null;
  }>({
    visible: false,
    mode: null,
    target: null,
    errorMessage: null,
  });

  // Safe state setter
  const safeSetState = useCallback((setter: () => void) => {
    if (isMounted.current) {
      setter();
    }
  }, []);

  // Initialize biometric hardware and fetch devices
  const initData = async (isRefresh = false) => {
    if (!isRefresh) {
      safeSetState(() => setLoading(true));
    }

    try {
      const { available, biometryType } = await biometricService.isSupported();

      safeSetState(() => {
        setIsSupported(available);
        setBiometryLabel(biometricService.getBiometryLabel(biometryType));
      });

      const deviceId = await biometricService.getDeviceId();

      safeSetState(() => {
        setCurrentDeviceId(deviceId);
      });

      try {
        const deviceList: AuthDevice[] = await profileService.getAuthDevices();

        safeSetState(() => {
          const normalizedDevices = Array.isArray(deviceList) ? deviceList : [];

          setDevices(normalizedDevices);

          const foundCurrent = normalizedDevices.find(
            (device) => device.device_id === deviceId,
          );

          setCurrentDevice(foundCurrent || null);
        });
      } catch (apiError: any) {
        console.error(
          "Auth Devices API Error:",
          apiError?.response?.data || apiError?.message,
        );

        safeSetState(() => {
          setDevices([]);
          setCurrentDevice(null);
        });
      }
    } catch (error) {
      console.error("Biometric Hardware Init Error:", error);
    } finally {
      safeSetState(() => {
        setLoading(false);
        setRefreshing(false);
      });
    }
  };

  useEffect(() => {
    initData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    initData(true);
  }, []);

  const closePasswordModal = () => {
    setPasswordModal({
      visible: false,
      mode: null,
      target: null,
      errorMessage: null,
    });
  };

  // Step 1: biometric prompt, then open password modal instead of finishing immediately
  const handleEnableBiometrics = async () => {
    if (!isSupported) {
      Alert.alert(
        "Not Supported",
        "Biometric authentication is not available or enabled on this device.",
      );
      return;
    }

    try {
      setProcessing(true);

      const authenticated = await biometricService.promptBiometrics(
        `Confirm your ${biometryLabel} to enable quick login`,
      );

      setProcessing(false);

      if (!authenticated) {
        return;
      }

      setPasswordModal({
        visible: true,
        mode: "enable",
        target: null,
        errorMessage: null,
      });
    } catch (error: any) {
      console.error("Enable Biometrics Error:", error);
      setProcessing(false);

      Alert.alert(
        "Error",
        error?.response?.data?.message || "Failed to enable biometric login.",
      );
    }
  };

  // Step 2: called once the user submits their password in the modal
  const finalizeEnableBiometrics = async (password: string) => {
    try {
      setPasswordModal((prev) => ({ ...prev, errorMessage: null }));
      setProcessing(true);

      const publicKey = await biometricService.createKeys();

      const response = await profileService.registerAuthDevice({
        device_id: currentDeviceId,
        platform: biometricService.getPlatform(),
        public_key: publicKey,
        device_name: biometricService.getDeviceName(),
        password,
      });

      if (response.success) {
        closePasswordModal();

        setTimeout(async () => {
          await initData(true);

          if (!isMounted.current) {
            return;
          }

          setSuccessAlertConfig({
            visible: true,
            title: "Success",
            message: "Quick login has been successfully enabled.",
          });
        }, 100);
      }
    } catch (error: any) {
      const status = error?.response?.status;
      const message =
        error?.response?.data?.message || "Failed to enable biometric login.";

      if (status === 422) {
        // Expected validation error (e.g. wrong password) — no need for a full stack trace
        console.warn("Enable Biometrics Error:", message);
      } else {
        console.error("Enable Biometrics Error:", error);
      }

      setPasswordModal((prev) => ({
        ...prev,
        errorMessage: message,
      }));
    } finally {
      setProcessing(false);
    }
  };

  // Disable biometrics (unchanged — no password step, since you only asked for add/delete)
  const handleDisableBiometrics = async () => {
    if (!currentDevice) {
      return;
    }

    setAlertConfig({
      visible: true,
      title: "Disable Quick Login",
      message: `Are you sure you want to disable ${biometryLabel} login for this device?`,
      onConfirm: async () => {
        setAlertConfig((prev) => ({
          ...prev,
          visible: false,
        }));

        setTimeout(async () => {
          try {
            setProcessing(true);

            await profileService.disableAuthDevice(currentDevice.id);

            await biometricService.deleteKeys();

            await initData(true);

            if (!isMounted.current) {
              return;
            }

            setSuccessAlertConfig({
              visible: true,
              title: "Success",
              message: "Quick login has been successfully disabled.",
            });
          } catch (error: any) {
            console.error("Disable Biometrics Error:", error);

            Alert.alert("Error", "Failed to disable biometric login.");
          } finally {
            setProcessing(false);
          }
        }, 150);
      },
    });
  };

  const handleToggle = (value: boolean) => {
    if (processing) {
      return;
    }

    if (value) {
      handleEnableBiometrics();
    } else {
      handleDisableBiometrics();
    }
  };

  // Step 1: confirm intent, then open the password modal instead of finishing immediately
  const handleRemoveDevice = (device: AuthDevice) => {
    const isThisDevice = device.device_id === currentDeviceId;

    setAlertConfig({
      visible: true,
      title: "Remove Device",
      message: isThisDevice
        ? "Removing this device will reset your local biometric configuration. Continue?"
        : `Are you sure you want to remove "${
            device.device_name || "Unknown Device"
          }"?`,
      onConfirm: () => {
        setAlertConfig((prev) => ({
          ...prev,
          visible: false,
        }));

        setTimeout(() => {
          setPasswordModal({
            visible: true,
            mode: "remove",
            target: device,
            errorMessage: null,
          });
        }, 150);
      },
    });
  };

  // Step 2: called once the user submits their password in the modal
  const finalizeRemoveDevice = async (password: string) => {
    const device = passwordModal.target;

    if (!device) {
      return;
    }

    const isThisDevice = device.device_id === currentDeviceId;

    try {
      setPasswordModal((prev) => ({ ...prev, errorMessage: null }));
      setProcessing(true);

      await profileService.removeAuthDevice(device.id, password);

      if (isThisDevice) {
        await biometricService.resetDevice();
      }

      closePasswordModal();

      await initData(true);

      if (!isMounted.current) {
        return;
      }

      setSuccessAlertConfig({
        visible: true,
        title: "Success",
        message: "Device has been successfully removed.",
      });
    } catch (error: any) {
      const status = error?.response?.status;
      const message =
        error?.response?.data?.message || "Failed to remove device.";

      if (status === 422) {
        // Expected validation error (e.g. wrong password) — no need for a full stack trace
        console.warn("Remove Device Error:", message);
      } else {
        console.error("Remove Device Error:", error);
      }

      setPasswordModal((prev) => ({
        ...prev,
        errorMessage: message,
      }));
    } finally {
      setProcessing(false);
    }
  };

  const handlePasswordSubmit = (password: string) => {
    if (passwordModal.mode === "enable") {
      finalizeEnableBiometrics(password);
    } else if (passwordModal.mode === "remove") {
      finalizeRemoveDevice(password);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#034194" />
      </View>
    );
  }

  const isCurrentDeviceEnabled = !!currentDevice?.biometric_enabled;

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#034194"]}
          tintColor="#034194"
        />
      }
    >
      {/* Confirmation Alert */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() =>
          setAlertConfig((prev) => ({
            ...prev,
            visible: false,
          }))
        }
        onConfirm={alertConfig.onConfirm}
      />

      {/* Success Alert */}
      <CustomAlert
        visible={successAlertConfig.visible}
        title={successAlertConfig.title}
        message={successAlertConfig.message}
        onClose={() =>
          setSuccessAlertConfig((prev) => ({
            ...prev,
            visible: false,
          }))
        }
      />

      {/* Password Confirmation Modal (enable + remove) */}
      <PasswordPromptModal
        visible={passwordModal.visible}
        title="Confirm Your Password"
        message={
          passwordModal.mode === "enable"
            ? "Enter your account password to enable Quick and Secure Login."
            : "Enter your account password to remove this device."
        }
        loading={processing}
        errorMessage={passwordModal.errorMessage}
        onClose={closePasswordModal}
        onSubmit={handlePasswordSubmit}
      />

      {/* Unsupported Device */}
      {!isSupported && (
        <View className="m-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex-row items-center">
          <Ionicons name="warning-outline" size={24} color="#D97706" />

          <Text className="ml-3 text-amber-800 text-sm flex-1">
            Biometric authentication is not supported or enrolled on this
            device.
          </Text>
        </View>
      )}

      {/* THIS DEVICE */}
      <View className="mt-6 px-4">
        <Text className="text-gray-400 font-bold mb-3 ml-2 uppercase text-[11px] tracking-wider">
          This Device
        </Text>

        <View
          className="bg-white rounded-2xl p-4 border border-gray-100 flex-row items-center justify-between"
          style={CARD_SHADOW}
        >
          <View className="flex-row items-center flex-1 mr-3">
            <View className="bg-blue-50 p-3 rounded-xl">
              <Ionicons name="finger-print-outline" size={24} color="#034194" />
            </View>

            <View className="ml-3 flex-1">
              <Text className="text-[#333] font-semibold text-base">
                Enable {biometryLabel}
              </Text>

              <Text className="text-gray-400 text-xs mt-0.5">
                Use biometrics to securely log into your account
              </Text>
            </View>
          </View>

          {processing ? (
            <ActivityIndicator color="#034194" />
          ) : (
            <Switch
              value={isCurrentDeviceEnabled}
              onValueChange={handleToggle}
              disabled={!isSupported || processing}
              trackColor={{
                false: "#CBD5E1",
                true: "#034194",
              }}
              thumbColor="#FFFFFF"
            />
          )}
        </View>
      </View>

      {/* REGISTERED DEVICES */}
      <View className="mt-8 px-4 mb-12">
        <Text className="text-gray-400 font-bold mb-3 ml-2 uppercase text-[11px] tracking-wider">
          Registered Devices ({devices.length})
        </Text>

        {devices.length === 0 ? (
          <View className="bg-white rounded-2xl p-6 items-center border border-gray-100">
            <Ionicons name="hardware-chip-outline" size={32} color="#CBD5E1" />

            <Text className="text-gray-400 font-medium text-sm mt-2">
              No registered auth devices found.
            </Text>
          </View>
        ) : (
          <View
            className="bg-white rounded-2xl overflow-hidden border border-gray-100"
            style={CARD_SHADOW}
          >
            {devices.map((item, index) => {
              const isThisDevice = item.device_id === currentDeviceId;

              const isLast = index === devices.length - 1;

              return (
                <View
                  key={item.id}
                  className={`p-4 flex-row items-center justify-between ${
                    isLast ? "" : "border-b border-gray-50"
                  }`}
                >
                  <View className="flex-row items-center flex-1 mr-2">
                    <View className="bg-gray-100 p-2.5 rounded-xl">
                      <Ionicons
                        name={
                          item.platform === "ios"
                            ? "logo-apple"
                            : "logo-android"
                        }
                        size={20}
                        color="#64748B"
                      />
                    </View>

                    <View className="ml-3 flex-1">
                      <View className="flex-row items-center">
                        <Text
                          className="text-[#333] font-semibold text-sm flex-shrink"
                          numberOfLines={1}
                        >
                          {item.device_name ||
                            `${item.platform.toUpperCase()} Device`}
                        </Text>

                        {isThisDevice && (
                          <View className="ml-2 bg-blue-100 px-2 py-0.5 rounded-full">
                            <Text className="text-[#034194] text-[10px] font-bold">
                              This Device
                            </Text>
                          </View>
                        )}
                      </View>

                      <Text className="text-gray-400 text-xs mt-0.5">
                        Status:{" "}
                        <Text
                          className={
                            item.biometric_enabled
                              ? "text-green-600 font-medium"
                              : "text-gray-400"
                          }
                        >
                          {item.biometric_enabled ? "Active" : "Disabled"}
                        </Text>
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleRemoveDevice(item)}
                    disabled={processing}
                    className="p-2"
                  >
                    <Ionicons name="trash-outline" size={20} color="#D70127" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
