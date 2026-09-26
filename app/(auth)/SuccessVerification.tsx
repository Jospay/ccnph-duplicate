import HeaderAuth from "@/components/HeaderAuth";
import LogoAuth from "@/components/LogoAuth";
import TitleAuth from "@/components/TitleAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import SuccessImg from "../../assets/images/vector/Success.png";
import "../../global.css";

export default function SuccessVerificationPage() {
  const router = useRouter();
  const { phone, token } = useLocalSearchParams<{
    phone: string;
    token: string;
  }>();
  const isProcessing = useRef(false);

  const [isLoading, setIsLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  const handleContinue = () => {
    if (isProcessing.current || isLoading) return;

    isProcessing.current = true;
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      // Passing the data to the password page
      router.replace({
        pathname: "/createPassword",
        params: { phone, token },
      });
    }, 800);
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      automaticallyAdjustKeyboardInsets={Platform.OS === "android"}
    >
      <View className="flex-1 bg-slate-50">
        <HeaderAuth title="Join Us" />
        <View className="flex-1 -mt-10">
          <View className="bg-primary h-[240px] rounded-b-[60px] absolute w-full top-0" />
          <View className="mx-5 pb-10 max-w-[500px] w-[90%] self-center">
            <View className="bg-white p-6 rounded-[40px] shadow-black/20 shadow-md elevation-4">
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
                <View className="gap-y-6">
                  <Skeleton className="h-52 w-full rounded-3xl mt-3" />
                  <View className="items-center gap-y-3">
                    <Skeleton className="h-10 w-40 rounded-lg" />
                    <View className="items-center gap-y-2 w-full">
                      <Skeleton className="h-4 w-[80%] rounded-md" />
                      <Skeleton className="h-4 w-[60%] rounded-md" />
                    </View>
                  </View>
                  <Skeleton className="h-[64px] w-full rounded-2xl my-5" />
                </View>
              ) : (
                <>
                  <View className="pt-3">
                    <Image
                      source={SuccessImg}
                      className="h-52 self-center"
                      resizeMode="contain"
                    />
                  </View>
                  <TitleAuth
                    title="Success!!!"
                    containerClass="mb-5 mt-4"
                    description={
                      <>
                        <Text className="text-center text-slate-900 text-sm">
                          Congratulations you have been
                        </Text>
                        <Text className="text-center text-slate-900 text-sm">
                          successfully Verified.
                        </Text>
                      </>
                    }
                  />
                  <TouchableOpacity
                    onPress={handleContinue}
                    disabled={isLoading}
                    activeOpacity={0.8}
                    className={`my-5 py-5 rounded-2xl shadow-lg flex-row justify-center items-center ${isLoading ? "bg-slate-400" : "bg-primary"}`}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white font-bold text-lg text-center">
                        Continue
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
