import * as NavigationBar from "expo-navigation-bar";
import React, { useEffect } from "react";
import {
  Dimensions,
  Modal,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm?: () => void;
  confirmText?: string;
}

const SCREEN = Dimensions.get("screen");

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

export const CustomAlert = ({
  visible,
  title,
  message,
  onClose,
  onConfirm,
  confirmText = "Confirm",
}: CustomAlertProps) => {
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      {/* OVERLAY */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: SCREEN.width,
          height: SCREEN.height,
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

          <Text className="text-slate-500 text-base text-center mb-6 leading-6">
            {message}
          </Text>

          {onConfirm ? (
            <View className="flex-row gap-x-3">
              <TouchableOpacity
                onPress={onClose}
                className="flex-1 bg-gray-100 p-4 rounded-2xl"
                activeOpacity={0.8}
              >
                <Text className="text-gray-600 text-center font-bold text-base">
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onConfirm}
                className="flex-1 p-4 bg-primary rounded-2xl"
                activeOpacity={0.8}
              >
                <Text className="text-white text-center font-bold text-base">
                  {confirmText}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.8}
              className="bg-primary p-4 rounded-2xl"
            >
              <Text className="text-white text-center font-bold text-base">
                Okay
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};
