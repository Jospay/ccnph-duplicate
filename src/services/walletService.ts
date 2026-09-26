import api from "./api";

export interface WalletResponse {
  data: {
    id: number;
    balance: string;
    show: boolean;
    updated_at: string;
    is_tampered?: boolean;
    message?: string | null;
  };
}

export interface WalletTransaction {
  id: number;
  wallet_id: number | string | null;
  amount: string;
  transfer_fee: string;
  type: string;
  from_name: string | null;
  to_account_name: string | null;
  to_account_number: string | null;
  to_provider: string | null;
  description: string | null;
  reference_id: number | null;
  reference_type: string | null;
  reference_number: string | null;
  created_at: string;
}

export interface WalletPreset {
  amount: number;
  amount_display: string;
}

export interface RechargePayload {
  amount: number;
  payment_method_id: number;
  gateway_payment_method_id?: string | null;
}

export interface RechargeResponse {
  success: boolean;
  message: string;
  data: WalletResponse["data"];
  next_action: {
    type: string;
    redirect_url?: string;
    url?: string;
    qr_code_url?: string;
    qr_url?: string;
  } | null;
}

export const getWalletBalance = async (): Promise<WalletResponse> => {
  const res = await api.get("/wallet");
  return res.data;
};

export const updateWalletVisibility = async (): Promise<WalletResponse> => {
  const res = await api.get("/wallet/update");
  return res.data;
};

export const getWalletTransactions = async (): Promise<WalletTransaction[]> => {
  const res = await api.get("/wallet/transaction");
  return res.data.data;
};

// Fetch dynamic preset shortcuts from the server
export const getWalletPresets = async (): Promise<{ data: WalletPreset[] }> => {
  const res = await api.get("/wallet/presets");
  return res.data;
};

/////////////// Load Wallet config (dynamic min + fee) ///////////////////
export interface LoadFee {
  type: "PHP" | "Percentage";
  fee: number;
}

export interface LoadConfig {
  min_recharge: number;
  fee: LoadFee;
}

export const getLoadConfig = async (): Promise<{ data: LoadConfig }> => {
  const res = await api.get("/wallet/load/config");
  return res.data;
};

// Mirrors calculateTransferFee — computes the fee for a given net load amount
export const calculateLoadFee = (amount: number, fee: LoadFee): number => {
  if (!amount) return 0;

  const raw = fee.type === "Percentage" ? amount * (fee.fee / 100) : fee.fee;

  return Math.round(raw * 100) / 100;
};

// Send recharge parameters to the server
export const rechargeWallet = async (
  payload: RechargePayload,
): Promise<RechargeResponse> => {
  const res = await api.post("/wallet/recharge", payload);
  return res.data;
};

export const getPaymentMethods = async () => {
  const res = await api.get("/payment-methods");
  return res.data;
};

export const checkPaymentStatus = async (paymentIntentId: string) => {
  const res = await api.get(`/payment/status/${paymentIntentId}`);
  return res.data;
};

export interface PaymentMethod {
  id: number;
  name: string;
  gateway_type: string;
}

/////////////// Transfer ///////////////////
export interface TransferPayload {
  channel_id: string;
  amount: number;
  account_name: string;
  account_number: string;
  destination_bic?: string;
  purpose?: string;
  remarks?: string;
  verification_method: "password" | "biometric";
  password?: string;
  device_id?: string;
}

export interface TransferResource {
  id: number;
  reference_number: string;
  status: string;
  channel: string;
  destination_account_name: string;
  destination_account_number: string;
  amount: string;
  fee: string;
  total_deducted: string;
  created_at: string;
}

export interface TransferResponse {
  success: boolean;
  message: string;
  data: TransferResource;
  wallet: WalletResponse;
}

export const createTransfer = async (
  payload: TransferPayload,
): Promise<TransferResponse> => {
  const res = await api.post("/wallet/transfer", payload);
  return res.data;
};

export const getTransferStatus = async (
  reference: string,
): Promise<{ data: TransferResource }> => {
  const res = await api.get(`/wallet/transfer/${reference}`);
  return res.data;
};

// transfer config for dynamic channel/transfer fee/minimum transfer
export interface TransferChannel {
  id: string;
  name: string;
  category: string;
}

export interface TransferConfig {
  min_transfer: number;
  fee: {
    type: "PHP" | "Percentage";
    transfer_fee: number;
  };
  channels: TransferChannel[];
}

export const getTransferConfig = async (): Promise<{
  data: TransferConfig;
}> => {
  const res = await api.get("/wallet/transfer/config");
  return res.data;
};

// TransactionFee calculate
export const calculateTransferFee = (
  amount: number,
  fee: TransferConfig["fee"],
): number => {
  if (!amount) return 0;

  const raw =
    fee.type === "Percentage"
      ? amount * (fee.transfer_fee / 100)
      : fee.transfer_fee;

  return Math.round(raw * 100) / 100;
};
