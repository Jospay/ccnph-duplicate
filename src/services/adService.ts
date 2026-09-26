import api from "./api";

export interface AdItem {
  id: number;
  name: string;
  image: string;
  link: string;
  is_active: boolean;
  sort_banner: number;
  created_at: string;
  updated_at: string;
}

export interface AdResponse {
  success: boolean;
  message: string;
  data: AdItem[];
}

export const getAds = async (): Promise<AdResponse> => {
  const res = await api.get("/ads");
  return res.data;
};
