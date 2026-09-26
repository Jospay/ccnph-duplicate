import * as Crypto from "expo-crypto";
import * as Device from "expo-device";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const DEVICE_ID_KEY = "user_device_id";
const PUBLIC_KEY_STORAGE_KEY = "biometric_public_key";

export const biometricService = {
  /**
   * Check if biometric authentication is supported and enrolled.
   */
  isSupported: async (): Promise<{
    available: boolean;
    biometryType: LocalAuthentication.AuthenticationType | null;
  }> => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        return { available: false, biometryType: null };
      }

      const supportedTypes =
        await LocalAuthentication.supportedAuthenticationTypesAsync();
      const biometryType = supportedTypes.length > 0 ? supportedTypes[0] : null;

      return { available: true, biometryType };
    } catch (error) {
      console.error("Error checking biometric support:", error);
      return { available: false, biometryType: null };
    }
  },

  /**
   * Get a human-readable label for the biometry type.
   */
  getBiometryLabel: (
    biometryType: LocalAuthentication.AuthenticationType | null,
  ): string => {
    if (!biometryType) return "Biometrics";

    switch (biometryType) {
      case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
        return "Face ID";
      case LocalAuthentication.AuthenticationType.FINGERPRINT:
        return "Fingerprint";
      case LocalAuthentication.AuthenticationType.IRIS:
        return "Iris";
      default:
        return "Biometrics";
    }
  },

  /**
   * Get the current platform (ios or android).
   */
  getPlatform: (): "ios" | "android" => {
    return Platform.OS === "ios" ? "ios" : "android";
  },

  /**
   * Get the device name.
   */
  getDeviceName: (): string | null => {
    return Device.deviceName || null;
  },

  /**
   * Retrieve or create a persistent unique Device ID.
   */
  getDeviceId: async (): Promise<string> => {
    try {
      let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
      if (!deviceId) {
        deviceId = Crypto.randomUUID();
        await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
      }
      return deviceId;
    } catch (error) {
      console.error("Error handling Device ID:", error);
      throw error;
    }
  },

  /**
   * Alias for getDeviceId (for backward compatibility if needed).
   */
  getOrCreateDeviceId: async (): Promise<string> => {
    return biometricService.getDeviceId();
  },

  /**
   * Prompt user for biometric authentication.
   */
  promptBiometrics: async (
    promptMessage = "Authenticate to continue",
  ): Promise<boolean> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: "Use Passcode",
        cancelLabel: "Cancel",
        disableDeviceFallback: false,
      });

      return result.success;
    } catch (error) {
      console.error("Biometric authentication failed:", error);
      return false;
    }
  },

  /**
   * Alias for promptBiometrics (original name).
   */
  authenticate: async (
    promptMessage = "Authenticate to continue",
  ): Promise<boolean> => {
    return biometricService.promptBiometrics(promptMessage);
  },

  /**
   * Create or retrieve the public key token stored securely on device.
   */
  createKeys: async (): Promise<string> => {
    try {
      let publicKey = await SecureStore.getItemAsync(PUBLIC_KEY_STORAGE_KEY);
      if (!publicKey) {
        publicKey = Crypto.randomUUID();
        await SecureStore.setItemAsync(PUBLIC_KEY_STORAGE_KEY, publicKey);
      }
      return publicKey;
    } catch (error) {
      console.error("Error creating biometric keys:", error);
      throw error;
    }
  },

  /**
   * Delete key stored in SecureStore.
   */
  deleteKeys: async (): Promise<boolean> => {
    try {
      await SecureStore.deleteItemAsync(PUBLIC_KEY_STORAGE_KEY);
      return true;
    } catch (error) {
      console.error("Error deleting biometric keys:", error);
      return false;
    }
  },

  /**
   * Reset device state and biometric keys.
   */
  resetDevice: async (): Promise<void> => {
    try {
      await biometricService.deleteKeys();
      await SecureStore.deleteItemAsync(DEVICE_ID_KEY);
    } catch (error) {
      console.error("Error resetting device biometrics:", error);
      throw error;
    }
  },

  /**
   * Detailed check for biometric capabilities and hardware status.
   */
  checkHardwareSupport: async (): Promise<{
    hasHardware: boolean;
    isEnrolled: boolean;
    supportedTypes: LocalAuthentication.AuthenticationType[];
  }> => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes =
        await LocalAuthentication.supportedAuthenticationTypesAsync();

      return {
        hasHardware,
        isEnrolled,
        supportedTypes,
      };
    } catch (error) {
      console.error("Error checking biometric support details:", error);
      return {
        hasHardware: false,
        isEnrolled: false,
        supportedTypes: [],
      };
    }
  },
};
