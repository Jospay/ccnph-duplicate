import { CustomAlert } from "@/components/CustomAlert";
import { profileService } from "@/services/profileService";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

/**
 * FIXED: Moved PasswordInput OUTSIDE the main screen component.
 * This prevents the input from losing focus (closing keyboard) on every keystroke.
 */
const PasswordInput = ({
  label,
  value,
  onChange,
  isVisible,
  setIsVisible,
  errorField,
  placeholder,
  errors,
}: any) => (
  <View className="mb-4">
    <Text className="text-gray-400 text-[10px] uppercase font-bold mb-1 ml-1">
      {label}
    </Text>
    <View
      className={`flex-row items-center border ${errors[errorField] ? "border-[#D70127]" : "border-gray-200"} rounded-2xl bg-gray-50 pr-4`}
    >
      <TextInput
        secureTextEntry={!isVisible}
        placeholder={placeholder}
        value={value}
        onChangeText={onChange}
        className="flex-1 p-4 text-gray-800 font-medium"
        autoCapitalize="none"
      />
      <TouchableOpacity onPress={() => setIsVisible(!isVisible)}>
        <Ionicons
          name={isVisible ? "eye-off-outline" : "eye-outline"}
          size={20}
          color="#9CA3AF"
        />
      </TouchableOpacity>
    </View>
    {errors[errorField] && (
      <Text className="text-[#D70127] text-xs mt-1 ml-1">
        {errors[errorField][0]}
      </Text>
    )}
  </View>
);

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  });

  const [alert, setAlert] = useState({
    visible: false,
    title: "",
    message: "",
    onCloseAction: undefined as (() => void) | undefined,
  });

  const showAlert = (
    title: string,
    message: string,
    onCloseAction?: () => void,
  ) => {
    setAlert({ visible: true, title, message, onCloseAction });
  };

  const handleChangePassword = async () => {
    Keyboard.dismiss();

    if (form.new_password !== form.new_password_confirmation) {
      showAlert("Error", "New passwords do not match");
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const response = await profileService.changePassword(form);
      if (response.success) {
        showAlert("Success", "Password updated successfully!", () =>
          router.back(),
        );
      }
    } catch (error: any) {
      if (error.response?.status === 422) {
        setErrors(error.response.data.errors || {});
      } else {
        showAlert(
          "Error",
          error.response?.data?.message || "Could not update password",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="p-6">
            <Text className="text-2xl font-bold text-[#034194] mb-2">
              Security
            </Text>
            <Text className="text-gray-500 mb-8">
              Update your password to keep your account secure.
            </Text>

            <PasswordInput
              label="Current Password"
              placeholder="Enter current password"
              value={form.current_password}
              onChange={(t: string) =>
                setForm({ ...form, current_password: t })
              }
              isVisible={showCurrent}
              setIsVisible={setShowCurrent}
              errorField="current_password"
              errors={errors}
            />

            <PasswordInput
              label="New Password"
              placeholder="Enter new password"
              value={form.new_password}
              onChange={(t: string) => setForm({ ...form, new_password: t })}
              isVisible={showNew}
              setIsVisible={setShowNew}
              errorField="new_password"
              errors={errors}
            />

            <PasswordInput
              label="Confirm New Password"
              placeholder="Repeat new password"
              value={form.new_password_confirmation}
              onChange={(t: string) =>
                setForm({ ...form, new_password_confirmation: t })
              }
              isVisible={showConfirm}
              setIsVisible={setShowConfirm}
              errorField="new_password_confirmation"
              errors={errors}
            />

            <TouchableOpacity
              onPress={handleChangePassword}
              disabled={loading}
              className="bg-[#034194] py-5 rounded-3xl mt-6 shadow-lg shadow-primary/20 flex-row justify-center"
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-lg">
                  Update Password
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>

      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        onClose={() => {
          setAlert({ ...alert, visible: false });
          alert.onCloseAction?.();
        }}
      />
    </KeyboardAvoidingView>
  );
}
