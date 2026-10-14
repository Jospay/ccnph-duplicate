import api from "./api";

export interface PointResponse {
  data: {
    id: number;
    balance: string;
    show: boolean;
    updated_at: string;
    is_tampered?: boolean;
    message?: string | null;
  };
}

export interface PointTransaction {
  id: number;
  amount: string;
  transfer_fee: string;
  type: string;
  from_name: string | null;
  from_account_number: string | null;
  to_account_name: string | null;
  to_account_number: string | null;
  to_provider: string | null;
  description: string | null;
  reference_id: number | null;
  reference_type: string | null;
  reference_number: string | null;
  created_at: string;
}

/////////////// Load config (dynamic min + fee) ///////////////////
export interface PointLoadFee {
  type: "PHP" | "Percentage";
  fee: number;
}

export interface PointConfig {
  min_load: number;
  fee: PointLoadFee;
}

export interface PointLoadPayload {
  amount: number; // cents
  payment_method_id: number;
  gateway_payment_method_id?: string | null;
}

export interface PointLoadResponse {
  success: boolean;
  message: string;
  data: PointResponse["data"];
  payment?: {
    id: number;
    fee: number; // cents
    gateway_payment_intent_id: string;
  };
  next_action: {
    type: string;
    redirect_url?: string;
    url?: string;
    qr_code_url?: string;
    qr_url?: string;
  } | null;
}

export const getPointBalance = async (): Promise<PointResponse> => {
  const res = await api.get("/store/points");
  return res.data;
};

export const updatePointVisibility = async (): Promise<PointResponse> => {
  const res = await api.post("/store/points/visibility");
  return res.data;
};

export const getPointTransactions = async (): Promise<PointTransaction[]> => {
  const res = await api.get("/store/points/transactions");
  return res.data.data;
};

export const getPointConfig = async (): Promise<{ data: PointConfig }> => {
  const res = await api.get("/store/points/config");
  return res.data;
};

export const calculatePointFee = (
  amount: number,
  fee: PointLoadFee,
): number => {
  if (!amount) return 0;

  const raw = fee.type === "Percentage" ? amount * (fee.fee / 100) : fee.fee;

  return Math.round(raw * 100) / 100;
};

export const loadPoints = async (
  payload: PointLoadPayload,
): Promise<PointLoadResponse> => {
  const res = await api.post("/store/points/load", payload);
  return res.data;
};

// Reused from the wallet flow — same gateway endpoints
export { checkPaymentStatus, getPaymentMethods } from "./walletService";
export type { PaymentMethod } from "./walletService";
