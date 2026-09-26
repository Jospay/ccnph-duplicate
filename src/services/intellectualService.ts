import api from "./api";

/**
 * Checks if the application is in a state where the user can still modify it.
 */
export const isEditable = (resource: any): boolean => {
  if (!resource || !resource.attributes) return false;

  const status = resource.attributes.status?.toLowerCase();

  return ["pending", "rejected"].includes(status);
};

export const getIntellectualProperties = async (params?: any) => {
  const res = await api.get("/intellectual-properties", { params });

  return res.data;
};

export const getIntellectualProperty = async (id: number | string) => {
  const res = await api.get(
    `/intellectual-properties/${id}?include=claims,documents,schedules,status,settings,payments,conversation`,
  );

  return {
    data: res.data?.data,
    included: res.data?.included || [],
  };
};

export const createIntellectualProperty = async (payload: FormData) => {
  const res = await api.post("/intellectual-properties", payload, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
};

export const updateIntellectualProperty = async (
  id: number | string,
  payload: FormData,
) => {
  const res = await api.post(
    `/intellectual-properties/${id}?_method=PUT`,
    payload,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return res.data;
};

export const getIntellectualSettings = async (id: number | string) => {
  const res = await api.get(`/intellectual-properties/${id}/settings`);

  return res.data;
};

/**
 * APPLY PAYMENT
 * THIS CREATES THE SCHEDULES
 */
export const applyIntellectualPayment = async (
  id: number | string,
  payload: { term_months: number },
) => {
  try {
    const res = await api.post(
      `/intellectual-properties/${id}/apply/payment`,
      payload,
    );

    return res.data;
  } catch (error: any) {
    if (error?.response?.status === 409) {
      return {
        conflict: true,
        message: "Schedules already exist",
      };
    }

    throw error;
  }
};

/**
 * PAYMENT METHODS
 */
export interface PaymentMethod {
  id: number | string;
  name: string;
  gateway_type: string;
}

export const getPaymentMethods = async () => {
  const res = await api.get("/payment-methods");

  return res.data;
};

/**
 * PAY SCHEDULE
 */
export const payIntellectual = async (
  scheduleId: number | string,
  payload: { payment_method_id: number | string },
) => {
  if (!scheduleId) {
    throw new Error("Missing scheduleId");
  }

  const res = await api.post(
    `/intellectual-properties/schedules/${scheduleId}/pay`,
    payload,
  );

  return res.data;
};

export const checkIntellectualPaymentStatus = async (
  paymentIntentId: string,
) => {
  const res = await api.get(`/payment/status/${paymentIntentId}`);
  return res.data;
};
