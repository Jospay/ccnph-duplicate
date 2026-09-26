import { CustomAlert } from "@/components/CustomAlert";
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

export default function BiometricSettingsScreen() {
  const router = useRouter();
  const isMounted = useRef(true);

  // Maintain mount state to prevent memory leak / navigation state race conditions
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

  // Device list from backend
  const [devices, setDevices] = useState<AuthDevice[]>([]);
  const [currentDevice, setCurrentDevice] = useState<AuthDevice | null>(null);

  // Custom Alert states
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

  // Safe State Setter Wrapper
  const safeSetState = useCallback((setter: () => void) => {
    if (isMounted.current) {
      setter();
    }
  }, []);

  // 1. Initialize Biometrics Hardware and fetch devices
  const initData = async (isRefresh = false) => {
    if (!isRefresh) safeSetState(() => setLoading(true));
    try {
      const { available, biometryType } = await biometricService.isSupported();
      safeSetState(() => {
        setIsSupported(available);
        setBiometryLabel(biometricService.getBiometryLabel(biometryType));
      });

      const deviceId = await biometricService.getDeviceId();
      safeSetState(() => setCurrentDeviceId(deviceId));

      try {
        const deviceList: AuthDevice[] = await profileService.getAuthDevices();
        safeSetState(() => {
          setDevices(Array.isArray(deviceList) ? deviceList : []);
          const foundCurrent = deviceList.find((d) => d.device_id === deviceId);
          setCurrentDevice(foundCurrent || null);
        });
      } catch (apiError: any) {
        console.error(
          "Auth Devices API Error:",
          apiError?.response?.data || apiError.message,
        );
        safeSetState(() => setDevices([]));
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

  // 2. Enable Biometrics on current device
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

      if (!authenticated) {
        setProcessing(false);
        return;
      }

      const publicKey = await biometricService.createKeys();

      const response = await profileService.registerAuthDevice({
        device_id: currentDeviceId,
        platform: biometricService.getPlatform(),
        public_key: publicKey,
        device_name: biometricService.getDeviceName(),
      });

      if (response.success) {
        // Defer re-init & modal popups slightly to allow OS biometric prompt to detach
        setTimeout(async () => {
          await initData(true);
          setSuccessAlertConfig({
            visible: true,
            title: "Success",
            message: "Quick login has been successfully enabled.",
          });
        }, 100);
      }
    } catch (error: any) {
      console.error("Enable Biometrics Error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to enable biometric login.",
      );
    } finally {
      setProcessing(false);
    }
  };

  // 3. Disable Biometrics on current device
  const handleDisableBiometrics = async () => {
    if (!currentDevice) return;

    setAlertConfig({
      visible: true,
      title: "Disable Quick Login",
      message: `Are you sure you want to disable ${biometryLabel} login for this device?`,
      onConfirm: async () => {
        setAlertConfig((prev) => ({ ...prev, visible: false }));

        setTimeout(async () => {
          try {
            setProcessing(true);
            await profileService.disableAuthDevice(currentDevice.id);
            await biometricService.deleteKeys();

            await initData(true);
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
    if (value) {
      handleEnableBiometrics();
    } else {
      handleDisableBiometrics();
    }
  };

  // 4. Revoke/Remove an auth device
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
      onConfirm: async () => {
        setAlertConfig((prev) => ({ ...prev, visible: false }));

        setTimeout(async () => {
          try {
            setProcessing(true);
            await profileService.removeAuthDevice(device.id);

            if (isThisDevice) {
              await biometricService.resetDevice();
            }

            await initData(true);
            setSuccessAlertConfig({
              visible: true,
              title: "Success",
              message: "Device has been successfully removed.",
            });
          } catch (error: any) {
            console.error("Remove Device Error:", error);
            Alert.alert("Error", "Failed to remove device.");
          } finally {
            setProcessing(false);
          }
        }, 150);
      },
    });
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
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
        onConfirm={alertConfig.onConfirm}
      />

      <CustomAlert
        visible={successAlertConfig.visible}
        title={successAlertConfig.title}
        message={successAlertConfig.message}
        onClose={() =>
          setSuccessAlertConfig((prev) => ({ ...prev, visible: false }))
        }
      />

      {!isSupported && (
        <View className="m-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex-row items-center">
          <Ionicons name="warning-outline" size={24} color="#D97706" />
          <Text className="ml-3 text-amber-800 text-sm flex-1">
            Biometric authentication is not supported or enrolled on this
            device.
          </Text>
        </View>
      )}

      <View className="mt-6 px-4">
        <Text className="text-gray-400 font-bold mb-3 ml-2 uppercase text-[11px] tracking-wider">
          This Device
        </Text>

        <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex-row items-center justify-between">
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
              trackColor={{ false: "#CBD5E1", true: "#034194" }}
              thumbColor="#FFFFFF"
            />
          )}
        </View>
      </View>

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
          <View className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
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
