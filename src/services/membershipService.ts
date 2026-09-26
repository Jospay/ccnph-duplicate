import api from "./api";

export const getMembershipSettings = async () => {
  const res = await api.get("/memberships/settings");
  return res.data;
};

export const applyMembership = async (payload: { term_months: number }) => {
  const res = await api.post("/memberships/apply", payload);
  return res.data;
};

export const getMembership = async (params?: any) => {
  const res = await api.get("/memberships", { params });
  return res.data;
};

export const payMembership = async (
  scheduleId: string,
  payload: {
    payment_method_id: number | string;
    amount: number;
    gateway: string;
  },
) => {
  return await api.post(`/memberships/schedules/${scheduleId}/pay`, payload);
};

export const getPaymentMethods = async () => {
  const res = await api.get("/payment-methods");
  return res.data;
};

export const checkMembershipPaymentStatus = async (paymentIntentId: string) => {
  const res = await api.get(`/payment/status/${paymentIntentId}`);
  return res.data;
};

export interface PaymentMethod {
  id: number;
  name: string;
  gateway_type: string;
}

/////////////// Membership config (dynamic fee — no minimum) ///////////////////
export interface MembershipFee {
  type: "PHP" | "Percentage";
  fee: number;
}

export interface MembershipConfig {
  fee: MembershipFee;
}

export const getMembershipConfig = async (): Promise<{
  data: MembershipConfig;
}> => {
  const res = await api.get("/memberships/config");
  return res.data;
};

// Mirrors calculateLoadFee — computes the fee for a given installment amount
export const calculateMembershipFee = (
  amount: number,
  fee: MembershipFee,
): number => {
  if (!amount) return 0;

  const raw = fee.type === "Percentage" ? amount * (fee.fee / 100) : fee.fee;

  return Math.round(raw * 100) / 100;
};
