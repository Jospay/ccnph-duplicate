import api from "./api";

export const reactivationService = {
  /**
   * Explicitly trigger sending the reactivation OTP.
   * Only call this after the user confirms (taps "Okay").
   */
  send: async (payload: { phone: string; password: string }) => {
    try {
      const response = await api.post("/account/reactivate/send", payload);
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.data) {
        throw error.response.data;
      }
      throw { message: "Network error. Please check your connection." };
    }
  },

  verify: async (payload: { phone: string; otp_code: string }) => {
    try {
      const response = await api.post("/account/reactivate/verify", payload);
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.data) {
        throw error.response.data;
      }
      throw { message: "Network error. Please check your connection." };
    }
  },

  resend: async (payload: { phone: string }) => {
    try {
      const response = await api.post("/account/reactivate/resend", payload);
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.data) {
        throw error.response.data;
      }
      throw { message: "Network error. Please check your connection." };
    }
  },
};
