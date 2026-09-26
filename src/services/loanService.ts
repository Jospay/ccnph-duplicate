import {
  ComputeLoanRequest,
  ComputeLoanResponse,
  LoanIndexResponse,
  PayLoanRequest,
} from "@/types/loan.types";
import api from "./api";

export const getLoans = async (): Promise<LoanIndexResponse> => {
  const res = await api.get("/loans");
  return res.data;
};

export const getLoan = async (id: string | number, params?: any) => {
  const res = await api.get(`/loans/${id}`, { params });
  return res.data;
};

export const getLoanableAmount = async (): Promise<string> => {
  const res = await api.get("/loans/loanable-amount");
  return res.data?.data?.loanable_amount;
};

export const createLoan = async (payload: {
  amount: number;
  term: number;
  start_date: string;
  agree_terms: boolean;
}) => {
  const res = await api.post("/loans", payload);
  return res.data;
};

export const computeLoan = async (
  payload: ComputeLoanRequest,
): Promise<ComputeLoanResponse> => {
  const res = await api.get("/loans/compute", { params: payload });
  return res.data?.data;
};

export const payLoan = async (loanId: string, payload: PayLoanRequest) => {
  return await api.post(`/loans/${loanId}/pay`, payload);
};

// export const checkPaymentStatus = async (paymentIntentId: string) => {
//   const res = await api.get(`/payment/status/${paymentIntentId}`);
//   return res.data;
// };

export interface PaymentMethod {
  id: number | string;
  name: string;
  gateway_type: string;
}

export const getPaymentMethods = async () => {
  const res = await api.get("/payment-methods");
  return res.data;
};

// shared capital
export interface ShareCapitalSettings {
  required_amount: string;
  allowed_term_months: number[];
}

export const getShareCapitalSettings = async () => {
  const res = await api.get("/share-capital/settings");
  return res.data?.data;
};

export const getShareCapital = async (params?: any) => {
  const res = await api.get("/share-capital", { params });
  return res.data;
};

export const applyShareCapital = async (payload: { term_months: number }) => {
  const res = await api.post("/share-capital/apply", payload);
  return res.data;
};

export const payShareCapital = async (
  scheduleId: number | string,
  payload: { payment_method_id: number | string },
) => {
  if (!scheduleId) {
    throw new Error("Missing scheduleId");
  }

  const res = await api.post(
    `/share-capital/schedules/${scheduleId}/pay`,
    payload,
  );

  return res.data;
};

export const checkPaymentStatus = async (paymentIntentId: string) => {
  const res = await api.get(`/payment/status/${paymentIntentId}`);
  return res.data;
};
