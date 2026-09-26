import {
  fetchOrderForRatingAPI,
  fetchOrdersAPI,
  OrderListItem,
  PaginationMeta,
  RateItem,
} from "@/services/order";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

// --- SEPARATE VIDEO PLAYER COMPONENT ---
function ReviewVideoPlayer({ videoUrl }: { videoUrl: string }) {
  const player = useVideoPlayer(videoUrl, (player) => {
    player.loop = false;
  });

  return (
    <View className="mb-3">
      <Text className="text-[11px] font-semibold text-slate-400 mb-1.5">
        Video:
      </Text>
      <View className="w-full h-48 rounded-xl overflow-hidden bg-black">
        <VideoView
          style={{ width: "100%", height: "100%" }}
          player={player}
          allowsFullscreen
          allowsPictureInPicture
        />
      </View>
    </View>
  );
}

export default function ToRateScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"to-rate" | "rated">("to-rate");
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);

  // Feedback details fetching states
  const [fetchingOrderId, setFetchingOrderId] = useState<number | null>(null);
  const [selectedFeedbackItems, setSelectedFeedbackItems] = useState<
    RateItem[]
  >([]);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

  const isFeedbackModalVisible = selectedFeedbackItems.length > 0;
  const isImageModalVisible = !!selectedImageUri;

  // Used to pad the bottom sheet's content below the actual bottom edge —
  // that's the fix for the gap: the sheet needs breathing room that
  // accounts for the phone's gesture/nav bar or home indicator, same
  // pattern as the addresses screen's Save button bar.
  const insets = useSafeAreaInsets();

  const closeFeedbackModal = () => {
    setSelectedFeedbackItems([]);
  };

  const closeImageModal = () => {
    setSelectedImageUri(null);
  };

  const loadOrders = async (page = 1, shouldRefresh = false) => {
    try {
      if (page === 1 && !shouldRefresh) setLoading(true);
      const response = await fetchOrdersAPI("completed", page);

      if (response.success) {
        if (page === 1) {
          setOrders(response.data.orders);
        } else {
          setOrders((prev) => [...prev, ...response.data.orders]);
        }
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error("[LOAD_RATE_ORDERS_ERROR]:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadOrders(1);
    }, []),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadOrders(1, true);
  };

  const handleLoadMore = () => {
    if (pagination && pagination.has_more && !loadingMore) {
      setLoadingMore(true);
      loadOrders(pagination.current_page + 1);
    }
  };

  const handleViewFeedback = async (orderId: number) => {
    try {
      setFetchingOrderId(orderId);
      const response = await fetchOrderForRatingAPI(orderId);

      if (response.success && response.data?.order) {
        setSelectedFeedbackItems(response.data.order.items);
      } else {
        Alert.alert(
          "Error",
          response.message || "Failed to load review feedback.",
        );
      }
    } catch (error) {
      console.error("[VIEW_FEEDBACK_ERROR]:", error);
      Alert.alert("Error", "Could not connect to the server.");
    } finally {
      setFetchingOrderId(null);
    }
  };

  // Filter orders based on active tab
  const filteredOrders = orders.filter((order) => {
    if (activeTab === "to-rate") {
      return !order.is_rated;
    }
    return order.is_rated;
  });

  const renderOrderItem = ({ item }: { item: OrderListItem }) => {
    const isFetchingThis = fetchingOrderId === item.id;

    return (
      <View className="bg-white mb-3 p-4 rounded-2xl border border-slate-100 shadow-sm">
        {/* Header */}
        <View className="flex-row justify-between items-center pb-3 mb-3 border-b border-slate-100">
          <View className="flex-row items-center">
            <Ionicons name="storefront-outline" size={16} color="#334155" />
            <Text className="font-bold text-slate-800 text-sm ml-2">
              {item.store_name}
            </Text>
          </View>
          <Text className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
            Completed
          </Text>
        </View>

        {/* Items list preview */}
        {item.items.map((prod, index) => (
          <View key={prod.id || index} className="flex-row mb-3">
            <Image
              source={{
                uri: prod.product_image || "https://via.placeholder.com/100",
              }}
              className="w-16 h-16 rounded-xl bg-slate-100"
              resizeMode="cover"
            />
            <View className="flex-1 ml-3 justify-center">
              <Text
                className="font-semibold text-slate-800 text-sm"
                numberOfLines={1}
              >
                {prod.product_name}
              </Text>
              {prod.variant_name && (
                <Text className="text-xs text-slate-400 mt-0.5">
                  Variation: {prod.variant_name}
                </Text>
              )}
              <View className="flex-row justify-between items-center mt-2">
                <Text className="text-xs font-bold text-slate-700">
                  ₱{Number(prod.price).toLocaleString()}
                </Text>
                <Text className="text-xs text-slate-400">x{prod.quantity}</Text>
              </View>
            </View>
          </View>
        ))}

        {/* Total & Actions Footer */}
        <View className="flex-row justify-between items-center pt-3 mt-1 border-t border-slate-100">
          <View>
            <Text className="text-[11px] text-slate-400">Total Amount</Text>
            <Text className="text-sm font-bold text-[#034194]">
              ₱{Number(item.total).toLocaleString()}
            </Text>
          </View>

          {item.is_rated ? (
            <TouchableOpacity
              onPress={() => handleViewFeedback(item.id)}
              disabled={isFetchingThis}
              className="border border-[#034194] bg-blue-50 px-4 py-2 rounded-lg flex-row items-center"
            >
              {isFetchingThis ? (
                <ActivityIndicator size="small" color="#034194" />
              ) : (
                <Text className="text-xs text-[#034194] font-semibold">
                  View Feedback
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/rating-products",
                  params: { orderId: item.id },
                })
              }
              className="bg-[#034194] px-5 py-2.5 rounded-lg"
            >
              <Text className="text-xs text-white font-semibold">
                Rate Order
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#034194" />
        <Text className="text-xs text-slate-400 mt-2">Loading orders...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50 p-4">
      {/* FILTER TABS: TO-RATE vs RATED */}
      <View className="flex-row mb-4 bg-slate-200/60 p-1 rounded-2xl">
        <TouchableOpacity
          onPress={() => setActiveTab("to-rate")}
          className={`flex-1 py-2.5 rounded-xl items-center justify-center ${
            activeTab === "to-rate" ? "bg-white shadow-xs" : ""
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              activeTab === "to-rate" ? "text-[#034194]" : "text-slate-500"
            }`}
          >
            To Rate
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("rated")}
          className={`flex-1 py-2.5 rounded-xl items-center justify-center ${
            activeTab === "rated" ? "bg-white shadow-xs" : ""
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              activeTab === "rated" ? "text-[#034194]" : "text-slate-500"
            }`}
          >
            Rated
          </Text>
        </TouchableOpacity>
      </View>

      {/* ORDERS LIST */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderOrderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#034194"]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator
              size="small"
              color="#034194"
              style={{ marginVertical: 16 }}
            />
          ) : null
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Ionicons name="star-outline" size={48} color="#94A3B8" />
            <Text className="text-slate-500 font-semibold text-sm mt-3">
              No orders found
            </Text>
            <Text className="text-slate-400 text-xs mt-1">
              {activeTab === "to-rate"
                ? "You have no pending items to rate."
                : "You haven't rated any orders yet."}
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        showsVerticalScrollIndicator={false}
      />

      {/* VIEW FEEDBACK MODAL */}
      <Modal
        visible={isFeedbackModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeFeedbackModal}
        statusBarTranslucent={Platform.OS === "android"}
      >
        <TouchableWithoutFeedback onPress={closeFeedbackModal}>
          <View className="flex-1 bg-black/50 justify-end">
            <TouchableWithoutFeedback onPress={() => {}}>
              <SafeAreaView
                edges={["bottom"]}
                className="bg-white rounded-t-3xl max-h-[85%]"
              >
                {/* Modal Drag Handle & Header */}
                <View className="p-4 border-b border-slate-100 flex-row justify-between items-center">
                  <View className="flex-row items-center">
                    <Ionicons name="star" size={20} color="#EAB308" />
                    <Text className="text-base font-bold text-slate-800 ml-2">
                      Your Submitted Feedback
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={closeFeedbackModal}
                    className="p-1 rounded-full bg-slate-100"
                  >
                    <Ionicons name="close" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Modal Body */}
                <ScrollView
                  className="p-4"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                >
                  {selectedFeedbackItems.map((item, index) => {
                    const review = item.review;

                    return (
                      <View
                        key={item.order_item_id || index}
                        className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100"
                      >
                        {/* Product info */}
                        <View className="flex-row items-center mb-3">
                          <Image
                            source={{
                              uri:
                                item.product_image ||
                                "https://via.placeholder.com/100",
                            }}
                            className="w-12 h-12 rounded-xl bg-slate-200"
                          />
                          <View className="ml-3 flex-1">
                            <Text
                              className="font-bold text-slate-800 text-sm"
                              numberOfLines={1}
                            >
                              {item.product_name}
                            </Text>
                            {item.variant_name && (
                              <Text className="text-xs text-slate-400">
                                {item.variant_name}
                              </Text>
                            )}
                          </View>
                        </View>

                        {/* Rating stars & date */}
                        {review ? (
                          <>
                            <View className="flex-row justify-between items-center mb-2">
                              <View className="flex-row items-center space-x-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Ionicons
                                    key={star}
                                    name={
                                      star <= review.rating
                                        ? "star"
                                        : "star-outline"
                                    }
                                    size={16}
                                    color={
                                      star <= review.rating
                                        ? "#EAB308"
                                        : "#CBD5E1"
                                    }
                                  />
                                ))}
                                <Text className="text-xs font-bold text-slate-700 ml-1.5">
                                  {review.rating}.0
                                </Text>
                              </View>
                              <Text className="text-[11px] text-slate-400">
                                {review.created_at}
                              </Text>
                            </View>

                            {/* Comment */}
                            {review.comment ? (
                              <Text className="text-slate-700 text-xs leading-5 bg-white p-3 rounded-xl border border-slate-100 mb-3">
                                {review.comment}
                              </Text>
                            ) : null}

                            {/* Video */}
                            {review.video_url ? (
                              <ReviewVideoPlayer videoUrl={review.video_url} />
                            ) : null}

                            {/* Images */}
                            {review.images && review.images.length > 0 && (
                              <View className="mt-1">
                                <Text className="text-[11px] font-semibold text-slate-400 mb-1.5">
                                  Photos:
                                </Text>
                                <ScrollView
                                  horizontal
                                  showsHorizontalScrollIndicator={false}
                                  className="flex-row"
                                >
                                  {review.images.map((imgUri, imgIdx) => (
                                    <TouchableOpacity
                                      key={imgIdx}
                                      onPress={() =>
                                        setSelectedImageUri(imgUri)
                                      }
                                      className="mr-2"
                                    >
                                      <Image
                                        source={{ uri: imgUri }}
                                        className="w-20 h-20 rounded-xl bg-slate-200"
                                        resizeMode="cover"
                                      />
                                    </TouchableOpacity>
                                  ))}
                                </ScrollView>
                              </View>
                            )}
                          </>
                        ) : (
                          <Text className="text-xs italic text-slate-400">
                            No review details available.
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              </SafeAreaView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* FULL-SCREEN IMAGE PREVIEW MODAL */}
      <Modal
        visible={isImageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImageModal}
      >
        <View className="flex-1 bg-black justify-center items-center">
          <TouchableOpacity
            onPress={closeImageModal}
            className="absolute top-12 right-6 z-10 p-2 bg-white/20 rounded-full"
          >
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
          {selectedImageUri && (
            <Image
              source={{ uri: selectedImageUri }}
              className="w-full h-3/4"
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}
