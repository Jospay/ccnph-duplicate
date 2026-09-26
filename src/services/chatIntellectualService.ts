import api from "./api";

export interface MessageAttributes {
  body: string;
  sender_type: "user" | "agent" | string;
  sender_id: number;
  created_at: string;
}

export interface MessageData {
  id: string;
  type: string;
  attributes: MessageAttributes;
}

/**
 * Fetch all messages for a given conversation thread.
 * Fits JSON:API specification collections.
 */
export const getConversationMessages = async (
  conversationId: string | number,
) => {
  const res = await api.get(`/conversations/${conversationId}/messages`);
  return {
    data: res.data?.data || [],
  };
};

/**
 * Send a plain-text chat message payload to an active support channel thread.
 */
export const sendMessageToConversation = async (
  conversationId: string | number,
  body: string,
) => {
  const res = await api.get("/user");
  const currentUserId = res.data?.id;

  const payload = {
    body,
  };

  const response = await api.post(
    `/conversations/${conversationId}/messages`,
    payload,
  );

  return {
    data: response.data?.data,
    currentUserId,
  };
};
