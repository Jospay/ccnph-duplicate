import { getCart } from "@/services/cart";
import {
  getStoreNotifications,
  markAllStoreNotificationsAsRead,
  markStoreNotificationAsRead,
  StoreNotificationItem,
} from "@/services/storeNotificationService";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const notificationTabs = ["All", "Unread"];

export default function NotificationsPage() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState("All");
  const [cartCount, setCartCount] = useState<number>(0);

  const [notifications, setNotifications] = useState<StoreNotificationItem[]>(
    [],
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  // Cart badge
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

  // Store notifications
  const fetchNotifications = async () => {
    try {
      const { notifications: data, unreadCount: count } =
        await getStoreNotifications();
      setNotifications(data);
      setUnreadCount(count);
    } catch (error) {
      console.error("Failed to fetch store notifications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCartBadgeCount();
      fetchNotifications();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
    fetchCartBadgeCount();
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || markingAll) return;

    setMarkingAll(true);
    const prevNotifications = notifications;
    const prevUnreadCount = unreadCount;

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await markAllStoreNotificationsAsRead();
    } catch (error) {
      console.error("Failed to mark all store notifications as read:", error);
      // Revert on failure
      setNotifications(prevNotifications);
      setUnreadCount(prevUnreadCount);
    } finally {
      setMarkingAll(false);
    }
  };

  // Map notification type -> icon + colors
  const getNotificationIcon = (type: string) => {
    const t = (type || "").toLowerCase();

    if (t.includes("promo") || t.includes("sale") || t.includes("voucher")) {
      return {
        name: "gift-outline" as const,
        bg: "bg-amber-100",
        color: "#d97706",
      };
    }
    if (t.includes("order") || t.includes("ship") || t.includes("deliver")) {
      return {
        name: "cube-outline" as const,
        bg: "bg-[#DBEAFE]",
        color: "#2563eb",
      };
    }
    if (t.includes("payment") || t.includes("paid") || t.includes("approved")) {
      return {
        name: "card-outline" as const,
        bg: "bg-emerald-100",
        color: "#059669",
      };
    }
    if (
      t.includes("declined") ||
      t.includes("rejected") ||
      t.includes("cancel")
    ) {
      return {
        name: "close-circle-outline" as const,
        bg: "bg-rose-100",
        color: "#e11d48",
      };
    }
    if (t.includes("stock")) {
      return {
        name: "alert-circle-outline" as const,
        bg: "bg-orange-100",
        color: "#ea580c",
      };
    }
    return {
      name: "notifications-outline" as const,
      bg: "bg-[#DBEAFE]",
      color: "#2563eb",
    };
  };

  const handlePressNotification = async (item: StoreNotificationItem) => {
    if (!item.isRead) {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      markStoreNotificationAsRead(item.id).catch(console.error);
    }

    if (item.route) {
      try {
        const [rawPath, queryString] = item.route.split("?");
        const cleanPath = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;

        const params: Record<string, string> = {};
        if (queryString) {
          const urlParams = new URLSearchParams(queryString);
          urlParams.forEach((val, key) => {
            params[key] = val;
          });
        }
        params.from = "notification";

        router.push({
          pathname: cleanPath as any,
          params,
        });
      } catch (err) {
        console.error("Failed to parse and push notification route:", err);
      }
    }
  };

  const filteredNotifications = notifications.filter((notif) => {
    if (selectedTab === "Unread") return !notif.isRead;
    return true;
  });

  if (loading && !refreshing) {
    return (
      <View className="flex-1 bg-slate-100 justify-center items-center">
        <ActivityIndicator size="large" color="#3E4093" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-100">
      {/* HEADER */}
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
            <Ionicons name="cart-outline" size={24} color="#3E4093" />
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

      {/* TABS + MARK ALL READ */}
      <View className="flex-row items-center justify-between bg-white border-b border-slate-200 px-4 py-2">
        <View className="flex-row">
          {notificationTabs.map((tab) => {
            const active = selectedTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setSelectedTab(tab)}
                className={`px-4 py-2 rounded-full mr-2 flex-row items-center ${
                  active ? "bg-primary" : "bg-slate-100"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    active ? "text-white" : "text-slate-600"
                  }`}
                >
                  {tab}
                </Text>
                {tab === "Unread" && unreadCount > 0 && (
                  <View
                    className={`ml-1.5 rounded-full px-1.5 py-0.5 ${
                      active ? "bg-white/25" : "bg-primary"
                    }`}
                  >
                    <Text className="text-[10px] font-bold text-white">
                      {unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={handleMarkAllRead}
            disabled={markingAll}
            className="px-3 py-1.5"
          >
            {markingAll ? (
              <ActivityIndicator size="small" color="#3E4093" />
            ) : (
              <Text className="text-xs font-semibold text-primary">
                Mark all read
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* NOTIFICATIONS LIST */}
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => {
          const iconInfo = getNotificationIcon(item.type);

          return (
            <TouchableOpacity
              onPress={() => handlePressNotification(item)}
              className={`flex-row items-start p-4 border-b border-slate-100 ${
                item.isRead ? "bg-white" : "bg-blue/60"
              }`}
            >
              {/* Icon */}
              <View className={`p-2.5 rounded-full mr-3 ${iconInfo.bg}`}>
                <Ionicons
                  name={iconInfo.name}
                  size={20}
                  color={iconInfo.color}
                />
              </View>

              {/* Content */}
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
                    item.isRead
                      ? "text-slate-500"
                      : "text-slate-600 font-medium"
                  }`}
                  numberOfLines={2}
                >
                  {item.description}
                </Text>
              </View>

              {/* Unread dot */}
              {!item.isRead && (
                <View className="w-2 h-2 rounded-full bg-primary self-center ml-1" />
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
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
              There are no notifications found right now.
            </Text>
          </View>
        }
      />
    </View>
  );
}
