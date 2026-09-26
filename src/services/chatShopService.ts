import api from "./api";

export interface ShopMessageAttachment {
  id: number | string;
  path: string;
  original_name: string;
  mime_type: string;
  size?: number;
}

export interface Message {
  id: number | string;
  shop_conversation_id: number;
  sender_id: number;
  sender_type: "shop" | "user";
  body: string | null;
  context_type: string | null;
  context_id: number | null;
  attachments?: ShopMessageAttachment[];
  created_at: string;
  updated_at: string;
}

export interface Participant {
  id: number | string;
  user_id: number;
  role: string;
  user?: {
    id: number;
    name: string;
  };
}

export interface ShopConversation {
  id: number;
  shop_id: number;
  user_id: number;
  pinnable_type: string | null;
  pinnable_id: number | null;
  last_message_at: string | null;
  shop_read_at: string | null;
  user_read_at: string | null;
  unread_count?: number;
  created_at: string;
  updated_at: string;
  shop?: {
    id: number;
    name: string;
    slug?: string;
    logo?: string | null;
  };
  user?: {
    id: number;
    name: string;
  };
  pinnable?: any;
  messages?: Message[];
  latest_message?: Message;
}

export interface ShopConversationData {
  conversation: ShopConversation;
  messages: Message[];
  pagination: {
    current_page: number;
    last_page: number;
    has_more: boolean;
  };
}

/**
 * Fetch all conversations for the authenticated buyer/seller.
 * Backend returns paginated structure: res.data.data contains the list.
 */
export const getShopConversations = async (): Promise<ShopConversation[]> => {
  const res = await api.get("/shop-conversations");
  return res.data.data ?? res.data ?? [];
};

/**
 * Find an existing conversation with a given shop from an already-fetched list.
 */
export const findConversationByShop = (
  conversations: ShopConversation[],
  shopId: number | string,
): ShopConversation | undefined => {
  return conversations.find((c) => String(c.shop_id) === String(shopId));
};

/**
 * Start a conversation between a buyer and a shop/seller.
 */
export const startShopConversation = async (payload: {
  shop_id: number | string;
  body: string;
  order_id?: number | string;
  product_id?: number | string;
  attachments?: { uri: string; name: string; type: string }[];
}): Promise<ShopConversation> => {
  const hasFiles = payload.attachments && payload.attachments.length > 0;

  if (hasFiles) {
    const form = new FormData();
    form.append("shop_id", String(payload.shop_id));
    form.append("body", payload.body);
    if (payload.product_id)
      form.append("product_id", String(payload.product_id));
    if (payload.order_id) form.append("order_id", String(payload.order_id));
    payload.attachments!.forEach((file) => {
      form.append("attachments[]", {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as any);
    });

    const res = await api.post("/shop-conversations/start", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.conversation ?? res.data;
  }

  const res = await api.post("/shop-conversations/start", {
    shop_id: payload.shop_id,
    body: payload.body,
    product_id: payload.product_id,
    order_id: payload.order_id,
  });
  return res.data.conversation ?? res.data;
};

/**
 * Fetch a single shop conversation with paginated messages.
 */
export const getShopConversation = async (
  conversationId: string | number,
  page: number = 1,
): Promise<ShopConversationData> => {
  const res = await api.get(`/shop-conversations/${conversationId}`, {
    params: { page },
  });

  const data = res.data as ShopConversationData;

  if (data.messages && Array.isArray(data.messages)) {
    data.messages.reverse();
  }

  return data;
};

/**
 * Send a message within an EXISTING shop conversation.
 */
export const sendShopMessage = async (
  conversationId: string | number,
  payload:
    | { body: string }
    | {
        body?: string;
        attachments: { uri: string; name: string; type: string }[];
      },
): Promise<Message> => {
  const hasAttachments =
    "attachments" in payload && payload.attachments?.length;

  if (hasAttachments) {
    const form = new FormData();
    if (payload.body) form.append("body", payload.body);
    (payload as any).attachments.forEach((file: any) => {
      form.append("attachments[]", {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as any);
    });

    const res = await api.post(
      `/shop-conversations/${conversationId}/messages`,
      form,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return res.data;
  }

  const res = await api.post(`/shop-conversations/${conversationId}/messages`, {
    body: (payload as any).body,
  });
  return res.data;
};

/**
 * Mark all messages in the shop conversation as read.
 */
export const markShopConversationAsRead = async (
  conversationId: string | number,
): Promise<{ status: string }> => {
  const res = await api.post(`/shop-conversations/${conversationId}/read`);
  return res.data;
};
