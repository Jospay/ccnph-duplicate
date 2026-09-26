import { Ionicons } from "@expo/vector-icons";
import * as NavigationBar from "expo-navigation-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface PasswordPromptModalProps {
  visible: boolean;
  title: string;
  message?: string;
  loading?: boolean;
  errorMessage?: string | null;
  confirmText?: string;
  onClose: () => void;
  onSubmit: (password: string) => void;
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

export function PasswordPromptModal({
  visible,
  title,
  message,
  loading = false,
  errorMessage,
  confirmText = "Confirm",
  onClose,
  onSubmit,
}: PasswordPromptModalProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (Platform.OS === "android") {
      if (visible) {
        NavigationBar.setVisibilityAsync("hidden");
      } else {
        NavigationBar.setVisibilityAsync("visible");
      }
    }

    return () => {
      if (Platform.OS === "android") {
        NavigationBar.setVisibilityAsync("visible");
      }
    };
  }, [visible]);

  // Reset local state whenever the modal is opened/closed
  useEffect(() => {
    if (!visible) {
      setPassword("");
      setShowPassword(false);
    }
  }, [visible]);

  const handleClose = () => {
    if (loading) {
      return;
    }

    setPassword("");
    setShowPassword(false);
    onClose();
  };

  const handleSubmit = () => {
    if (!password || loading) {
      return;
    }

    onSubmit(password);
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
      {/*
        iOS: "padding" nudges content up above the keyboard.
        Android: no behavior at all — the OS already resizes the window
        (adjustResize) when the keyboard opens/closes. Adding "height" here
        on top of that caused a double-resize glitch: the button's position
        would jump mid-tap (so the first tap just dismissed the keyboard
        instead of registering the press), and the overlay briefly lost
        its height, making the dark background flash/disappear at the
        bottom during the transition.
      */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* OVERLAY — flex:1 so it always covers exactly the visible area,
            keyboard open or closed, instead of a fixed Dimensions height */}
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "center",
            padding: 24,
          }}
        >
          {/* MODAL BOX */}
          <View
            className="bg-white w-full max-w-[400px] mx-auto rounded-[35px] p-6"
            style={MODAL_SHADOW}
          >
            <Text className="text-primary text-2xl font-bold text-center mb-3">
              {title}
            </Text>

            {!!message && (
              <Text className="text-slate-500 text-base text-center mb-6 leading-6">
                {message}
              </Text>
            )}

            <View className="flex-row items-center border border-gray-200 rounded-2xl px-4 mb-1">
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                autoFocus
                autoCapitalize="none"
                editable={!loading}
                returnKeyType="done"
                blurOnSubmit={false}
                onSubmitEditing={handleSubmit}
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

            {!!errorMessage && (
              <Text className="text-[#D70127] text-xs mb-2 ml-1">
                {errorMessage}
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

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading || !password}
                activeOpacity={0.8}
                className="flex-1 p-4 bg-primary rounded-2xl items-center justify-center"
                style={{ opacity: loading || !password ? 0.6 : 1 }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="text-white text-center font-bold text-base">
                    {confirmText}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
