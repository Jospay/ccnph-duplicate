import HeaderAuth from "@/components/HeaderAuth";
import LinkAuth from "@/components/LinkAuth";
import LogoAuth from "@/components/LogoAuth";
import TitleAuth from "@/components/TitleAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import OTPVerification from "../../assets/images/vector/OTPVerification.png";
import "../../global.css";

export default function OtpSendPage() {
  const router = useRouter();

  // EXTRA LOCK: Prevents "double-fire" clicks instantly
  const isProcessing = useRef(false);

  // Usually, you would get this number from Global State or Route Params
  const [number] = useState("09123123123");
  const [isLoading, setIsLoading] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // Synchronized snappy loading (0.4s)
  useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  const handleOtpSend = () => {
    if (isProcessing.current || isLoading || navigating) return;

    isProcessing.current = true;
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      router.push("/otpVerification");
    }, 800);
  };

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      bounces={false}
      bottomOffset={20}
    >
      <View className="flex-1 bg-slate-50">
        <HeaderAuth title="Join Us" />

        <View className="flex-1 -mt-10">
          {/* Blue Background Header */}
          <View className="bg-primary h-[240px] rounded-b-[60px] absolute w-full top-0" />

          <View className="mx-5 pb-10 max-w-[500px] w-[90%] self-center">
            <View className="bg-white p-6 rounded-[40px] shadow-black/20 shadow-md elevation-4">
              {/* --- LOGO SECTION --- */}
              {pageLoading ? (
                <View className="items-center mb-4">
                  <View className="mt-[-76px] bg-white rounded-full shadow-sm">
                    <Skeleton className="w-32 h-32 rounded-full border-4 border-white" />
                  </View>
                </View>
              ) : (
                <LogoAuth />
              )}

              {pageLoading ? (
                /* --- OTP SEND SKELETON --- */
                <View className="gap-y-6">
                  <Skeleton className="w-40 h-48 self-center rounded-3xl mt-3" />
                  <View className="items-center gap-y-3">
                    <Skeleton className="h-8 w-56 rounded-lg" />
                    <Skeleton className="h-4 w-[80%] rounded-md" />
                  </View>
                  <Skeleton className="h-[64px] w-full rounded-2xl" />
                  <Skeleton className="h-[64px] w-full rounded-2xl mt-2" />
                  <Skeleton className="h-4 w-40 self-center rounded-md" />
                </View>
              ) : (
                /* --- ACTUAL CONTENT --- */
                <>
                  <View className="pt-3">
                    <Image
                      source={OTPVerification}
                      className="w-40 h-48 self-center"
                      resizeMode="contain"
                    />
                  </View>

                  <TitleAuth
                    title="OTP Verification"
                    containerClass="mb-2 mt-4"
                    description={
                      <Text className="text-center text-slate-900 text-sm">
                        We will send you a{" "}
                        <Text className="font-bold">One Time Password</Text> on
                        this mobile number
                      </Text>
                    }
                  />

                  <View className="mt-4">
                    <TextInput
                      className="bg-slate-50 text-center p-4 rounded-2xl text-primary font-bold text-xl border border-slate-200"
                      value={number}
                      editable={false}
                      selectTextOnFocus={false}
                      pointerEvents="none"
                    />
                  </View>

                  {/* Action Button */}
                  <TouchableOpacity
                    onPress={handleOtpSend}
                    disabled={isLoading || navigating}
                    activeOpacity={0.8}
                    className={`mt-5 p-5 rounded-2xl shadow-lg flex-row justify-center items-center ${
                      isLoading || navigating ? "bg-slate-400" : "bg-primary"
                    }`}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white font-bold text-lg text-center">
                        {navigating ? "Redirecting..." : "Get OTP?"}
                      </Text>
                    )}
                  </TouchableOpacity>

                  <LinkAuth
                    onNavigating={setNavigating}
                    isNavigating={navigating}
                  />
                </>
              )}
            </View>
          </View>
        </View>
      </View>
    </KeyboardAwareScrollView>
  );
}
