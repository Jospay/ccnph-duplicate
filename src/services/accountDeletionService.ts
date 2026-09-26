import api from "./api";

export interface DeletionResponse {
  message: string;
  status?: string;
  phone?: string;
  retry_after?: number;
}

export interface DeletionVerificationResponse {
  message: string;
  deletion_token?: string;
  status?: string;
}

export const accountDeletionService = {
  requestDeletion: async (): Promise<DeletionResponse> => {
    try {
      const { data } = await api.post("/profile/request-deletion");
      return data;
    } catch (error: any) {
      if (error.response?.data) throw error.response.data;
      throw new Error("Network error. Please try again.");
    }
  },

  verifyDeletion: async (
    otpCode: string,
  ): Promise<DeletionVerificationResponse> => {
    try {
      const { data } = await api.post("/profile/verify-deletion", {
        otp_code: otpCode,
      });
      return data;
    } catch (error: any) {
      if (error.response?.data) throw error.response.data;
      throw new Error("Network error. Please try again.");
    }
  },

  resendDeletionOtp: async (): Promise<DeletionResponse> => {
    try {
      const { data } = await api.post("/profile/resend-deletion-otp");
      return data;
    } catch (error: any) {
      if (error.response?.data) throw error.response.data;
      throw new Error("Network error. Please try again.");
    }
  },

  completeDeletion: async (
    deletionToken: string,
  ): Promise<DeletionResponse> => {
    try {
      const { data } = await api.post("/profile/complete-deletion", {
        deletion_token: deletionToken,
      });
      return data;
    } catch (error: any) {
      if (error.response?.data) throw error.response.data;
      throw new Error("Network error. Please try again.");
    }
  },
};
