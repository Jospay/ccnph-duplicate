import { getCart } from "@/services/cart";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";

// Static Notifications Mock Database
const STATIC_NOTIFICATIONS = [
  {
    id: "1",
    title: "⚡ Flash Sale Alert!",
    description:
      "Items in your favorites are up to 50% off for the next 2 hours. Don't miss out!",
    timestamp: "2 mins ago",
    type: "promo",
    isRead: false,
  },
  {
    id: "2",
    title: "📦 Order Shipped Successfully",
    description:
      "Your package containing your recent tech haul has been handed over to our courier.",
    timestamp: "1 hour ago",
    type: "update",
    isRead: false,
  },
  {
    id: "3",
    title: "🎟️ $10 Voucher Received!",
    description:
      "Claim your exclusive weekend shopper discount code: WEEKEND10 at checkout.",
    timestamp: "5 hours ago",
    type: "promo",
    isRead: true,
  },
  {
    id: "4",
    title: "🔧 System Maintenance Notice",
    description:
      "We are updating our payment gateways tonight at 12:00 AM. Expect short delays.",
    timestamp: "1 day ago",
    type: "update",
    isRead: true,
  },
];

const notificationTabs = ["All", "Promos", "Updates"];

export default function NotificationsPage() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState("All");
  const [cartCount, setCartCount] = useState<number>(0);

  // Sync Cart badge values dynamically matching the Collection calculations logic block
  const fetchCartBadgeCount = async () => {
    try {
      const response = await getCart();
      if (
        response &&
        response.success &&
        response.cart &&
        response.cart.items
      ) {
        const calculatedQuantities = response.cart.items.reduce(
          (accumulator, item) => accumulator + (item.quantity ?? 0),
          0,
        );
        const finalCount =
          calculatedQuantities > 0
            ? calculatedQuantities
            : response.cart.items.length;
        setCartCount(finalCount);
      }
    } catch (e) {
      console.error("Failed syncing notification view context badges:", e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCartBadgeCount();
    }, []),
  );

  // Filter listings completely statically based on current selected tab state
  const filteredNotifications = STATIC_NOTIFICATIONS.filter((notif) => {
    if (selectedTab === "Promos") return notif.type === "promo";
    if (selectedTab === "Updates") return notif.type === "update";
    return true;
  });

  return (
    <View className="flex-1 bg-slate-100">
      <View className="bg-white pt-3 pb-3 px-4 border-b border-slate-200">
        <View className="flex-row items-center">
          <View className="flex-1 flex-row items-center justify-center bg-blue rounded-2xl px-4 h-12">
            <Text className="text-primary text-2xl font-bold text-center">
              Notifications
            </Text>
          </View>

          {/* CART */}
          <TouchableOpacity
            onPress={() => router.push("/cart")}
            className="ml-3 bg-white h-12 w-12 rounded-2xl items-center justify-center border border-slate-200 relative"
          >
            <Ionicons name="cart-outline" size={24} color="#034194" />
            {cartCount > 0 && (
              <View className="absolute -top-1 -right-1 bg-[#D70127] rounded-full min-w-[18px] h-[18px] items-center justify-center px-1 border border-white">
                <Text className="text-white text-[10px] font-bold">
                  {cartCount > 99 ? "99+" : cartCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* STATIC NOTIFICATIONS LIST (DESIGN PRESERVED EXCLUSIVELY) */}
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            className={`flex-row items-start p-4 border-b border-slate-100 ${
              item.isRead ? "bg-white" : "bg-blue/60"
            }`}
          >
            {/* Visual Icon Indicators */}
            <View
              className={`p-2.5 rounded-full mr-3 ${
                item.type === "promo" ? "bg-amber-100" : "bg-[#DBEAFE]"
              }`}
            >
              <Ionicons
                name={
                  item.type === "promo"
                    ? "gift-outline"
                    : "notifications-outline"
                }
                size={20}
                color={item.type === "promo" ? "#d97706" : "#2563eb"}
              />
            </View>

            {/* Content Text Details */}
            <View className="flex-1 pr-2">
              <View className="flex-row justify-between items-start mb-0.5">
                <Text
                  className={`text-sm flex-1 mr-2 ${
                    item.isRead
                      ? "font-medium text-slate-800"
                      : "font-bold text-slate-900"
                  }`}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text className="text-[10px] text-slate-400 mt-0.5 font-medium">
                  {item.timestamp}
                </Text>
              </View>
              <Text
                className={`text-xs leading-4 ${
                  item.isRead ? "text-slate-500" : "text-slate-600 font-medium"
                }`}
                numberOfLines={2}
              >
                {item.description}
              </Text>
            </View>

            {/* Unread Active Badge Dot Indicator */}
            {!item.isRead && (
              <View className="w-2 h-2 rounded-full bg-[#034194] self-center ml-1" />
            )}
          </TouchableOpacity>
        )}
        ListHeaderComponent={
          <>
            {filteredNotifications.length === 0 && (
              <View className="items-center justify-center py-24">
                <View className="bg-slate-200 p-4 rounded-full mb-3">
                  <Ionicons
                    name="notifications-off-outline"
                    size={40}
                    color="#94a3b8"
                  />
                </View>
                <Text className="text-slate-500 font-semibold text-base">
                  All caught up!
                </Text>
                <Text className="text-slate-400 text-xs text-center px-12 mt-1 leading-4">
                  There are no alerts or promotional updates found under this
                  category tab right now.
                </Text>
              </View>
            )}
          </>
        }
      />
    </View>
  );
}
