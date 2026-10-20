import api from "./api";
import type { PaymentBreakdown } from "./checkout";

// --- EXISTING INTERFACES ---
export interface OrderItem {
  id: number;
  product_id: number | null;
  product_name: string;
  product_image: string | null;
  variant_name: string | null;
  price: number;
  quantity: number;
  cooperative_id?: number | null;
  cooperative_scope?: "local" | "national" | null;
}

export interface OrderTracking {
  created_at: string | null;
  confirmed_at: string | null;
  processing_at: string | null;
  packed_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  return_requested_at?: string | null;
  return_approved_at?: string | null;
  returned_at: string | null;
}

export interface OrderListItem {
  id: number;
  order_number: string;
  store_name: string;
  status:
    | "to-pay"
    | "to-ship"
    | "shipped"
    | "to-receive"
    | "completed"
    | "delivered"
    | "cancelled"
    | "return_requested"
    | "return_approved"
    | "returned";
  raw_status: string;
  status_label: string;
  shipping_fee: number;
  total: number;
  items: OrderItem[];
  tracking: OrderTracking;
  created_at: string;
  is_rated: boolean;
}

// payment method used for an order (null for very old orders with no payment row)
export interface OrderPayment {
  method_id: number;
  method: string;
  is_online: boolean;
  is_cod: boolean;
  is_points: boolean;
  status: "paid" | "pending";
  // "Paid" | "Pay on delivery" | "Pending"
  status_label: string;
  paid_at: string | null;
}

export interface SingleOrder {
  id: number;
  order_number: string;
  status: string;
  raw_status?: string;
  status_label?: string;
  shipping_fee: number;
  total: number;
  created_at: string;
  store: { id: number; name: string };
  note?: string | null;
  // payment method + price breakdown (same shape as the checkout payment screen)
  payment: OrderPayment | null;
  breakdown: PaymentBreakdown;
  items: OrderItem[];
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  tracking: OrderTracking;
  confirmed_at?: string | null;
  processing_at?: string | null;
  packed_at?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  return_requested_at?: string | null;
  return_approved_at?: string | null;
  returned_at?: string | null;
}

export interface SingleOrderResponse {
  success: boolean;
  data: {
    order: SingleOrder;
  };
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  has_more: boolean;
}

export interface OrderBadges {
  to_pay: number;
  to_ship: number;
  to_receive: number;
  to_rate: number;
}

export interface OrderIndexResponse {
  success: boolean;
  data: {
    user: {
      name: string;
      phone: string | null;
      avatar: string | null;
    };
    orders: OrderListItem[];
    pagination: PaginationMeta;
    filters: {
      status: string;
    };
    badges: OrderBadges;
  };
}

// --- RATING INTERFACES ---
export interface MediaFile {
  uri: string;
  name: string;
  type: string;
}

export interface ReviewData {
  id: number;
  rating: number;
  comment: string | null;
  video_url: string | null;
  is_anonymous: boolean;
  images: string[];
  created_at: string;
}

export interface RateItem {
  id: number;
  order_id: number;
  product_id?: number | null;
  product_name: string;
  product_image: string | null;
  variant_name: string | null;
  cooperative_id?: number | null;
  cooperative_scope?: "local" | "national" | null;
  review?: ReviewData | null;
}

export interface ProductRatingPayload {
  order_item_id: number;
  rating: number;
  comment: string;
  is_anonymous: boolean;
  video?: MediaFile | null;
  images: MediaFile[];
}

export interface FetchRateDataResponse {
  success: boolean;
  message?: string;
  data?: {
    user: { name: string; phone: string | null; avatar: string | null };
    order: {
      id: number;
      store: { id: number; name: string };
      items: RateItem[];
    };
  };
}

// --- API METHODS ---
export const fetchOrdersAPI = async (
  status: string,
  page: number = 1,
): Promise<OrderIndexResponse> => {
  const response = await api.get<OrderIndexResponse>("/store/orders", {
    params: { status, page },
  });
  return response.data;
};

export const fetchSingleOrderAPI = async (
  orderId: number | string,
): Promise<SingleOrderResponse> => {
  const response = await api.get<SingleOrderResponse>(
    `/store/orders/${orderId}`,
  );
  return response.data;
};

export const fetchOrderBadgesAPI = async (): Promise<OrderBadges> => {
  const response = await api.get<OrderIndexResponse>("/store/orders", {
    params: { status: "all", page: 1 },
  });
  return response.data.data.badges;
};

export const updateOrderStatusAPI = async (
  orderId: number,
  status:
    | "cancelled"
    | "delivered"
    | "completed"
    | "return_requested"
    | "return_approved"
    | "returned",
  extra?: { cancellation_reason?: string },
) => {
  const response = await api.post(`/store/orders/${orderId}/status`, {
    status,
    ...extra,
  });
  return response.data;
};

// Fetch order structure for rating UI
export const fetchOrderForRatingAPI = async (
  orderId: number | string,
): Promise<FetchRateDataResponse> => {
  try {
    const response = await api.get<FetchRateDataResponse>(
      `/store/orders/${orderId}/rate`,
    );
    return response.data;
  } catch (error: any) {
    if (error?.response?.data) {
      return error.response.data;
    }
    throw error;
  }
};

// Submit rating multipart Form Data
// onUploadProgress receives a 0-100 percentage so the UI can show upload progress.
export const submitOrderRatingAPI = async (
  orderId: number | string,
  ratings: ProductRatingPayload[],
  onUploadProgress?: (percent: number) => void,
) => {
  const formData = new FormData();

  ratings.forEach((item, index) => {
    formData.append(
      `items[${index}][order_item_id]`,
      String(item.order_item_id),
    );
    formData.append(`items[${index}][rating]`, String(item.rating));

    if (item.comment) {
      formData.append(`items[${index}][comment]`, item.comment);
    }

    formData.append(
      `items[${index}][is_anonymous]`,
      item.is_anonymous ? "1" : "0",
    );

    if (item.video) {
      formData.append(`items[${index}][video]`, {
        uri: item.video.uri,
        name: item.video.name || `video_${Date.now()}.mp4`,
        type: item.video.type || "video/mp4",
      } as any);
    }

    if (item.images && item.images.length > 0) {
      item.images.forEach((img, imgIdx) => {
        formData.append(`items[${index}][images][${imgIdx}]`, {
          uri: img.uri,
          name: img.name || `image_${Date.now()}_${imgIdx}.jpg`,
          type: img.type || "image/jpeg",
        } as any);
      });
    }
  });

  const response = await api.post(`/store/orders/${orderId}/rate`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    // Uploads with media can take longer than a normal request
    timeout: 180000,
    onUploadProgress: (event) => {
      if (onUploadProgress && event.total) {
        onUploadProgress(Math.round((event.loaded * 100) / event.total));
      }
    },
  });

  return response.data;
};
