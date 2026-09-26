import api from "./api";

export interface VerifyPayload {
  phone: string;
  otp_code: string;
}

export interface ResendPayload {
  phone: string;
}

export interface VerificationResponse {
  message: string;
  verification_token?: string;
  status?: string;
  phone?: string;
}

export const phoneVerificationService = {
  formatPhone: (phone: string) => {
    if (!phone) return "";

    // Remove all non-numeric characters (like + or spaces)
    let cleaned = phone.replace(/\D/g, "");

    // If starts with 09 (e.g., 0917...), replace 0 with 63
    if (cleaned.startsWith("0")) {
      return `63${cleaned.substring(1)}`;
    }

    // If it starts with 9 (e.g., 917...), prepend 63
    if (cleaned.startsWith("9") && cleaned.length === 10) {
      return `63${cleaned}`;
    }

    return cleaned;
  },

  verify: async (data: VerifyPayload): Promise<VerificationResponse> => {
    try {
      const response = await api.post("/verify-phone/acknowledge", {
        phone: phoneVerificationService.formatPhone(data.phone),
        otp_code: data.otp_code,
      });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  resend: async (data: ResendPayload): Promise<VerificationResponse> => {
    try {
      const response = await api.post("/verify-phone/resend", {
        phone: phoneVerificationService.formatPhone(data.phone),
      });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },
};
