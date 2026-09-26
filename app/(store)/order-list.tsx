import {
  fetchOrdersAPI,
  OrderBadges,
  OrderListItem,
  PaginationMeta,
  updateOrderStatusAPI,
} from "@/services/order";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const filterTabs = [
  { label: "All", slug: "all" },
  { label: "To Pay", slug: "to-pay" },
  { label: "To Ship", slug: "to-ship" },
  { label: "To Receive", slug: "to-receive" },
  { label: "Completed", slug: "completed" },
  { label: "Return/Refund", slug: "return_requested" },
  { label: "Cancelled", slug: "cancelled" },
];

export default function OrderList() {
  const router = useRouter();
  const { status: routeStatus } = useLocalSearchParams<{ status?: string }>();

  const [selectedSlug, setSelectedSlug] = useState<string>("all");
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [badges, setBadges] = useState<OrderBadges>({
    to_pay: 0,
    to_ship: 0,
    to_receive: 0,
    to_rate: 0,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // --- CANCEL ORDER MODAL STATE ---
  const [cancelModalOrderId, setCancelModalOrderId] = useState<number | null>(
    null,
  );
  const [cancellationReason, setCancellationReason] = useState<string>("");
  const [cancelReasonError, setCancelReasonError] = useState<string>("");

  const getOrders = useCallback(
    async (
      targetSlug: string,
      page: number = 1,
      clearExisting: boolean = false,
    ) => {
      try {
        if (page === 1 && !clearExisting) setIsLoading(true);
        if (page > 1) setIsLoadingMore(true);

        const response = await fetchOrdersAPI(targetSlug, page);

        if (response.success) {
          setOrders((prev) =>
            page === 1
              ? response.data.orders
              : [...prev, ...response.data.orders],
          );
          setPagination(response.data.pagination);
          setBadges(response.data.badges);
        }
      } catch (error) {
        console.error("[FETCH_ORDERS_ERROR]:", error);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
        setIsRefreshing(false);
      }
    },
    [],
  );

  // Sync initial tab state from route params
  useEffect(() => {
    if (routeStatus) {
      const activeTab = filterTabs.find(
        (t) =>
          t.slug === routeStatus ||
          t.label.toLowerCase() === routeStatus.toLowerCase() ||
          (routeStatus.includes("return") && t.slug === "return_requested"),
      );
      if (activeTab) {
        setSelectedSlug(activeTab.slug);
        return;
      }
    }
    setSelectedSlug("all");
  }, [routeStatus]);

  // Re-fetch orders whenever screen is focused or selected tab changes
  useFocusEffect(
    useCallback(() => {
      getOrders(selectedSlug, 1, false);
    }, [selectedSlug, getOrders]),
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    getOrders(selectedSlug, 1, true);
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && pagination?.has_more) {
      getOrders(selectedSlug, pagination.current_page + 1, false);
    }
  };

  const handleTabChange = (slug: string) => {
    setSelectedSlug(slug);
  };

  // --- CANCEL ORDER: opens the reason modal instead of a plain Alert ---
  const handleCancelOrder = (orderId: number) => {
    setCancellationReason("");
    setCancelReasonError("");
    setCancelModalOrderId(orderId);
  };

  const closeCancelModal = () => {
    if (actionLoadingId !== null) return; // don't allow closing mid-submit
    setCancelModalOrderId(null);
    setCancellationReason("");
    setCancelReasonError("");
  };

  const submitCancelOrder = async () => {
    if (!cancelModalOrderId) return;

    const trimmedReason = cancellationReason.trim();
    if (!trimmedReason) {
      setCancelReasonError("Please tell us why you're cancelling.");
      return;
    }

    const orderId = cancelModalOrderId;

    try {
      setActionLoadingId(orderId);
      const response = await updateOrderStatusAPI(orderId, "cancelled", {
        cancellation_reason: trimmedReason,
      });
      if (response.success) {
        setCancelModalOrderId(null);
        setCancellationReason("");
        setCancelReasonError("");
        Alert.alert(
          "Success",
          response.message || "Order successfully cancelled.",
        );
        handleTabChange("cancelled");
      } else {
        setCancelReasonError(response.message || "Failed to cancel order.");
      }
    } catch (error: any) {
      setCancelReasonError(
        error?.response?.data?.message ||
          "Something went wrong while cancelling the order.",
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOrderReceived = (orderId: number) => {
    Alert.alert(
      "Order Received",
      "Have you received your items? This will update the order status to completed.",
      [
        { text: "Not Yet", style: "cancel" },
        {
          text: "Yes, Received",
          onPress: async () => {
            try {
              setActionLoadingId(orderId);
              const response = await updateOrderStatusAPI(orderId, "completed");
              if (response.success) {
                Alert.alert(
                  "Success",
                  response.message || "Order marked as received!",
                );
                handleTabChange("completed");
              } else {
                Alert.alert(
                  "Error",
                  response.message || "Failed to update order status.",
                );
              }
            } catch (error: any) {
              Alert.alert(
                "Error",
                error?.response?.data?.message || "Something went wrong.",
              );
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ],
    );
  };

  const handleRefundOrder = (orderId: number) => {
    Alert.alert(
      "Request Refund / Return",
      "Are you sure you want to request a return or refund for this order?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit Request",
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoadingId(orderId);
              const response = await updateOrderStatusAPI(
                orderId,
                "return_requested",
              );
              if (response.success) {
                Alert.alert(
                  "Request Submitted",
                  response.message ||
                    "Your return request is now pending approval.",
                );
                handleTabChange("return_requested");
              } else {
                Alert.alert(
                  "Error",
                  response.message || "Failed to submit return request.",
                );
              }
            } catch (error: any) {
              Alert.alert(
                "Error",
                error?.response?.data?.message || "Something went wrong.",
              );
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ],
    );
  };

  const slugify = (text: string): string => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/[^\w\-]+/g, "")
      .replace(/\-\-+/g, "-")
      .replace(/^-+/, "")
      .replace(/-+$/, "");
  };

  const getBadgeCount = (slug: string) => {
    switch (slug) {
      case "to-pay":
        return badges.to_pay;
      case "to-ship":
        return badges.to_ship;
      case "to-receive":
        return badges.to_receive;
      case "completed":
        return badges.to_rate || 0;
      default:
        return 0;
    }
  };

  return (
    <View className="flex-1 bg-slate-100">
      {/* FILTER TABS SCROLL BAR */}
      <View className="bg-white pt-3 border-b border-slate-200">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="px-3"
        >
          {filterTabs.map((tab) => {
            const isTabActive = selectedSlug === tab.slug;
            const count = getBadgeCount(tab.slug);
            return (
              <TouchableOpacity
                key={`${tab.slug}-${tab.label}`}
                onPress={() => handleTabChange(tab.slug)}
                className={`mx-3 py-2 flex-row items-center ${
                  isTabActive ? "border-b-2 border-[#034194]" : ""
                }`}
              >
                <Text
                  className={`text-sm px-1 ${
                    isTabActive ? "text-[#034194] font-bold" : "text-slate-600"
                  }`}
                >
                  {tab.label}
                </Text>
                {count > 0 && (
                  <View className="bg-red-500 rounded-full px-1.5 py-0.5 ml-1">
                    <Text className="text-white text-[10px] font-bold">
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* RENDER LIST COMPONENT */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#034194" />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={["#034194"]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1}
          renderItem={({ item }) => {
            // Strictly check boolean value, handling true, 1, or "1" strings from API JSON
            const isRated =
              item.is_rated === true ||
              // item.is_rated === 1 ||
              String(item.is_rated) === "true" ||
              String(item.is_rated) === "1";

            const isCompletedAndRated = item.status === "completed" && isRated;

            return (
              <View className="bg-white rounded-2xl mb-4 p-3 border border-slate-200 shadow-sm">
                {/* SHOP HEADER */}
                <View className="flex-row bg-slate-50 py-2 rounded-xl justify-between items-center mb-3 px-2">
                  <View className="flex-row items-center flex-1 mr-2">
                    <Ionicons
                      name="storefront-outline"
                      size={16}
                      color="#4d4d4d"
                    />

                    <Text
                      className="ml-2 font-semibold text-md flex-1"
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {item.store_name || "Unknown Shop"}
                    </Text>
                  </View>

                  <Text className="text-primary text-sm font-medium">
                    {item.status_label}
                  </Text>
                </View>

                {/* PRODUCTS */}
                {item.items?.map((product, index) => (
                  <View
                    key={`${product.product_name}-${index}`}
                    className="flex-row mb-3"
                  >
                    <Image
                      source={{
                        uri: `${product.product_image}`,
                      }}
                      style={{
                        width: 75,
                        height: 75,
                        borderRadius: 12,
                        backgroundColor: "#f1f5f9",
                      }}
                    />
                    <View className="flex-1 ml-3 justify-between">
                      <View>
                        <Text
                          numberOfLines={2}
                          className="font-medium text-slate-800 text-md"
                        >
                          {product.product_name}
                        </Text>
                        {product.variant_name ? (
                          <View className="flex-row justify-between items-center mt-1">
                            <Text className="text-[11px] text-slate-400 mt-0.5">
                              {product.variant_name}
                            </Text>
                            <Text className="text-slate-400 text-xs">
                              x{product.quantity}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <View className="mt-1">
                        {/* BUY AGAIN BUTTON */}
                        {[
                          "cancelled",
                          "return_requested",
                          "return_approved",
                          "returned",
                        ].includes(item.status) || isCompletedAndRated ? (
                          <View className="flex-row justify-between items-center">
                            <TouchableOpacity
                              onPress={() => {
                                const productSlug = slugify(
                                  product.product_name,
                                );
                                router.push({
                                  pathname: "/products/[slug]",
                                  params: { slug: productSlug },
                                });
                              }}
                              className="bg-[#034194] px-4 py-2 rounded-lg"
                            >
                              <Text className="text-white text-xs font-semibold">
                                Buy Again
                              </Text>
                            </TouchableOpacity>
                            <Text className="font-semibold text-slate-800">
                              ₱{product.price}
                            </Text>
                          </View>
                        ) : (
                          <View className="flex-row justify-end">
                            <Text className="font-semibold text-slate-800">
                              ₱{product.price}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                ))}

                {/* BILLING SECTION */}
                <View className="pt-3 mt-1 border-t border-slate-100">
                  <View className="flex-row justify-end items-center gap-2">
                    <Text className="text-slate-500 text-sm">Order Total:</Text>
                    <Text className="font-bold text-base text-[#034194]">
                      ₱{item.total}
                    </Text>
                  </View>
                </View>

                {/* DYNAMIC ACTION TRIGGERS */}
                <View className="flex-row justify-end mt-4 gap-2 flex-wrap">
                  {/* 1. Cancel Option */}
                  {item.status === "to-pay" && (
                    <TouchableOpacity
                      disabled={actionLoadingId === item.id}
                      onPress={() => handleCancelOrder(item.id)}
                      className="border border-[#D70127] px-4 py-2 rounded-lg flex-row items-center"
                    >
                      {actionLoadingId === item.id ? (
                        <ActivityIndicator
                          size="small"
                          color="#ef4444"
                          style={{ marginRight: 4 }}
                        />
                      ) : null}
                      <Text className="text-[#D70127] text-xs font-semibold">
                        Cancel Order
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* 2. Order Received Option */}
                  {item.status === "delivered" && (
                    <TouchableOpacity
                      disabled={actionLoadingId === item.id}
                      onPress={() => handleOrderReceived(item.id)}
                      className="bg-primary px-4 py-2 rounded-lg flex-row items-center"
                    >
                      {actionLoadingId === item.id ? (
                        <ActivityIndicator
                          size="small"
                          color="#fff"
                          style={{ marginRight: 4 }}
                        />
                      ) : null}
                      <Text className="text-white text-xs font-semibold">
                        Order Received
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* 3. Refund / Return Option — hidden once completed order is already rated */}
                  {(item.status_label === "Delivered" ||
                    (item.status === "completed" && !isCompletedAndRated)) && (
                    <TouchableOpacity
                      disabled={actionLoadingId === item.id}
                      onPress={() => handleRefundOrder(item.id)}
                      className="border border-slate-300 px-4 py-2 rounded-lg flex-row items-center"
                    >
                      {actionLoadingId === item.id ? (
                        <ActivityIndicator
                          size="small"
                          color="#f97316"
                          style={{ marginRight: 4 }}
                        />
                      ) : null}
                      <Text className="text-xs text-slate-900 font-semibold">
                        Refund / Return
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* 4. Return Requested Status Badge */}
                  {item.status === "return_requested" && (
                    <View className="border border-slate-300 px-4 py-2 rounded-lg bg-slate-50">
                      <Text className="text-xs text-slate-700 font-semibold">
                        Return Requested (Pending)
                      </Text>
                    </View>
                  )}

                  {/* 5. Return Approved Status Badge */}
                  {item.status === "return_approved" && (
                    <View className="border border-slate-300 px-4 py-2 rounded-lg bg-slate-50">
                      <Text className="text-xs text-slate-700 font-semibold">
                        Return Approved
                      </Text>
                    </View>
                  )}

                  {/* 6. Returned / Completed Refund Status Badge */}
                  {item.status === "returned" && (
                    <View className="border border-slate-300 px-4 py-2 rounded-lg bg-slate-50">
                      <Text className="text-xs text-slate-700 font-semibold">
                        Returned/Refunded
                      </Text>
                    </View>
                  )}

                  {/* 7. Rate Order Button — Strictly hidden when isCompletedAndRated is true */}
                  {item.status === "completed" && !isCompletedAndRated && (
                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: "/rating-products",
                          params: { orderId: item.id },
                        })
                      }
                      className="bg-primary px-4 py-2 rounded-lg"
                    >
                      <Text className="text-white text-xs font-semibold">
                        Rate
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* TRACK ORDER BUTTON */}
                  {(item.status === "to-pay" ||
                    item.status === "to-ship" ||
                    item.status === "return_requested" ||
                    item.status === "return_approved" ||
                    item.status === "returned" ||
                    item.status === "shipped") && (
                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: "/track-order",
                          params: { orderId: item.id },
                        })
                      }
                      className="bg-[#034194] px-4 py-2 rounded-lg"
                    >
                      <Text className="text-white text-xs font-semibold">
                        Track Order
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Ionicons name="receipt-outline" size={48} color="#94a3b8" />
              <Text className="text-slate-500 font-semibold mt-2">
                No orders found
              </Text>
              <Text className="text-slate-400 text-xs mt-1 text-center px-6">
                There are no orders matching this selection status.
              </Text>
            </View>
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View className="py-4">
                <ActivityIndicator size="small" color="#034194" />
              </View>
            ) : null
          }
        />
      )}

      {/* CANCEL ORDER REASON MODAL */}
      <Modal
        visible={cancelModalOrderId !== null}
        transparent
        animationType="fade"
        onRequestClose={closeCancelModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1 justify-center items-center bg-black/40 px-6"
        >
          <View className="bg-white w-full rounded-2xl p-5">
            <Text className="text-base font-bold text-slate-900 mb-1">
              Cancel Order
            </Text>
            <Text className="text-sm text-slate-500 mb-3">
              Please tell us why you are cancelling this order. This action
              cannot be undone.
            </Text>

            <TextInput
              value={cancellationReason}
              onChangeText={(text) => {
                setCancellationReason(text);
                if (cancelReasonError) setCancelReasonError("");
              }}
              placeholder="e.g. Changed my mind, found a better price..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
              maxLength={500}
              editable={actionLoadingId === null}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 min-h-[80px]"
              textAlignVertical="top"
            />

            {cancelReasonError ? (
              <Text className="text-[#D70127] text-xs mt-1">
                {cancelReasonError}
              </Text>
            ) : null}

            <View className="flex-row justify-end mt-4 gap-2">
              <TouchableOpacity
                onPress={closeCancelModal}
                className="px-4 py-2 rounded-lg border border-slate-300"
                disabled={actionLoadingId !== null}
              >
                <Text className="text-slate-700 text-sm font-semibold">
                  Nevermind
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={submitCancelOrder}
                disabled={actionLoadingId !== null}
                className="px-4 py-2 rounded-lg bg-[#D70127] flex-row items-center"
              >
                {actionLoadingId === cancelModalOrderId ? (
                  <ActivityIndicator
                    size="small"
                    color="#fff"
                    style={{ marginRight: 6 }}
                  />
                ) : null}
                <Text className="text-white text-sm font-semibold">
                  Yes, Cancel Order
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
