import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import businessend from "../../assets/images/vector/businessend.png";
import "../../global.css";

export default function CongratulationPage() {
  const router = useRouter();
  const isProcessing = useRef(false);

  // States
  const [pageLoading, setPageLoading] = useState(true);
  const [navigating, setNavigating] = useState(false);

  // Initial Load
  useEffect(() => {
    const timer = setTimeout(() => {
      setPageLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleReturnHome = () => {
    if (isProcessing.current || navigating) return;

    isProcessing.current = true;
    setNavigating(true);

    setTimeout(() => {
      router.push("../(main)/");
    }, 500);
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center justify-center py-16 px-6">
          <View className="w-full max-w-[500px] items-center">
            {/* SUCCESS IMAGE */}
            {pageLoading ? (
              <Skeleton className="w-[265px] h-[265px] mb-12" />
            ) : (
              <Image
                style={{ width: 265, height: 265 }}
                className="mb-12"
                source={businessend}
                resizeMode="contain"
              />
            )}

            {/* HEADER + MESSAGE */}
            <View className="pb-6 w-full items-center">
              {pageLoading ? (
                <View className="gap-y-3 items-center">
                  <Skeleton className="h-10 w-56" />
                  <Skeleton className="h-40 w-72" />
                </View>
              ) : (
                <>
                  <Text className="text-center font-bold text-primary text-3xl">
                    Congratulations!
                  </Text>

                  <Text className="text-center text-slate-500 text-lg/7 pt-3 px-2">
                    You’ve successfully completed the business training. You’re
                    now equipped with the knowledge to start and grow your
                    business. Take the next step and turn your ideas into
                    action!
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* FOOTER BUTTON */}
      <View className="w-full p-5 bg-white border-t border-slate-200">
        {pageLoading ? (
          <Skeleton className="h-[60px] w-full rounded-2xl" />
        ) : (
          <TouchableOpacity
            onPress={handleReturnHome}
            disabled={navigating}
            activeOpacity={0.85}
            className={`h-16 rounded-2xl justify-center items-center ${
              navigating ? "bg-slate-400" : "bg-primary"
            }`}
            style={{
              elevation: navigating ? 0 : 4,
            }}
          >
            {navigating ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">Back to Home</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
