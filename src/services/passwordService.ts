import api from "./api";
import { phoneVerificationService } from "./phoneVerification";

export interface SetPasswordPayload {
  phone: string;
  password: string;
  password_confirmation: string;
  verification_token: string;
}

export const passwordService = {
  setPassword: async (data: SetPasswordPayload) => {
    const response = await api.post("/register/set-password", {
      phone: phoneVerificationService.formatPhone(data.phone),
      password: data.password,
      password_confirmation: data.password_confirmation,
      verification_token: data.verification_token,
    });
    return response.data;
  },
};
