import api from "./api";

export const createFundingInvestmentRequest = async (formData: FormData) => {
  const response = await api.post("/funding-invest-requests", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};
