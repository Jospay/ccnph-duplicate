import api from "./api";

export interface Address {
  id: number;
  label: string;
  recipient_name: string;
  recipient_number: string;
  full_address: string;
  is_default: boolean;
  landmark?: string | null;
}

export interface PaymentMethod {
  id: number;
  slug: string;
  name: string;
  gateway_type?: string | null;
}

export interface CheckoutItem {
  id: number;
  quantity: number;
  product: {
    name: string;
    slug: string;
    image: string | null;
    cooperative_id?: number | null;
    cooperative_scope?: "local" | "national";
    store: {
      name: string;
      slug: string;
    };
  };
  variant: {
    id: number;
    sku: string;
    price: number;
    image?: string | null;
  };
  attributes: { name: string; value: string }[];
  subtotal: number;
}

export interface CheckoutSummary {
  subtotal: number;
  shipping_fee: number;
  // membership + shared capital (always applied)
  discount: number;
  membership_discount?: number;
  shared_capital_discount?: number;
  // only applied when paying with Points
  point_discount?: number;
  // price for COD. Points: total - point_discount. Online: total + online_fee
  total: number;
  // online payment processing fee (TransactionFee "Store")
  online_fee?: number;
}

export interface CheckoutDetailsResponse {
  success: boolean;
  data: {
    addresses: Address[];
    paymentMethods: PaymentMethod[];
    items: CheckoutItem[];
    points_balance: number;
    summary: CheckoutSummary;
  };
}

export interface FetchCheckoutParams {
  mode?: "direct" | "cart";
  cart_item_ids?: number[];
  product_variant_id?: number | null;
  quantity?: number;
}

export interface PlaceOrderPayload {
  address_id: number;
  payment_method_id: number;
  note?: string;
  mode: "direct" | "cart";
  cart_item_ids?: number[];
  product_variant_id?: number | null;
  quantity?: number;
  return_url?: string;
}

export interface PlaceOrderResponse {
  success: boolean;
  message: string;
  checkout_id?: number;
  order_id?: number;
  // present only for online payments (QR / Maya / BillEase / GrabPay)
  payment?: {
    status: "pending";
    gateway_type: string;
    redirect_url: string | null;
    qr_image: string | null;
  };
}

export type CheckoutPaymentState = "pending" | "paid" | "failed";

export interface CheckoutPaymentStatusResponse {
  success: boolean;
  data: {
    status: CheckoutPaymentState;
    method: string | null;
    // what the user pays: order total + processing fee
    amount: number;
    // online processing fee included in `amount`
    fee?: number;
    // order total without the fee
    order_total?: number;
    checkout_number: string;
    redirect_url: string | null;
    qr_image: string | null;
  };
}

export const fetchCheckoutDetails = async (
  params: FetchCheckoutParams,
): Promise<CheckoutDetailsResponse> => {
  const response = await api.get<CheckoutDetailsResponse>("/store/checkout", {
    params,
    paramsSerializer: (serializedParams) => {
      const searchParams = new URLSearchParams();

      if (serializedParams.mode === "direct") {
        searchParams.append("mode", "direct");
        if (serializedParams.product_variant_id) {
          searchParams.append(
            "product_variant_id",
            serializedParams.product_variant_id.toString(),
          );
        }
        if (serializedParams.quantity) {
          searchParams.append("quantity", serializedParams.quantity.toString());
        }
      } else if (
        serializedParams.cart_item_ids &&
        Array.isArray(serializedParams.cart_item_ids)
      ) {
        serializedParams.cart_item_ids.forEach((id: number) => {
          searchParams.append("cart_item_ids[]", id.toString());
        });
      }

      return searchParams.toString();
    },
  });

  return response.data;
};

export const placeOrderAPI = async (
  payload: PlaceOrderPayload,
): Promise<PlaceOrderResponse> => {
  const response = await api.post<PlaceOrderResponse>(
    "/store/checkout",
    payload,
  );
  return response.data;
};

export const getCheckoutPaymentStatus = async (
  checkoutId: number | string,
): Promise<CheckoutPaymentStatusResponse> => {
  const response = await api.get<CheckoutPaymentStatusResponse>(
    `/store/checkout/${checkoutId}/payment-status`,
  );
  return response.data;
};

export const cancelCheckoutPayment = async (
  checkoutId: number | string,
): Promise<void> => {
  await api.post(`/store/checkout/${checkoutId}/cancel`);
};
