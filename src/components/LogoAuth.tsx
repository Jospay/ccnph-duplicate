import React from "react";
import { Image, View } from "react-native";
import logo from "../../assets/images/logo.png";
import "../../global.css";

export default function LoginPage() {
  return (
    <View className="items-center mb-1">
      <View className="mt-[-76px] ">
        <Image source={logo} className="!w-32 !h-32 " resizeMode="contain" />
      </View>
    </View>
  );
}
