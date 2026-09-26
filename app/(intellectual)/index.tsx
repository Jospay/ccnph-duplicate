import { Skeleton } from "@/components/ui/skeleton";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Intellectual from "../../assets/images/vector/intellectual_start.png";
import "../../global.css";

export default function CongratulationPage() {
  const router = useRouter();

  // 🛡️ NAVIGATION LOCKS
  const isProcessing = useRef(false);
  const [navigating, setNavigating] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // RESET LOCKS ON FOCUS
  useFocusEffect(
    useCallback(() => {
      setNavigating(false);
      isProcessing.current = false;
    }, []),
  );

  /**
   * 📦 INITIAL LOAD
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setPageLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  /**
   * 🔄 FIXED REFRESH HANDLER
   */
  const onRefresh = useCallback(() => {
    setRefreshing(true);

    // simulate reload (same behavior as initial load)
    setTimeout(() => {
      setPageLoading(true);

      setTimeout(() => {
        setPageLoading(false);
        setRefreshing(false);
      }, 400);
    }, 300);
  }, []);

  /**
   * 🚀 NAVIGATION
   */
  const RegisteredProperty = () => {
    if (isProcessing.current || navigating) return;

    isProcessing.current = true;
    setNavigating(true);

    router.push("/registered");
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#034194"]}
            tintColor="#034194"
          />
        }
      >
        <View className="items-center justify-center py-14 px-6">
          <View className="w-full max-w-[500px] items-center">
            {/* IMAGE */}
            {pageLoading ? (
              <Skeleton className="w-[250px] h-[250px] rounded-full mb-12" />
            ) : (
              <Image
                style={{ width: 250, height: 250 }}
                className="mb-12"
                source={Intellectual}
                resizeMode="contain"
              />
            )}

            {/* TEXT */}
            <View className="pb-8 w-full items-center">
              {pageLoading ? (
                <View className="gap-y-3 items-center">
                  <Skeleton className="h-10 w-64" />
                  <Skeleton className="h-5 w-80" />
                  <Skeleton className="h-5 w-48" />
                </View>
              ) : (
                <>
                  <Text className="text-center font-bold text-primary text-2xl px-4">
                    Apply for intellectual property assistance
                  </Text>
                  <Text className="text-center text-slate-500 text-base pt-3">
                    to protect and secure your ideas,
                  </Text>
                  <Text className="text-center text-slate-500 text-base">
                    creations, and innovation.
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* FOOTER */}
      <View className="w-full p-5 bg-white border-t border-slate-200">
        {pageLoading ? (
          <Skeleton className="h-[60px] w-full rounded-2xl" />
        ) : (
          <TouchableOpacity
            onPress={RegisteredProperty}
            disabled={navigating}
            activeOpacity={0.8}
            className={`h-16 rounded-2xl justify-center items-center ${
              navigating ? "bg-slate-400" : "bg-primary"
            }`}
          >
            {navigating ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">Get Started</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
