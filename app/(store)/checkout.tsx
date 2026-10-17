import { CustomAlert } from "@/components/CustomAlert";
import api from "@/services/api";
import {
  Address,
  CheckoutItem,
  CheckoutSummary,
  fetchCheckoutDetails,
  PaymentMethod,
  placeOrderAPI,
} from "@/services/checkout";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// LOCAL / NATIONAL BADGE LOOK
const SCOPE_BADGE = {
  local: { label: "Local", icon: "location" as const, bg: "bg-emerald-600" },
  national: { label: "National", icon: "globe" as const, bg: "bg-[#3E4093]" },
};

// payment_methods.id
const PM = { COD: 9, QR: 3, MAYA: 4, BILLEASE: 5, GRABPAY: 6, POINT: 11 };
const PAYMENT_ORDER = [
  PM.COD,
  PM.POINT,
  PM.QR,
  PM.MAYA,
  PM.BILLEASE,
  PM.GRABPAY,
];
const ONLINE_IDS = [PM.QR, PM.MAYA, PM.BILLEASE, PM.GRABPAY];

const PAYMENT_META: Record<number, { icon: any; hint: string }> = {
  [PM.COD]: { icon: "cash-outline", hint: "Pay when your order arrives" },
  [PM.POINT]: { icon: "wallet-outline", hint: "Pay using your store points" },
  [PM.QR]: {
    icon: "qr-code-outline",
    hint: "Scan with GCash, Maya or bank app",
  },
  [PM.MAYA]: { icon: "card-outline", hint: "Pay with Maya" },
  [PM.BILLEASE]: { icon: "calendar-outline", hint: "Buy now, pay later" },
  [PM.GRABPAY]: { icon: "phone-portrait-outline", hint: "Pay with GrabPay" },
};

// Server origin taken from the API base URL (works on LAN and on the live domain),
// e.g. "http://192.168.1.120:8000/api" -> "http://192.168.1.120:8000"
const API_ORIGIN = String(api.defaults.baseURL || "")
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");

// Where to send the user when this checkout is no longer valid (cart items already
// paid/deleted). Only used when there is no previous screen to go back to.
// Change it to your real cart route if it is different.
const CART_ROUTE = "/(store)/cart";

