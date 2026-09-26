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
}

export interface CheckoutItem {
  id: number;
  quantity: number;
  product: {
    name: string;
    slug: string;
    image: string | null;
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
  discount: number;
  total: number;
}

export interface CheckoutDetailsResponse {
  success: boolean;
  data: {
    addresses: Address[];
    paymentMethods: PaymentMethod[];
    items: CheckoutItem[];
    summary: CheckoutSummary;
  };
}

// Unified input parameter capabilities interface supporting both modes
export interface FetchCheckoutParams {
  mode?: "direct" | "cart";
  cart_item_ids?: number[];
  product_variant_id?: number | null;
  quantity?: number;
}

// Flexible structural payload type supporting both direct buy configurations and cart array arrays
export interface PlaceOrderPayload {
  address_id: number;
  payment_method_id: number;
  note?: string;
  mode: "direct" | "cart";
  cart_item_ids?: number[];
  product_variant_id?: number | null;
  quantity?: number;
}

export interface PlaceOrderResponse {
  success: boolean;
  message: string;
  checkout_id?: number;
}

/**
 * Fetches the checkout records from Laravel supporting standard cart setups and direct bypasses
 */
export const fetchCheckoutDetails = async (
  params: FetchCheckoutParams,
): Promise<CheckoutDetailsResponse> => {
  const response = await api.get<CheckoutDetailsResponse>("/store/checkout", {
    params,
    // ✅ FIXED: Lookahead checks implemented to verify array properties before running mutations
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

/**
 * Dispatches the complete order structural data payload transaction to Laravel
 */
export const placeOrderAPI = async (
  payload: PlaceOrderPayload,
): Promise<PlaceOrderResponse> => {
  const response = await api.post<PlaceOrderResponse>(
    "/store/checkout",
    payload,
  );
  return response.data;
};
