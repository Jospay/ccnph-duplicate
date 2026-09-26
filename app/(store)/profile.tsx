import { fetchOrdersAPI } from "@/services/order";
import { profileService } from "@/services/profileService";
import { useAuthStore } from "@/store/useAuthStore";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import UserProfileFallback from "../../assets/images/UserProfile.jpg";

// Matching layout status mapping keys to backend validator options
const STATUS_MAP: Record<string, string> = {
  All: "all",
  "To Pay": "to-pay",
  "To Ship": "to-ship",
  "To Receive": "to-receive",
  Completed: "completed",
};

// Explicit TypeScript typings matching backend relationship payloads
interface UserType {
  id: number;
  name: string;
}

interface UserStatus {
  id: number;
  name: string;
}

interface BuyerUserData {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  is_seller: boolean;
  user_type?: UserType;
  status?: UserStatus;
}

export default function BuyerProfile() {
  const router = useRouter();
  const { setUser } = useAuthStore();

  // Component State
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<BuyerUserData | null>(null);
  const [orderBadges, setOrderBadges] = useState({
    toPay: 0,
    toShip: 0,
    toReceive: 0,
    toRate: 0,
  });

  // Fetch profile and badge counts automatically whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      async function loadProfileData() {
        try {
          // Load latest profile
          const profile = await profileService.getProfile();
          if (isMounted) {
            setUser(profile);
            setUserData(profile);
          }

          // Load order badges
          const response = await fetchOrdersAPI("all", 1);

          if (isMounted && response.success && response.data) {
            setOrderBadges({
              toPay: response.data.badges?.to_pay || 0,
              toShip: response.data.badges?.to_ship || 0,
              toReceive: response.data.badges?.to_receive || 0,
              toRate: response.data.badges?.to_rate || 0,
            });
          }
        } catch (error) {
          console.error("Error fetching buyer profile data:", error);
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      }

      loadProfileData();

      return () => {
        isMounted = false;
      };
    }, []),
  );

  // Structural evaluation flags matching profile rule sets
  const userTypeName = userData?.user_type?.name?.toUpperCase() || "";
  const statusName = userData?.status?.name?.toLowerCase() || "";

  // Map user parameters safely to match string validations expected by Laravel index filters
  const handleTrackOrderPress = (uiLabel: string) => {
    const backendStatus = STATUS_MAP[uiLabel] || "all";
    router.push({
      pathname: "/order-list",
      params: { status: backendStatus },
    });
  };

  // Redirect to main editable profile view
  const handleRedirectToMainProfile = (section?: string) => {
    if (section) {
      router.push(`/(main)/profile?edit=${section}`);
    } else {
      router.push("/(main)/profile");
    }
  };

  // Determine standard colors for the status pill badge wrapper
  const getStatusColor = (status: string) => {
    const currentStatus = status?.toLowerCase() || "";
    if (currentStatus.includes("pending") || currentStatus === "for_approval")
      return "text-[#C6890F] bg-orange-50";
    if (currentStatus.includes("active") || currentStatus === "approved")
      return "text-green-500 bg-green-50";
    return "text-gray-500 bg-gray-50";
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#034194" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* PROFILE CARD HEADER CONTAINER */}
        <View className="bg-primary w-full rounded-b-2xl px-10 pt-20 pb-10">
          <View className="flex-row justify-between items-start pb-5">
            <View className="flex-row items-center">
              <Image
                source={
                  userData?.avatar
                    ? { uri: userData.avatar }
                    : UserProfileFallback
                }
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: 34,
                  borderWidth: 3,
                }}
                className="border-white"
              />
              <View className="ml-4">
                <Text className="text-white text-xl font-bold tracking-tight">
                  {userData?.name}
                </Text>
                <Text className="text-white text-xs">{userData?.phone}</Text>

                <View
                  className={`self-start px-3 py-1 rounded-2xl mt-3 ${getStatusColor(statusName)}`}
                >
                  <Text className="text-[10px] font-bold uppercase tracking-wider">
                    {userTypeName || "BASIC"} • {statusName || "ACCOUNT"}
                  </Text>
                </View>
              </View>
            </View>

            <View className="pt-3">
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleRedirectToMainProfile()}
              >
                <Ionicons name="settings-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* TRACKING ORDER STATES LAYER */}
        <View
          className="mx-4 bg-white rounded-3xl p-4 border border-slate-100 shadow-sm"
          style={{ marginTop: -20, zIndex: 10 }}
        >
          <View className="flex-row justify-between items-center border-b border-slate-100 pb-3 mb-4">
            <Text className="font-bold text-primary text-base tracking-tight">
              My Purchases
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              className="flex-row items-center"
              onPress={() => handleTrackOrderPress("All")}
            >
              <Text className="text-xs text-slate-400 font-medium mr-1">
                View Order History
              </Text>
              <Ionicons name="chevron-forward" size={14} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-between items-center px-1">
            {/* TO PAY SELECTION */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleTrackOrderPress("To Pay")}
              className="items-center justify-center w-16 relative"
            >
              <Ionicons name="wallet-outline" size={24} color="#034194" />
              <Text className="text-[11px] text-primary font-medium mt-2 text-center">
                To Pay
              </Text>
              {orderBadges.toPay > 0 && (
                <View className="absolute -top-1 right-1 bg-[#D70127] rounded-full min-w-[16px] h-[16px] items-center justify-center px-1 border border-white">
                  <Text className="text-white text-[9px] font-bold">
                    {orderBadges.toPay}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* TO SHIP SELECTION */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleTrackOrderPress("To Ship")}
              className="items-center justify-center w-16 relative"
            >
              <Ionicons name="cube-outline" size={24} color="#034194" />
              <Text className="text-[11px] text-primary font-medium mt-2 text-center">
                To Ship
              </Text>
              {orderBadges.toShip > 0 && (
                <View className="absolute -top-1 right-1 bg-[#D70127] rounded-full min-w-[16px] h-[16px] items-center justify-center px-1 border border-white">
                  <Text className="text-white text-[9px] font-bold">
                    {orderBadges.toShip}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* TO RECEIVE SELECTION */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleTrackOrderPress("To Receive")}
              className="items-center justify-center w-16 relative"
            >
              <Ionicons name="airplane-outline" size={24} color="#034194" />
              <Text className="text-[11px] text-primary font-medium mt-2 text-center">
                To Receive
              </Text>
              {orderBadges.toReceive > 0 && (
                <View className="absolute -top-1 right-1 bg-[#D70127] rounded-full min-w-[16px] h-[16px] items-center justify-center px-1 border border-white">
                  <Text className="text-white text-[9px] font-bold">
                    {orderBadges.toReceive}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* TO RATE SELECTION */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push("/to-rate")} // <-- Direct routing here
              className="items-center justify-center w-16 relative"
            >
              <Ionicons name="star-outline" size={24} color="#034194" />
              <Text className="text-[11px] text-primary font-medium mt-2 text-center">
                To Rate
              </Text>
              {orderBadges.toRate > 0 && (
                <View className="absolute -top-1 right-1 bg-[#D70127] rounded-full min-w-[16px] h-[16px] items-center justify-center px-1 border border-white">
                  <Text className="text-white text-[9px] font-bold">
                    {orderBadges.toRate}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ACCOUNT MANAGE SECTIONS LIST */}
        <View className="mx-4 bg-white rounded-3xl p-2 mt-4 border border-slate-100 shadow-sm mb-6">
          <TouchableOpacity
            activeOpacity={0.6}
            onPress={() => router.push("/address")}
            className="flex-row items-center justify-between p-4 border-b border-slate-50"
          >
            <View className="flex-row items-center">
              <Ionicons name="location-outline" size={20} color="#034194" />
              <Text className="ml-3 text-slate-700 font-medium">
                Shipping Address
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.6}
            onPress={() => router.push("/(main)")}
            className="flex-row items-center justify-between p-4"
          >
            <View className="flex-row items-center">
              <Ionicons name="storefront-outline" size={20} color="#034194" />
              <Text className="ml-3 text-slate-700 font-medium">
                Return to FISMPC
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ABSOLUTE START SELLING BUTTON AT SCREEN BOTTOM */}
      <View className="absolute bottom-0 left-0 mx-4 mb-10 right-0">
        {userData?.is_seller ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={async () => {
              const url = "http://192.168.42.10:8000/login";
              const supported = await Linking.canOpenURL(url);
              if (supported) {
                await Linking.openURL(url);
              } else {
                console.error("Don't know how to open this URL: " + url);
              }
            }}
            className="bg-primary w-full py-4 rounded-2xl items-center justify-center shadow-lg"
          >
            <View className="flex-row items-center gap-2">
              <Ionicons name="earth-outline" size={20} color="#fff" />
              <Text className="text-white font-bold text-xl">
                Go to Seller Dashboard
              </Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/register-seller")}
            className="bg-primary w-full py-4 rounded-2xl items-center justify-center shadow-lg"
          >
            <View className="flex-row items-center gap-2">
              <Ionicons name="storefront-outline" size={20} color="#fff" />
              <Text className="text-white font-bold text-xl">
                Start Selling
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