const resolveImageUrl = (path?: string | null): string | undefined => {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  return `${API_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
};

export default function Checkout() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const isFocused = useIsFocused();

  const mode = params.mode === "direct" ? "direct" : "cart";
  const rawCartItemIds = params.cart_item_ids;
  const productVariantId = params.product_variant_id
    ? Number(params.product_variant_id)
    : null;
  const quantity = params.quantity ? Number(params.quantity) : 1;

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // true while we are silently leaving because the cart items are gone
  const isLeaving = useRef(false);

  const leaveCheckout = () => {
    if (isLeaving.current) return;
    isLeaving.current = true;

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(CART_ROUTE as any);
    }
  };

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    onClose: () => void;
    onConfirm?: () => void;
  }>({ visible: false, title: "", message: "", onClose: () => {} });

  const showAlert = (
    title: string,
    message: string,
    onClose: () => void = () => {},
    onConfirm?: () => void,
    confirmText?: string,
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      confirmText,
      onClose: () => {
        setAlertConfig((prev) => ({ ...prev, visible: false }));
        onClose();
      },
      onConfirm: onConfirm
        ? () => {
            setAlertConfig((prev) => ({ ...prev, visible: false }));
            onConfirm();
          }
        : undefined,
    });
  };

  const cartItemIds = useMemo<number[]>(() => {
    if (mode === "direct") return [];

    let parsed: number[] = [];
    if (Array.isArray(rawCartItemIds)) {
      parsed = rawCartItemIds.map(Number).filter(Boolean);
    } else {
      parsed = String(rawCartItemIds).split(",").map(Number).filter(Boolean);
    }
    return parsed;
  }, [rawCartItemIds, mode]);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod | null>(null);
  const [items, setItems] = useState<CheckoutItem[]>([]);
  const [summary, setSummary] = useState<CheckoutSummary | null>(null);
  const [pointBalance, setPointBalance] = useState<number>(0);
  const [note, setNote] = useState<string>("");

  const fmt = (n: number) =>
    Number(n || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  useEffect(() => {
    if (!isFocused) return;

    if (mode === "cart" && cartItemIds.length === 0) {
      showAlert("Error", "No items selected for checkout.", () =>
        router.back(),
      );
      return;
    }

    if (mode === "direct" && !productVariantId) {
      showAlert("Error", "Invalid checkout options configuration.", () =>
        router.back(),
      );
      return;
    }

    const loadCheckoutData = async () => {
      try {
        setLoading(true);
        let response;

        if (mode === "direct" && productVariantId) {
          response = await fetchCheckoutDetails({
            mode: "direct",
            product_variant_id: productVariantId,
            quantity: quantity,
          });
        } else {
          response = await fetchCheckoutDetails({ cart_item_ids: cartItemIds });
        }

        if (response.success) {
          const data = response.data;
          setAddresses(data.addresses);
          setItems(data.items);
          setSummary(data.summary);
          setPointBalance(Number(data.points_balance || 0));

          const defaultAddr =
            data.addresses.find((addr) => addr.is_default) || data.addresses[0];
          setSelectedAddress(defaultAddr || null);

          const allowed = PAYMENT_ORDER.map((id) =>
            data.paymentMethods.find((m) => Number(m.id) === id),
          ).filter(Boolean) as PaymentMethod[];

          setPaymentMethods(allowed);

          // keep the previous selection if it's still available, otherwise COD
          setSelectedPaymentMethod((prev) =>
            prev && allowed.some((m) => m.id === prev.id)
              ? prev
              : allowed.find((m) => Number(m.id) === PM.COD) ||
                allowed[0] ||
                null,
          );
        }
      } catch (error: any) {
        const httpStatus = error?.response?.status;

        // The selected cart items no longer exist (already paid and removed from
        // the cart, e.g. the user pressed back after a successful order): go back
        // to the cart quietly instead of showing an error.
        if (httpStatus === 422 || httpStatus === 404) {
          leaveCheckout();
          return;
        }

        console.error(
          "❌ [API ERROR] Network breakdown or backend rejection:",
          error,
        );
        showAlert(
          "Error",
          error?.response?.data?.message || "Failed to load checkout details.",
          () => router.back(),
        );
      } finally {
        // keep the loader visible while leaving so the empty checkout never flashes
        if (!isLeaving.current) setLoading(false);
      }
    };

    // coming back to this screen again later starts fresh
    isLeaving.current = false;
    loadCheckoutData();
  }, [rawCartItemIds, productVariantId, quantity, mode, isFocused]);

  const groupedItems = useMemo(() => {
    const groups: {
      [key: string]: { seller: string; products: CheckoutItem[] };
    } = {};
    items.forEach((item) => {
      const storeName = item.product?.store?.name || "CCNPH Store";
      if (!groups[storeName]) {
        groups[storeName] = { seller: storeName, products: [] };
      }
      groups[storeName].products.push(item);
    });
    return Object.values(groups);
  }, [items]);

  // Pricing comes from the backend (same numbers CheckoutService charges):
  //   COD    -> total
  //   Points -> total - point_discount
  //   Online -> total + online_fee
  const selectedId = Number(selectedPaymentMethod?.id);
  const isPointSelected = selectedId === PM.POINT;
  const isOnlineSelected = ONLINE_IDS.includes(selectedId);

  const baseTotal = Number(summary?.total || 0);
  const membershipDiscount = Number(summary?.membership_discount || 0);
  const sharedCapitalDiscount = Number(summary?.shared_capital_discount || 0);
  const pointDiscountAvailable = Number(summary?.point_discount || 0);
  const pointDiscount = isPointSelected ? pointDiscountAvailable : 0;
  const processingFee = isOnlineSelected ? Number(summary?.online_fee || 0) : 0;

  // what the customer pays with the selected method
  const total = baseTotal - pointDiscount + processingFee;
  // points needed if they choose Points (discount already applied)
  const pointsNeeded = baseTotal - pointDiscountAvailable;
  const insufficientPoints = pointBalance < pointsNeeded;

  const submitOrder = async () => {
    if (!selectedAddress || !selectedPaymentMethod) return;

    try {
      setSubmitting(true);

      const methodId = Number(selectedPaymentMethod.id);

      const payload: any = {
        address_id: selectedAddress.id,
        payment_method_id: selectedPaymentMethod.id,
        note: note.trim() || undefined,
        mode: mode,
      };

      if (mode === "direct") {
        payload.product_variant_id = productVariantId;
        payload.quantity = quantity;
      } else {
        payload.cart_item_ids = cartItemIds;
      }

      // where PayMongo sends the user back after paying (Maya / BillEase / GrabPay)
      if (ONLINE_IDS.includes(methodId)) {
        const base = String(api.defaults.baseURL || "").replace(/\/$/, "");
        payload.return_url = `${base}/payment/success`;
      }

      const result = await placeOrderAPI(payload);

      if (!result.success) {
        showAlert("Order Failure", result.message || "Unable to place order.");
        return;
      }

      // ONLINE: the order only counts after the third-party payment succeeds
      if (result.payment?.status === "pending" && result.checkout_id) {
        router.push({
          pathname: "/(store)/checkout-payment",
          params: {
            checkoutId: String(result.checkout_id),
            total: String(total),
          },
        });
        return;
      }

      // COD / POINTS: already complete
      showAlert("Success", result.message || "Order placed successfully!", () =>
        router.replace("/order-list"),
      );
    } catch (error: any) {
      console.error("❌ [ORDER PLACEMENT REJECTION] Request failure:", error);
      const data = error?.response?.data;
      showAlert(
        "Order Failure",
        data?.errors?.payment_method_id?.[0] ||
          data?.errors?.checkout?.[0] ||
          data?.message ||
          "Something went wrong processing your transaction.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handlePlaceOrder = () => {
    if (!selectedAddress) {
      showAlert("Validation Error", "Please choose a delivery address.");
      return;
    }
    if (!selectedPaymentMethod) {
      showAlert("Validation Error", "Please select a payment method.");
      return;
    }

    if (Number(selectedPaymentMethod.id) === PM.POINT) {
      if (insufficientPoints) {
        showAlert(
          "Insufficient Points",
          `You need ${fmt(total)} pts but only have ${fmt(pointBalance)} pts.`,
        );
        return;
      }

      showAlert(
        "Pay with Points",
        `Use ${fmt(total)} pts to pay for this order?`,
        () => {},
        submitOrder,
        "Pay",
      );
      return;
    }

    submitOrder();
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-100">
        <ActivityIndicator size="large" color="#3E4093" />
        <Text className="mt-3 text-slate-500 font-medium">
          Preparing checkout records...
        </Text>
      </View>
    );
  }

  const totalLabel = fmt(total);
  const placeOrderLabel = submitting
    ? "Processing Order..."
    : isOnlineSelected
      ? `Pay ₱${totalLabel}`
      : `Place Order ₱${totalLabel}`;

  return (
    <View className="flex-1 bg-slate-100">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 12, paddingBottom: 130 }}
      >
        {/* ADDRESS */}
        <View className="bg-white rounded-2xl p-4 mb-3">
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center">
              <Ionicons name="location-outline" size={24} color="#3E4093" />
              <Text className="ml-2 font-bold text-lg">Delivery Address</Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/address")}>
              <Text className="text-[#3E4093] font-semibold">
                {selectedAddress ? "Change" : "Add"}
              </Text>
            </TouchableOpacity>
          </View>

          {selectedAddress ? (
            <View className="mt-3">
              <Text className="font-semibold text-slate-800">
                {selectedAddress.recipient_name}
              </Text>
              <Text className="text-slate-500 my-0.5">
                {selectedAddress.recipient_number}
              </Text>
              <Text className="text-slate-500 text-sm leading-5">
                {selectedAddress.full_address}
              </Text>
              {selectedAddress.landmark && (
                <Text className="text-xs text-slate-400 mt-1 italic">
                  Landmark: {selectedAddress.landmark}
                </Text>
              )}
            </View>
          ) : (
            <Text className="text-red-500 mt-3 font-medium">
              No address options configured.
            </Text>
          )}
        </View>

        {/* ITEMS */}
        <View className="bg-white rounded-2xl p-4 mb-3">
          <Text className="font-bold text-lg mb-3">Order Items</Text>

          {groupedItems.map((shop) => (
            <View key={shop.seller} className="mb-2">
              <View className="flex-row items-center mb-3">
                <Ionicons name="storefront-outline" size={20} color="#3E4093" />
                <Text className="ml-2 font-semibold text-slate-800">
                  {shop.seller}
                </Text>
              </View>

              {shop.products.map((item) => {
                const variantAttributes =
                  item.attributes
                    ?.map((attr) => `${attr.name}: ${attr.value}`)
                    .join(" • ") || "";

                const cleanImgUrl = resolveImageUrl(item.product.image);

                const scope = item.product.cooperative_scope;
                const badge = scope ? SCOPE_BADGE[scope] : null;

                return (
                  <View key={item.id} className="flex-row mb-4">
                    <Image
                      source={{ uri: cleanImgUrl }}
                      style={{
                        width: 75,
                        height: 75,
                        borderRadius: 12,
                        backgroundColor: "#f1f5f9",
                      }}
                    />

                    <View className="flex-1 ml-3 justify-between">
                      {badge && (
                        <View
                          className={`self-start flex-row items-center px-2 py-0.5 rounded-full mb-1 ${badge.bg}`}
                        >
                          <Ionicons
                            name={badge.icon}
                            size={9}
                            color="#ffffff"
                          />
                          <Text className="text-white text-[9px] font-bold ml-1">
                            {badge.label}
                          </Text>
                        </View>
                      )}

                      <Text
                        numberOfLines={2}
                        className="font-semibold text-primary"
                      >
                        {item.product.name}
                      </Text>

                      {variantAttributes !== "" && (
                        <Text className="text-xs text-slate-500 mt-0.5">
                          {variantAttributes}
                        </Text>
                      )}

                      <View className="flex-row items-center justify-between mt-1">
                        <Text className="font-bold text-primary text-base">
                          ₱{Number(item.variant.price).toLocaleString()}
                        </Text>
                        <Text className="text-slate-500 font-medium">
                          x{item.quantity}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* MESSAGE */}
        <View className="bg-white rounded-2xl p-4 mb-3">
          <Text className="font-bold mb-2 text-slate-800">
            Message to Seller (Optional)
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Add note for seller..."
            multiline
            className="bg-slate-100 rounded-xl px-4 py-3 text-slate-700"
            style={{ height: 90, textAlignVertical: "top" }}
          />
        </View>

        {/* PAYMENT METHODS */}
        <View className="bg-white rounded-2xl p-4 mb-3">
          <Text className="font-bold text-lg mb-3">Payment Method</Text>

          {paymentMethods.map((method) => {
            const id = Number(method.id);
            const active = selectedPaymentMethod?.id === method.id;
            const meta = PAYMENT_META[id];
            const isPoint = id === PM.POINT;
            const disabled = isPoint && insufficientPoints;

            return (
              <TouchableOpacity
                key={method.id}
                disabled={disabled}
                onPress={() => setSelectedPaymentMethod(method)}
                className={`flex-row items-center p-3 mb-2 rounded-xl border ${
                  active ? "border-[#3E4093] bg-slate-50" : "border-slate-200"
                } ${disabled ? "opacity-50" : ""}`}
              >
                <Ionicons
                  name={active ? "radio-button-on" : "radio-button-off"}
                  size={22}
                  color="#3E4093"
                />
                {meta && (
                  <Ionicons
                    name={meta.icon}
                    size={22}
                    color="#3E4093"
                    style={{ marginLeft: 12 }}
                  />
                )}
                <View className="ml-3 flex-1">
                  <Text className="font-medium text-slate-700">
                    {method.name}
                  </Text>
                  {isPoint ? (
                    <Text
                      className={`text-xs ${
                        insufficientPoints ? "text-red-500" : "text-slate-400"
                      }`}
                    >
                      Balance: {fmt(pointBalance)} pts
                      {insufficientPoints ? " · Insufficient" : ""}
                      {!insufficientPoints && pointDiscountAvailable > 0
                        ? ` · Save ₱${fmt(pointDiscountAvailable)}`
                        : ""}
                    </Text>
                  ) : (
                    meta && (
                      <Text className="text-xs text-slate-400">
                        {meta.hint}
                      </Text>
                    )
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* SUMMARY */}
        {summary && (
          <View className="bg-white rounded-2xl p-4 mb-3">
            <Text className="font-bold text-lg mb-3">Order Summary</Text>

            <View className="flex-row justify-between mb-2">
              <Text className="text-slate-500">Merchandise Subtotal</Text>
              <Text className="text-slate-800 font-medium">
                ₱{Number(summary.subtotal).toLocaleString()}
              </Text>
            </View>

            {membershipDiscount > 0 && (
              <View className="flex-row justify-between mb-2">
                <Text className="text-slate-500">Membership Discount</Text>
                <Text className="text-[#D70127] font-medium">
                  -₱{fmt(membershipDiscount)}
                </Text>
              </View>
            )}

            {sharedCapitalDiscount > 0 && (
              <View className="flex-row justify-between mb-2">
                <Text className="text-slate-500">Shared Capital Discount</Text>
                <Text className="text-[#D70127] font-medium">
                  -₱{fmt(sharedCapitalDiscount)}
                </Text>
              </View>
            )}

            {pointDiscount > 0 && (
              <View className="flex-row justify-between mb-2">
                <Text className="text-slate-500">Points Discount</Text>
                <Text className="text-[#D70127] font-medium">
                  -₱{fmt(pointDiscount)}
                </Text>
              </View>
            )}

            <View className="flex-row justify-between mb-2">
              <Text className="text-slate-500">Shipping Subtotal</Text>
              <Text className="text-slate-800 font-medium">
                ₱{Number(summary.shipping_fee).toLocaleString()}
              </Text>
            </View>

            {processingFee > 0 && (
              <View className="flex-row justify-between mb-2">
                <Text className="text-slate-500">Processing Fee</Text>
                <Text className="text-slate-800 font-medium">
                  ₱{fmt(processingFee)}
                </Text>
              </View>
            )}

            <View className="border-t border-slate-200 mt-3 pt-3 flex-row justify-between">
              <Text className="font-bold text-lg text-slate-800">
                Total Payment
              </Text>
              <Text className="font-bold text-primary text-lg">
                ₱{fmt(total)}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* FOOTER ACTION */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4">
        <TouchableOpacity
          onPress={handlePlaceOrder}
          disabled={submitting}
          className={`rounded-2xl py-4 items-center ${submitting ? "bg-slate-400" : "bg-primary"}`}
        >
          <Text className="text-white font-bold text-lg">
            {placeOrderLabel}
          </Text>
        </TouchableOpacity>
      </View>

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        confirmText={alertConfig.confirmText}
        onClose={alertConfig.onClose}
        onConfirm={alertConfig.onConfirm}
      />
    </View>
  );
}
