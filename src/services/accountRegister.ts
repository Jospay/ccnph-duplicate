import api from "./api";

export interface RegisterPayload {
  name: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  phone: string;
  cooperative_id: number;
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
