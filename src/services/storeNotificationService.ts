import api from "./api";

export interface StoreNotificationItem {
  id: string;
  type: string;
  title: string;
  description: string;
  actionType: string;
  route?: string | null;
  extraData?: Record<string, any>;
  timestamp: string;
  isRead: boolean;
}

export interface StoreNotificationsResponse {
  notifications: StoreNotificationItem[];
  unreadCount: number;
}

export const getStoreNotifications =
  async (): Promise<StoreNotificationsResponse> => {
    const res = await api.get("/store-notifications");
    return {
      notifications: res.data.data ?? [],
      unreadCount: res.data.unread_count ?? 0,
    };
  };

export const markStoreNotificationAsRead = async (
  id: string,
): Promise<void> => {
  await api.patch(`/store-notifications/${id}/read`);
};

export const markAllStoreNotificationsAsRead = async (): Promise<void> => {
  await api.post("/store-notifications/read-all");
};
