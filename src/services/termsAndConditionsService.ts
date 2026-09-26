import api from "./api";

export interface TermsAndCondition {
  id: number;
  name: string;
  content: string;
}

export const termsAndConditionsService = {
  getTermsAndConditions: async (): Promise<TermsAndCondition> => {
    const response = await api.get("/terms-and-conditions-ccnph");

    return response.data;
  },
};
