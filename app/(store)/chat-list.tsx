import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import api from "@/services/api";
import { markShopConversationAsRead } from "@/services/chatShopService";
import echo from "@/services/echo";

interface UIShopConversation {
  id: number;
  shop_id?: number;
  created_at?: string;
  updated_at?: string;
  last_message_at?: string;
  shop?: {
    id: number;
    name: string;
    logo?: string;
  };
  display_name: string;
  shop_logo?: string;
  last_message: string;
  unread_count: number;
  pinnable_title?: string;
}

export default function ShopChatListScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<UIShopConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const totalUnreadCount = conversations.reduce(
    (acc, item) => acc + (item.unread_count || 0),
    0,
  );

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    try {
      const profileRes = await api.get("/profile");
      const rawUser = profileRes.data?.data;
      const uid = rawUser?.id || profileRes.data?.id;
      if (uid) setCurrentUserId(uid);

      await fetchConversationsList(uid);
    } catch (err) {
      console.error("❌ Error initializing shop chat list screen:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConversationsList = async (userIdFilter?: number | null) => {
    try {
      const res = await api.get("/shop-conversations");
      const rawList = res.data?.data || res.data || [];
      const targetUid = userIdFilter || currentUserId;

      const normalized: UIShopConversation[] = rawList.map((convo: any) => {
        // Resolve Peer / Shop Info
        const peerUser = convo.participants?.find(
          (p: any) => p.user_id !== targetUid,
        )?.user;

        const myPivot = convo.participants?.find(
          (p: any) => p.user_id === targetUid,
        );

        // Sort messages to grab latest
        const sortedMessages = convo.messages
          ? [...convo.messages].sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
            )
          : [];

        const latestMsg = sortedMessages[0] || convo.latest_message;
        const baseTimestamp =
          convo.last_message_at ||
          convo.updated_at ||
          convo.created_at ||
          new Date().toISOString();

        // Calculate unread count using last_read_at pivot
        let calculatedUnread = convo.unread_count ?? 0;
        if (myPivot && convo.messages) {
          const lastReadTime = myPivot.last_read_at
            ? new Date(myPivot.last_read_at).getTime()
            : 0;
          calculatedUnread = convo.messages.filter(
            (m: any) =>
              m.sender_id !== targetUid &&
              new Date(m.created_at).getTime() > lastReadTime,
          ).length;
        }

        const shopName = convo.shop?.name || peerUser?.name || "Store Inquiry";

        const contextTitle =
          convo.pinnable?.title ||
          convo.pinnable?.name ||
          convo.pinnable?.order_number ||
          (convo.pinnable_type
            ? convo.pinnable_type.split("\\").pop()
            : undefined);

        return {
          ...convo,
          display_name: shopName,
          shop_logo: convo.shop?.logo,
          pinnable_title: contextTitle,
          last_message: latestMsg
            ? latestMsg.body || "Sent an attachment"
            : "No messages yet",
          unread_count: calculatedUnread,
          updated_at: latestMsg ? latestMsg.created_at : baseTimestamp,
        };
      });

      normalized.sort(
        (a, b) =>
          new Date(b.updated_at || 0).getTime() -
          new Date(a.updated_at || 0).getTime(),
      );

      setConversations(normalized);
    } catch (err) {
      console.error("❌ Failed to fetch shop conversations:", err);
    }
  };

  const handlePullToRefresh = async () => {
    setRefreshing(true);
    await fetchConversationsList(currentUserId);
    setRefreshing(false);
  };

  useEffect(() => {
    if (!currentUserId || !echo) return;

    const userNotificationChannel = `App.Models.User.${currentUserId}`;

    echo.private(userNotificationChannel).notification((payload: any) => {
      setConversations((prevList) => {
        const targetConvoId = Number(
          payload.shop_conversation_id || payload.conversation_id,
        );

        return prevList
          .map((c) => {
            if (c.id === targetConvoId) {
              return {
                ...c,
                last_message: payload.body || "Sent an attachment",
                unread_count: (c.unread_count || 0) + 1,
                updated_at: new Date().toISOString(),
              };
            }
            return c;
          })
          .sort(
            (a, b) =>
              new Date(b.updated_at || 0).getTime() -
              new Date(a.updated_at || 0).getTime(),
          );
      });
    });

    return () => {
      if (echo) {
        echo.leave(userNotificationChannel);
      }
    };
  }, [currentUserId]);

  const openConversationRoom = async (selectedConvo: UIShopConversation) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedConvo.id ? { ...c, unread_count: 0 } : c,
      ),
    );

    try {
      await markShopConversationAsRead(selectedConvo.id);
    } catch (readErr) {
      console.error("❌ Failed marking conversation as read:", readErr);
    }

    // Matches the layout route & parameters
    router.push({
      pathname: "/(store-chat)/",
      params: {
        conversationId: String(selectedConvo.id),
        storeId: String(selectedConvo.shop_id || selectedConvo.shop?.id || ""),
        storeName: selectedConvo.display_name || "Seller",
      },
    });
  };

  const formatMessageTime = (isoString?: string | null) => {
    if (!isoString) return "";
    const stamp = new Date(isoString);
    const today = new Date();

    if (stamp.toDateString() === today.toDateString()) {
      return stamp.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return stamp.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const renderConversationCard = ({ item }: { item: UIShopConversation }) => {
    const isUnread = (item.unread_count || 0) > 0;
    const initialLetter = item.display_name.slice(0, 2).toUpperCase();

    return (
      <TouchableOpacity
        activeOpacity={0.65}
        onPress={() => openConversationRoom(item)}
        className="flex-row items-center bg-white px-4 py-3.5 border-b border-slate-50 active:bg-slate-50/80"
      >
        {/* Shop Avatar */}
        <View className="bg-primary w-12 h-12 rounded-full items-center justify-center shadow-sm relative">
          {item.shop_logo ? (
            <Image
              source={{ uri: item.shop_logo }}
              className="w-full h-full rounded-full"
              resizeMode="cover"
            />
          ) : (
            <Text className="text-white text-lg font-black tracking-wide">
              {initialLetter}
            </Text>
          )}

          {isUnread && (
            <View className="absolute right-0 bottom-0 bg-emerald-500 w-3.5 h-3.5 rounded-full border-2 border-white" />
          )}
        </View>

        {/* Messaging Details */}
        <View className="flex-1 ml-4 pr-1">
          <View className="flex-row justify-between items-baseline">
            <Text
              numberOfLines={1}
              className={`text-slate-900 text-[15px] flex-1 mr-2 ${isUnread ? "font-bold text-slate-950" : "font-semibold"}`}
            >
              {item.display_name}
            </Text>
            <Text
              className={`text-xs ${isUnread ? "text-primary font-bold" : "text-slate-400 font-medium"}`}
            >
              {formatMessageTime(item.updated_at || item.created_at)}
            </Text>
          </View>

          {/* Context / Pinned Reference */}
          {item.pinnable_title && (
            <Text
              numberOfLines={1}
              className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mt-0.5"
            >
              {item.pinnable_title}
            </Text>
          )}

          {/* Message Preview and Unread Badge */}
          <View className="flex-row justify-between items-center mt-1">
            <Text
              numberOfLines={1}
              className={`text-sm flex-1 mr-2 ${isUnread ? "text-slate-900 font-semibold" : "text-slate-500"}`}
            >
              {item.last_message}
            </Text>

            {isUnread && (
              <View className="bg-primary min-w-[20px] h-5 rounded-full items-center justify-center px-1.5 shadow-sm">
                <Text className="text-white font-black text-[10px] text-center">
                  {item.unread_count}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="bg-white px-5 py-4 flex-row items-center justify-between border-b border-slate-100">
        <View className="flex-row items-center">
          <Ionicons name="storefront" size={24} color="#034194" />
          <Text className="text-xl font-black text-slate-900 ml-2.5 tracking-tight">
            Store Messages
          </Text>

          {totalUnreadCount > 0 && (
            <View className="bg-primary px-2.5 py-0.5 rounded-full ml-2.5 shadow-sm">
              <Text className="text-white text-[10px] font-black uppercase">
                {totalUnreadCount} New
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Main List */}
      {loading ? (
        <View className="flex-1 items-center justify-center bg-white">
          <ActivityIndicator size="large" color="#034194" />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderConversationCard}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handlePullToRefresh}
              colors={["#034194"]}
              tintColor="#034194"
            />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center pt-32 px-8">
              <View className="bg-slate-50 p-5 rounded-full mb-4">
                <Ionicons
                  name="chatbubbles-outline"
                  size={42}
                  color="#94A3B8"
                />
              </View>
              <Text className="text-slate-900 font-extrabold text-base">
                No store conversations
              </Text>
              <Text className="text-slate-400 text-xs text-center mt-2 leading-5 max-w-[260px]">
                Your inquiries and orders placed with sellers will appear here.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
