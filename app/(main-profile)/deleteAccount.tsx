import { CustomAlert } from "@/components/CustomAlert";
import { accountDeletionService } from "@/services/accountDeletionService";
import { useAuthStore } from "@/store/useAuthStore";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [navigating, setNavigating] = useState(false);

  const [alert, setAlert] = useState({
    visible: false,
    title: "",
    message: "",
  });

  const showAlert = (title: string, message: string) => {
    setAlert({ visible: true, title, message });
  };

  const handleConfirmDeletion = async () => {
    // Guard: block re-entry if a request is already in flight
    if (loading) return;

    if (!user?.phone) {
      setDeleteAccountConfirm(false);
      showAlert("Error", "Phone number not found. Please try again.");
      return;
    }

    // Close the modal immediately so it can't be tapped again
    setDeleteAccountConfirm(false);
    setLoading(true);

    try {
      await accountDeletionService.requestDeletion();

      setNavigating(true);

      setTimeout(() => {
        showAlert(
          "Verification Required",
          "An OTP has been sent to your phone. Please verify to confirm account deletion.",
        );
      }, 150);
    } catch (error: any) {
      let msg = "Could not initiate account deletion. Please try again.";

      if (error?.message) {
        msg = error.message;
      } else if (error?.response?.data?.message) {
        msg = error.response.data.message;
      }

      showAlert("Request Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const isBusy = loading || navigating;

  return (
    <ScrollView className="flex-1 bg-gray-50 px-4 py-6">
      {/* CONFIRMATION ALERT */}
      <CustomAlert
        visible={deleteAccountConfirm}
        title="Schedule Deletion?"
        message="Your account will be deactivated for 30 days. You can cancel deletion anytime by logging back in within 30 days."
        onClose={() => setDeleteAccountConfirm(false)}
        onConfirm={handleConfirmDeletion}
        confirmText="Confirm"
      />

      {/* HEADER CARD */}
      <View className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mb-6">
        <View
          className="w-14 h-14 rounded-2xl items-center justify-center mb-4"
          style={{ backgroundColor: "#FEE2E2" }}
        >
          <Ionicons name="trash-bin-outline" size={28} color="#DC2626" />
        </View>

        <Text className="text-xl font-bold text-gray-900 mb-2">
          Delete Your Account
        </Text>

        <Text className="text-gray-600 leading-6">
          Submitting a deletion request begins a 30-day deactivation period.
        </Text>
      </View>

      {/* POLICY DETAILS CARD */}
      <View className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mb-6">
        <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
          How Account Deletion Works
        </Text>

        {/* STEP 1 */}
        <View className="flex-row items-start mb-4">
          <View
            className="p-2 rounded-xl mr-3"
            style={{ backgroundColor: "#EFF6FF" }}
          >
            <Ionicons name="time-outline" size={20} color="#034194" />
          </View>
          <View className="flex-1">
            <Text className="font-bold text-gray-800 text-sm">
              30-Day Grace Period
            </Text>
            <Text className="text-gray-500 text-xs mt-1 leading-4">
              Your account will be deactivated immediately and hidden from the
              public. Your data remains safe during these 30 days.
            </Text>
          </View>
        </View>

        {/* STEP 2 */}
        <View className="flex-row items-start mb-4">
          <View
            className="p-2 rounded-xl mr-3"
            style={{ backgroundColor: "#DCFCE7" }}
          >
            <Ionicons name="refresh-circle-outline" size={20} color="#16A34A" />
          </View>
          <View className="flex-1">
            <Text className="font-bold text-gray-800 text-sm">
              Cancel Deletion Anytime
            </Text>
            <Text className="text-gray-500 text-xs mt-1 leading-4">
              If you change your mind, simply log in to your account within 30
              days to automatically restore your account and cancel the deletion
              process.
            </Text>
          </View>
        </View>

        {/* STEP 3 */}
        <View className="flex-row items-start">
          <View
            className="p-2 rounded-xl mr-3"
            style={{ backgroundColor: "#FEE2E2" }}
          >
            <Ionicons name="trash-outline" size={20} color="#DC2626" />
          </View>
          <View className="flex-1">
            <Text className="font-bold text-gray-800 text-sm">
              Permanent Erasure
            </Text>
            <Text className="text-gray-500 text-xs mt-1 leading-4">
              If you do not log in within 30 days, your account, personal
              details, and data will be permanently deleted and cannot be
              recovered.
            </Text>
          </View>
        </View>
      </View>

      {/* ACTION BUTTON */}
      <TouchableOpacity
        onPress={() => setDeleteAccountConfirm(true)}
        disabled={isBusy}
        className="flex-row items-center justify-center p-4 rounded-2xl border mb-12"
        style={{
          backgroundColor: "#FEF2F2",
          borderColor: "#FECACA",
        }}
      >
        {isBusy ? (
          <ActivityIndicator color="#DC2626" />
        ) : (
          <>
            <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
            <Text
              className="font-bold ml-2 text-base"
              style={{ color: "#DC2626" }}
            >
              Request Account Deletion
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* CUSTOM ALERT */}
      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        onClose={() => {
          setAlert({ ...alert, visible: false });

          if (navigating) {
            router.push({
              pathname: "/(main-profile)/deleteVerification",
              params: { phone: user?.phone },
            });
          }
        }}
      />
    </ScrollView>
  );
}
