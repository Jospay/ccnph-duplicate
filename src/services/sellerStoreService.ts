// services/sellerStoreService.ts
import api from "./api";

export interface SellerRegistrationPayload {
  name: string;
  description: string;
  logo: {
    uri: string;
    name: string;
    type: string;
  };
  banner: {
    uri: string;
    name: string;
    type: string;
  };
}

/**
 * Registers a new seller shop setup in a single unified execution frame.
 */
export const registerSellerShop = async (
  payload: SellerRegistrationPayload,
) => {
  const formData = new FormData();

  formData.append("name", payload.name);
  formData.append("description", payload.description);

  // Bind binary components safely as parameters
  formData.append("logo", {
    uri: payload.logo.uri,
    name: payload.logo.name,
    type: payload.logo.type,
  } as any);

  formData.append("banner", {
    uri: payload.banner.uri,
    name: payload.banner.name,
    type: payload.banner.type,
  } as any);

  const res = await api.post("/store/register-seller", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
};
