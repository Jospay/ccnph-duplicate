import api from "./api"; // The red line should disappear now

export interface RegisterPayload {
  name: string;
  phone: string;
}

export const accountRegisterService = {
  register: async (payload: RegisterPayload) => {
    try {
      const { data } = await api.post("/register", payload);
      return data;
    } catch (error: any) {
      if (error.response && error.response.data) {
        throw error.response.data;
      }
      throw new Error("Network error. Please try again.");
    }
  },
};
