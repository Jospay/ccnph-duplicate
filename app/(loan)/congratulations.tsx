import { Skeleton } from "@/components/ui/skeleton";
import { useLocalSearchParams, useRouter } from "expo-router"; // Added useLocalSearchParams
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import loangrats from "../../assets/images/loangrats.png";
import "../../global.css";

export default function CongratulationPage() {
  const router = useRouter();
  const params = useLocalSearchParams(); // Get dynamic data
  const isProcessing = useRef(false);

  // States
  const [pageLoading, setPageLoading] = useState(true);
  const [navigating, setNavigating] = useState(false);

  // Get dynamic amount from params (fallback to 0)
  const appliedAmount = params.amount ? parseFloat(params.amount as string) : 0;

  useEffect(() => {
    const timer = setTimeout(() => {
      setPageLoading(false);
    }, 400);
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
        <View className="items-center justify-center py-14 px-6">
          <View className="w-full max-w-[500px] items-center">
            {/* 1. STATUS IMAGE */}
            {pageLoading ? (
              <Skeleton className="w-[200px] h-[200px] rounded-full mb-14" />
            ) : (
              <Image
                style={{ width: 200, height: 200 }}
                className="mb-14"
                source={loangrats}
                resizeMode="contain"
              />
            )}

            {/* 2. DYNAMIC MESSAGE */}
            <View className="pb-8 w-full items-center">
              {pageLoading ? (
                <View className="gap-y-3 items-center">
                  <Skeleton className="h-10 w-64" />
                  <Skeleton className="h-5 w-80" />
                </View>
              ) : (
                <>
                  <Text className="text-center font-bold text-primary text-2xl">
                    Application Submitted
                  </Text>
                  <Text className="text-center text-slate-500 text-base pt-3 leading-6 px-4">
                    Your loan application for{" "}
                    <Text className="font-bold text-primary">
                      ₱
                      {appliedAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </Text>{" "}
                    has been submitted. Please wait for approval.
                  </Text>
                </>
              )}
            </View>

            {/* 3. NEXT STEPS CARD */}
            <View className="w-full bg-slate-50 rounded-3xl p-6 border border-slate-100 shadow-sm">
              {pageLoading ? (
                <View className="gap-y-4">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </View>
              ) : (
                <>
                  <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">
                    What happens next?
                  </Text>

                  <View className="flex-row mb-5">
                    <View className="w-6 h-6 rounded-full bg-primary items-center justify-center mr-3">
                      <Text className="text-white text-xs font-bold">1</Text>
                    </View>
                    <Text className="flex-1 text-slate-600 text-sm leading-5">
                      Our team is currently{" "}
                      <Text className="font-bold">reviewing</Text> your request.
                    </Text>
                  </View>

                  <View className="flex-row">
                    <View className="w-6 h-6 rounded-full bg-primary items-center justify-center mr-3">
                      <Text className="text-white text-xs font-bold">2</Text>
                    </View>
                    <Text className="flex-1 text-slate-600 text-sm leading-5">
                      We will notify you via{" "}
                      <Text className="font-bold">SMS or App Notification</Text>{" "}
                      once the status is updated.
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 4. FOOTER ACTION */}
      <View className="w-full p-5 bg-white border-t border-slate-200">
        {pageLoading ? (
          <Skeleton className="h-[60px] w-full rounded-2xl" />
        ) : (
          <TouchableOpacity
            onPress={handleReturnHome}
            disabled={navigating}
            className={`h-16 rounded-2xl justify-center items-center ${
              navigating ? "bg-slate-400" : "bg-primary"
            }`}
          >
            {navigating ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">
                Return to Home
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
