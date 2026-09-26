import api from "./api";

export interface ForgotPasswordPayload {
  phone: string;
}

export interface VerifyOtpPayload {
  phone: string;
  otp_code: string;
}

export interface ResetPasswordPayload {
  phone: string;
  verification_token: string;
  password: string;
  password_confirmation: string;
}

export const authService = {
  sendForgotOtp: async (payload: ForgotPasswordPayload) => {
    try {
      console.log("SEND OTP REQUEST:", payload);

      const response = await api.post("/password/forgot", payload);

      console.log("SEND OTP RESPONSE:", response.data);

      return response.data;
    } catch (error: any) {
      console.log("SEND OTP FAILED:", error?.response?.data || error);

      throw error;
    }
  },

  verifyForgotOtp: async (payload: VerifyOtpPayload) => {
    try {
      console.log("VERIFY OTP REQUEST:", payload);

      const response = await api.post("/password/verify-otp", payload);

      console.log("VERIFY OTP RESPONSE:", response.data);

      return response.data;
    } catch (error: any) {
      console.log("VERIFY OTP FAILED:", error?.response?.data || error);

      throw error;
    }
  },

  resetPassword: async (payload: ResetPasswordPayload) => {
    try {
      console.log("RESET PASSWORD REQUEST:", {
        ...payload,
        verification_token: "***hidden***",
      });

      const response = await api.post("/password/reset", payload);

      console.log("RESET PASSWORD RESPONSE:", response.data);

      return response.data;
    } catch (error: any) {
      console.log("RESET PASSWORD FAILED:", error?.response?.data || error);

      throw error;
    }
  },

  resendForgotOtp: async (payload: ForgotPasswordPayload) => {
    try {
      console.log("RESEND OTP REQUEST:", payload);

      const response = await api.post("/password/resend-otp", payload);

      console.log("RESEND OTP RESPONSE:", response.data);

      return response.data;
    } catch (error: any) {
      console.log("RESEND OTP FAILED:", error?.response?.data || error);

      throw error;
    }
  },
};
