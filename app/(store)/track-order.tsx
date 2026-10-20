import PaymentBreakdownCard from "@/components/PaymentBreakdownCard";
import api from "@/services/api";
import { fetchSingleOrderAPI, SingleOrder } from "@/services/order";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface TimelineStep {
  key: string;
  title: string;
  description: string;
  timestamp: string | null;
  isCompleted: boolean;
  isCurrent: boolean;
}

// LOCAL / NATIONAL BADGE LOOK
const SCOPE_BADGE = {
  local: {
    label: "Local",
    icon: "location" as const,
    bg: "bg-emerald-600",
  },
  national: {
    label: "National",
    icon: "globe" as const,
    bg: "bg-[#3E4093]",
  },
};

// payment_methods.id -> icon (same ids as the checkout screen)
const PAYMENT_ICON: Record<number, any> = {
  9: "cash-outline", // COD
  11: "wallet-outline", // Points
  3: "qr-code-outline", // QR Ph
  4: "card-outline", // Maya
  5: "calendar-outline", // BillEase
  6: "phone-portrait-outline", // GrabPay
};

// Server origin taken from the API base URL (works on LAN and on the live domain)
const API_ORIGIN = String(api.defaults.baseURL || "")
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");

const resolveImageUrl = (path?: string | null): string | undefined => {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  return `${API_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
};

const fmt = (n: number) =>
  Number(n || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function TrackOrder() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  const [order, setOrder] = useState<SingleOrder | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (orderId) {
      fetchSingleOrderAPI(orderId)
        .then((res) => {
          if (res.success) setOrder(res.data.order);
        })
        .catch((err) => console.error("[TRACK_ORDER_ERROR]:", err))
        .finally(() => setIsLoading(false));
    }
  }, [orderId]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#3E4093" />
      </View>
    );
  }

  if (!order) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50 p-6">
        <Ionicons name="alert-circle-outline" size={56} color="#ef4444" />
        <Text className="text-slate-700 font-bold text-lg mt-3">
          Order Not Found
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 bg-primary px-5 py-2.5 rounded-xl"
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Extract database timestamps (handling direct fields or nested tracking object)
  const tracking: any = order.tracking || {};
  const createdAt = order.created_at || tracking.created_at;
  const confirmedAt = order.confirmed_at || tracking.confirmed_at;
  const processingAt = order.processing_at || tracking.processing_at;
  const packedAt = order.packed_at || tracking.packed_at;
  const shippedAt = order.shipped_at || tracking.shipped_at;
  const deliveredAt = order.delivered_at || tracking.delivered_at;
  const cancelledAt = order.cancelled_at || tracking.cancelled_at;
  const returnRequestedAt =
    order.return_requested_at || tracking.return_requested_at;
  const returnApprovedAt =
    order.return_approved_at || tracking.return_approved_at;
  const returnedAt = order.returned_at || tracking.returned_at;

  const isCancelled = order.status === "cancelled" || !!cancelledAt;

  // Standard delivery steps
  const steps: TimelineStep[] = [
    {
      key: "created",
      title: "Order Placed",
      description: createdAt
        ? "Order received and pending seller review."
        : "Order submitted.",
      timestamp: createdAt,
      isCompleted: !!createdAt,
      isCurrent: !!createdAt && !confirmedAt,
    },
    {
      key: "confirmed",
      title: "Order Confirmed",
      description: confirmedAt
        ? "Seller confirmed your order."
        : "Awaiting seller confirmation.",
      timestamp: confirmedAt,
      isCompleted: !!confirmedAt,
      isCurrent: !!confirmedAt && !processingAt,
    },
    {
      key: "processing",
      title: "Processing",
      description: processingAt
        ? "Order is being processed."
        : "Preparing to ship...",
      timestamp: processingAt,
      isCompleted: !!processingAt,
      isCurrent: !!processingAt && !packedAt,
    },
    {
      key: "packed",
      title: "Packed",
      description: packedAt
        ? "Package is packed and ready for pickup."
        : "Preparing to ship...",
      timestamp: packedAt,
      isCompleted: !!packedAt,
      isCurrent: !!packedAt && !shippedAt,
    },
    {
      key: "shipped",
      title: "Handed over to Courier",
      description: shippedAt
        ? "Parcel is in transit to destination."
        : "Preparing to ship...",
      timestamp: shippedAt,
      isCompleted: !!shippedAt,
      isCurrent: !!shippedAt && !deliveredAt,
    },
    {
      key: "delivered",
      title: "Order Delivered",
      description: deliveredAt
        ? "Package has been successfully delivered."
        : "Pending delivery.",
      timestamp: deliveredAt,
      isCompleted: !!deliveredAt,
      isCurrent: !!deliveredAt && !returnRequestedAt,
    },
  ];

  // Show the return timeline only after a return has been requested.
  if (returnRequestedAt) {
    steps.push(
      {
        key: "return_requested",
        title: "Return Requested",
        description: "Return request submitted.",
        timestamp: returnRequestedAt,
        isCompleted: true,
        isCurrent: !returnApprovedAt,
      },
      {
        key: "return_approved",
        title: "Return Approved",
        description: returnApprovedAt
          ? "Seller approved the return request."
          : "Awaiting seller approval.",
        timestamp: returnApprovedAt,
        isCompleted: !!returnApprovedAt,
        isCurrent: !!returnApprovedAt && !returnedAt,
      },
      {
        key: "returned",
        title: "Order Returned",
        description: returnedAt
          ? "Item has been successfully returned."
          : "Awaiting item return.",
        timestamp: returnedAt,
        isCompleted: !!returnedAt,
        isCurrent: !!returnedAt,
      },
    );
  }

  const formatDate = (isoString: string | null | undefined) => {
    if (!isoString) return "--";
    const d = new Date(isoString);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const payment = order.payment;
  const breakdown = order.breakdown;
  const isPaid = payment?.status === "paid";

  const itemShares: number[] = (() => {
    const items = order.items || [];
    const lines = items.map((it) => Number(it.price) * Number(it.quantity));
    const sub = lines.reduce((a, b) => a + b, 0);
    const amount = Number(breakdown?.amount ?? sub);

    if (sub <= 0) return lines;

    let running = 0;
    return lines.map((line, idx) => {
      if (idx === lines.length - 1) {
        return Math.round((amount - running) * 100) / 100;
      }
      const share = Math.round((line / sub) * amount * 100) / 100;
      running += share;
      return share;
    });
  })();

  return (
    <ScrollView
      className="flex-1 bg-slate-100 p-4"
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      {/* ORDER NUMBER & STATUS INFO BAR */}
      <View className="mb-2 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex-row justify-between items-center">
        <View>
          <Text className="text-xs text-slate-400 font-medium">
            Order Number
          </Text>
          <Text className="text-base font-bold text-slate-800 mt-0.5">
            #{order.order_number || `ORD-${order.id}`}
          </Text>
        </View>
        <View className="bg-blue px-3 py-1.5 rounded-full border border-primary">
          <Text className="text-xs font-semibold text-primary capitalize">
            {order.status_label || order.status || "In Progress"}
          </Text>
        </View>
      </View>

      {/* CANCELLED BANNER */}
      {isCancelled ? (
        <View className="mx-4 my-2 p-4 bg-red-50 border border-red-200 rounded-2xl flex-row items-center">
          <Ionicons name="close-circle" size={28} color="#ef4444" />
          <View className="ml-3 flex-1">
            <Text className="text-red-700 font-bold text-sm">
              Order Cancelled
            </Text>
            <Text className="text-red-500 text-xs mt-0.5">
              Cancelled on {formatDate(cancelledAt)}
            </Text>
          </View>
        </View>
      ) : order.status === "returned" || !!returnedAt ? (
        /* RETURNED BANNER */
        <View className="mx-4 my-2 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex-row items-center">
          <Ionicons name="return-up-back-circle" size={28} color="#f59e0b" />
          <View className="ml-3 flex-1">
            <Text className="text-amber-800 font-bold text-sm">
              Order Returned
            </Text>
            <Text className="text-amber-600 text-xs mt-0.5">
              Returned on {formatDate(returnedAt)}
            </Text>
          </View>
        </View>
      ) : null}

      {/* TIMELINE CARD */}
      {!isCancelled && (
        <View className="p-5 bg-white mb-2 rounded-2xl border border-slate-200 shadow-sm">
          <Text className="font-bold text-slate-800 text-base mb-4">
            Delivery Status
          </Text>

          {steps.map((step, index) => {
            const isLast = index === steps.length - 1;

            return (
              <View key={step.key} className="flex-row">
                {/* TIMELINE CONNECTOR */}
                <View className="items-center mr-4">
                  <View
                    className={`w-5 h-5 rounded-full items-center justify-center ${
                      step.isCompleted
                        ? "bg-primary"
                        : "bg-slate-100 border border-slate-300"
                    }`}
                  >
                    {step.isCompleted ? (
                      <Ionicons name="checkmark" size={12} color="#ffffff" />
                    ) : (
                      <View className="w-2 h-2 rounded-full bg-slate-300" />
                    )}
                  </View>
                  {!isLast && (
                    <View
                      className={`w-0.5 flex-1 my-1 ${
                        step.isCompleted ? "bg-primary" : "bg-slate-200"
                      }`}
                      style={{ minHeight: 36 }}
                    />
                  )}
                </View>

                {/* STEP CONTENT */}
                <View className="flex-1 pb-5">
                  <View className="flex-row justify-between items-center">
                    <Text
                      className={`font-semibold text-sm ${
                        step.isCompleted ? "text-slate-800" : "text-slate-400"
                      }`}
                    >
                      {step.title}
                    </Text>
                    <Text className="text-[11px] text-slate-400 font-medium">
                      {formatDate(step.timestamp)}
                    </Text>
                  </View>
                  <Text
                    className={`text-xs mt-1 ${
                      step.isCompleted ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    {step.description}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* RECIPIENT / SHIPPING INFO */}
      <View className="mb-2 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <View className="flex-row items-center mb-2">
          <Ionicons name="location-sharp" size={18} color="#3E4093" />
          <Text className="ml-2 font-bold text-slate-800 text-sm">
            Shipping Address
          </Text>
        </View>
        <Text className="text-slate-700 text-xs font-semibold">
          {order.shipping_name} ({order.shipping_phone})
        </Text>
        <Text className="text-slate-500 text-xs mt-1">
          {order.shipping_address}
        </Text>
      </View>

      {/* ITEM SUMMARY */}
      <View className="mb-2 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <Text className="font-bold text-slate-800 text-sm mb-3">
          Order Items ({order.items?.length || 0})
        </Text>
        {order.items?.map((item, i) => {
          // LOCAL / NATIONAL LABEL
          const scope = item.cooperative_scope;
          const badge = scope ? SCOPE_BADGE[scope] : null;

          return (
            <View key={item.id ?? i} className="flex-row items-center mb-3">
              <Image
                source={{ uri: resolveImageUrl(item.product_image) }}
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 8,
                  backgroundColor: "#f1f5f9",
                }}
              />
              <View className="flex-1 ml-3">
                {badge && (
                  <View
                    className={`self-start flex-row items-center px-2 py-0.5 rounded-full mb-1 ${badge.bg}`}
                  >
                    <Ionicons name={badge.icon} size={9} color="#ffffff" />
                    <Text className="text-white text-[9px] font-bold ml-1">
                      {badge.label}
                    </Text>
                  </View>
                )}

                <Text
                  numberOfLines={1}
                  className="text-xs font-semibold text-slate-800"
                >
                  {item.product_name}
                </Text>
                {!!item.variant_name && (
                  <Text className="text-[10px] text-slate-400 mt-0.5">
                    {item.variant_name}
                  </Text>
                )}
                <Text className="text-[10px] text-slate-400 mt-0.5">
                  ₱{fmt(item.price)} x {item.quantity}
                </Text>
              </View>

              {/* this item's share of the Total Payment */}
              <Text className="text-xs font-bold text-primary">
                ₱{fmt(itemShares[i] ?? 0)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* NOTE TO SELLER */}
      {!!order.note && (
        <View className="mb-2 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <View className="flex-row items-center mb-2">
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={18}
              color="#3E4093"
            />
            <Text className="ml-2 font-bold text-slate-800 text-sm">
              Message to Seller
            </Text>
          </View>
          <Text className="text-slate-500 text-xs">{order.note}</Text>
        </View>
      )}

      {/* PAYMENT METHOD */}
      {payment && (
        <View className="mb-2 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <Text className="font-bold text-slate-800 text-sm mb-3">
            Payment Method
          </Text>
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center">
              <Ionicons
                name={PAYMENT_ICON[payment.method_id] || "card-outline"}
                size={20}
                color="#3E4093"
              />
            </View>
            <View className="flex-1 ml-3">
              <Text className="font-semibold text-slate-800 text-sm">
                {payment.method}
              </Text>
              <Text className="text-[11px] text-slate-400 mt-0.5">
                {payment.is_cod
                  ? "Pay in cash when your order arrives"
                  : payment.is_points
                    ? "Paid using your store points"
                    : "Paid online"}
                {isPaid && payment.paid_at
                  ? ` · ${formatDate(payment.paid_at)}`
                  : ""}
              </Text>
            </View>
            <View
              className={`px-3 py-1 rounded-full ${
                isPaid ? "bg-emerald-50" : "bg-amber-50"
              }`}
            >
              <Text
                className={`text-[11px] font-bold ${
                  isPaid ? "text-emerald-600" : "text-amber-600"
                }`}
              >
                {payment.status_label}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* PRICE BREAKDOWN (subtotal, all discounts, shipping, online fee, total) */}
      {breakdown && (
        <View className="mb-6 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <Text className="font-bold text-slate-800 text-sm mb-3">
            Order Summary
          </Text>
          <PaymentBreakdownCard
            breakdown={breakdown}
            totalLabel={
              payment?.is_cod && !isPaid ? "Total to Pay" : "Total Payment"
            }
          />
          {breakdown.fee > 0 && (
            <Text className="text-slate-400 text-[11px] mt-2">
              The online processing fee was charged by the payment gateway.
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}
