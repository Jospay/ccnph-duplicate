import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";

// 1. ADDED 'hasForgotPassword' AND 'onForgotPassword' TO THE INTERFACE
interface AuthInputProps extends TextInputProps {
  label: string;
  prefix?: string; // Optional prefix (like "09")
  isPassword?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
  hasForgotPassword?: boolean;
  onForgotPassword?: () => void;
}

export const AuthInput = ({
  label,
  prefix,
  isPassword,
  showPassword,
  onTogglePassword,
  hasForgotPassword,
  onForgotPassword,
  ...props
}: AuthInputProps) => (
  <View className="mb-5">
    <Text className="text-primary mb-2 ml-2 font-medium text-xs uppercase">
      {label}
    </Text>

    <View
      className={`flex-row items-center bg-white rounded-2xl border border-slate-200 overflow-hidden ${!props.editable ? "bg-slate-50" : ""}`}
    >
      {/* RENDER THE PREFIX IF IT EXISTS */}
      {prefix && (
        <View className="pl-4 pr-1 justify-center">
          <Text className="text-slate-800 text-base font-medium">{prefix}</Text>
        </View>
      )}

      <TextInput
        className={`flex-1 p-4 text-slate-800 text-base ${prefix ? "pl-0" : ""} ${isPassword ? "pr-12" : ""}`}
        placeholderTextColor="#94a3b8"
        secureTextEntry={isPassword && !showPassword}
        autoCapitalize="none"
        {...props}
      />

      {isPassword && (
        <TouchableOpacity
          onPress={onTogglePassword}
          className="absolute right-4"
          activeOpacity={0.7}
        >
          <Ionicons
            name={showPassword ? "eye-off-outline" : "eye-outline"}
            size={22}
            color="#94a3b8"
          />
        </TouchableOpacity>
      )}
    </View>

    {/* 🔥 FORGOT PASSWORD LINK CLEANLY ANCHORED BELOW INPUT CONTAINER */}
    {hasForgotPassword && (
      <View className="pe-2 mt-2">
        <TouchableOpacity
          onPress={onForgotPassword}
          disabled={!props.editable}
          activeOpacity={0.7}
          className="align-self-end items-end"
        >
          <Text className="text-primary font-semibold underline text-sm">
            Forgot Password?
          </Text>
        </TouchableOpacity>
      </View>
    )}
  </View>
);
