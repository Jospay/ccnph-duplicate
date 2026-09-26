import api from "./api";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  description: string;
  actionType: string;
  route?: string;
  extraData?: Record<string, any>;
  timestamp: string;
  isRead: boolean;
}

export interface NotificationsResponse {
  notifications: NotificationItem[];
  unreadCount: number;
}

export const getNotifications = async (): Promise<NotificationsResponse> => {
  const res = await api.get("/notifications");
  return {
    notifications: res.data.data,
    unreadCount: res.data.unread_count ?? 0,
  };
};

export const markNotificationAsRead = async (id: string): Promise<void> => {
  await api.patch(`/notifications/${id}/read`);
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
  await api.post("/notifications/read-all");
};
