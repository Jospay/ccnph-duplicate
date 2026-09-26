// @/services/chatService.ts
import api from "./api";

export interface MessageAttachment {
  id: number | string;
  path: string;
  original_name: string;
  mime_type: string;
  size: number;
}

export interface Message {
  id: number | string;
  conversation_id: number;
  sender_id: number;
  body: string | null;
  created_at: string;
  sender?: {
    id: number;
    name: string;
    email: string;
  };
  attachments?: MessageAttachment[];
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

export interface ConversationData {
  conversation: {
    id: number;
    status: string;
    participants: Participant[];
  };
  messages: Message[];
  pagination: {
    current_page: number;
    last_page: number;
    has_more: boolean;
  };
}

/**
 * Fetch a conversation by its ID with pagination support
 * @param conversationId - The conversation ID
 * @param page - Page number (1 = newest messages, 2+ = older messages)
 * @returns Paginated conversation data
 *
 * IMPORTANT: Backend returns oldest-first, but we reverse for inverted FlatList
 * where index 0 is at bottom (newest) and last index is at top (oldest)
 */
export const getConversation = async (
  conversationId: string | number,
  page: number = 1,
): Promise<ConversationData> => {
  const res = await api.get(`/conversations/${conversationId}`, {
    params: { page },
  });

  const data = res.data as ConversationData;

  // CRITICAL: Reverse messages because backend returns oldest-first
  // For inverted FlatList, we need newest-first: [newest, ..., oldest]
  if (data.messages && Array.isArray(data.messages)) {
    data.messages.reverse();
  }

  return data;
};

/**
 * Send a new message to an active conversation
 */
export const sendMessage = async (
  conversationId: string | number,
  payload: FormData | { body: string },
): Promise<Message> => {
  const isFormData = payload instanceof FormData;
  const res = await api.post(
    `/conversations/${conversationId}/messages`,
    payload,
    {
      headers: {
        "Content-Type": isFormData ? "multipart/form-data" : "application/json",
      },
    },
  );
  return res.data;
};

/**
 * Mark all messages inside the conversation as read
 */
// export const markConversationAsRead = async (
//   conversationId: string | number,
// ): Promise<{ status: string }> => {
//   const res = await api.post(`/conversations/${conversationId}/read`);
//   return res.data;
// };

/**
 * Mark active support conversation as read
 */
export const markConversationAsRead = async (
  conversationId?: string | number,
): Promise<{ status: string }> => {
  const endpoint = conversationId
    ? `/conversations/${conversationId}/read`
    : `/support-chat/read`;

  const res = await api.post(endpoint);
  return res.data;
};

// Chat Support
export interface SupportChatResponse {
  exists: boolean;
  conversation?: {
    id: number;
    status: string;
    participants: Participant[];
  };
  messages?: Message[];
  pagination?: {
    current_page: number;
    last_page: number;
    has_more: boolean;
  };
  unread_count?: number;
}

/**
 * Check whether the user already has an open support conversation.
 */
export const getSupportConversation =
  async (): Promise<SupportChatResponse> => {
    const res = await api.get(`/support-chat`);
    const data = res.data as SupportChatResponse;

    if (data.messages && Array.isArray(data.messages)) {
      data.messages.reverse();
    }

    return data;
  };

/**
 * Start a brand new support conversation.
 */
export const startSupportConversation =
  async (): Promise<SupportChatResponse> => {
    const res = await api.post(`/support-chat`);
    return res.data;
  };
