import api, { BASE_URL } from "./api";

const STORAGE_URL = `${BASE_URL}/storage/`;

const normalizeImageUrl = (
  path: string | null,
  updatedAt?: string | number | null,
) => {
  if (!path) {
    return null;
  }

  const withCacheBust = (url: string) => {
    if (!updatedAt) {
      return url;
    }

    const separator = url.includes("?") ? "&" : "?";

    return `${url}${separator}v=${encodeURIComponent(String(updatedAt))}`;
  };

  if (path.startsWith("http")) {
    return withCacheBust(path);
  }

  const cleanPath = path.startsWith("/") ? path.substring(1) : path;

  return withCacheBust(`${STORAGE_URL}${cleanPath}`);
};

const normalizeFile = (file: any, fallbackName: string) => {
  if (!file?.uri || file.uri.startsWith("http")) {
    return null;
  }

  return {
    uri: file.uri,
    name: file.name || fallbackName,
    type: file.type || "image/jpeg",
  };
};

export const profileService = {
  /**
   * Get authenticated user profile.
   */
  getProfile: async () => {
    const response = await api.get("/profile");

    const rawData = response.data.data;

    const attrs = rawData.attributes || rawData || {};

    const cacheBust = attrs.updated_at ?? Date.now();

    return {
      id: rawData.id,

      ...attrs,

      is_seller: !!attrs.is_seller,

      avatar: normalizeImageUrl(attrs.avatar, cacheBust),

      front_valid_id_picture: normalizeImageUrl(
        attrs.front_valid_id_picture,
        cacheBust,
      ),

      back_valid_id_picture: normalizeImageUrl(
        attrs.back_valid_id_picture,
        cacheBust,
      ),
    };
  },

  /**
   * Update profile.
   */
  updateProfile: async (data: any) => {
    const formData = new FormData();

    const skipKeys = [
      "front_valid_id_picture",
      "back_valid_id_picture",
      "avatar",
      "id",
    ];

    Object.keys(data).forEach((key) => {
      if (skipKeys.includes(key)) {
        return;
      }

      const value = data[key];

      if (value !== null && value !== undefined && value !== "") {
        formData.append(key, String(value));
      }
    });

    const frontFile = normalizeFile(data.front_valid_id_picture, "front.jpg");

    if (frontFile) {
      // @ts-ignore
      formData.append("front_valid_id_picture", frontFile);
    }

    const backFile = normalizeFile(data.back_valid_id_picture, "back.jpg");

    if (backFile) {
      // @ts-ignore
      formData.append("back_valid_id_picture", backFile);
    }

    formData.append("_method", "PUT");

    try {
      const response = await api.post("/profile/update", formData, {
        headers: {
          Accept: "application/json",

          "Content-Type": "multipart/form-data",
        },

        transformRequest: (data) => data,
      });

      return response.data;
    } catch (error: any) {
      console.error("Profile update error:", error.response?.data || error);

      throw error;
    }
  },

  /**
   * Upload / replace avatar.
   */
  updateAvatar: async (
    fileData: any,
    onProgress?: (percent: number) => void,
  ) => {
    const formData = new FormData();

    const fileToUpload = normalizeFile(fileData, "avatar.jpg");

    if (!fileToUpload) {
      throw new Error("No new image selected");
    }

    // @ts-ignore
    formData.append("avatar", fileToUpload);

    const response = await api.post("/profile/avatar", formData, {
      headers: {
        Accept: "application/json",

        "Content-Type": "multipart/form-data",
      },

      transformRequest: (data) => data,

      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );

          onProgress(percent);
        }
      },
    });

    return response.data;
  },

  /**
   * Delete avatar.
   *
   * Backend sets the avatar field to NULL.
   */
  deleteAvatar: async () => {
    const response = await api.delete("/profile/avatar");

    return response.data;
  },

  /**
   * Change password.
   */
  changePassword: async (passwords: any) => {
    const response = await api.patch("/profile/change-password", passwords);

    return response.data;
  },

  /**
   * Get addresses.
   */
  getAddresses: async () => {
    const response = await api.get("/profile/addresses");

    return response.data.data || [];
  },

  /**
   * Add address.
   */
  addAddress: async (addressData: any) => {
    const response = await api.post("/profile/address", addressData);

    return response.data;
  },

  /**
   * Update address.
   */
  updateAddress: async (id: number, addressData: any) => {
    const response = await api.put(`/profile/address/${id}`, addressData);

    return response.data;
  },

  /**
   * Delete address.
   */
  deleteAddress: async (id: number) => {
    const response = await api.delete(`/profile/address/${id}`);

    return response.data;
  },

  /**
   * Get authentication devices.
   */
  getAuthDevices: async () => {
    const response = await api.get("/profile/auth-devices");

    return response.data.data || [];
  },

  /**
   * Register authentication device.
   */
  registerAuthDevice: async (data: {
    device_id: string;
    platform: "android" | "ios";
    public_key: string;
    device_name?: string;
    password: string;
  }) => {
    const response = await api.post("/profile/auth-devices", data);

    return response.data;
  },

  /**
   * Disable authentication device.
   */
  disableAuthDevice: async (id: number) => {
    const response = await api.patch(`/profile/auth-devices/${id}/disable`);

    return response.data;
  },

  /**
   * Remove authentication device.
   */
  removeAuthDevice: async (id: number, password: string) => {
    const response = await api.delete(`/profile/auth-devices/${id}`, {
      data: { password },
    });

    return response.data;
  },
};
