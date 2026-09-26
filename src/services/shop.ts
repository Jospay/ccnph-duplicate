import api from "./api";

export interface ShopProduct {
  id: number;
  name: string;
  slug: string;
  image: string | null;
  price: number | null;
  compare_price: number | null;
  stock: number;
}

export interface ShopDetails {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  banner: string | null;
  description: string | null;
  created_at: string;
}

export interface ShopPagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
  next_page_url: string | null;
  prev_page_url: string | null;
}

export interface ShopResponse {
  success: boolean;
  message: string;
  data: {
    store: ShopDetails;
    products: ShopProduct[];
    pagination: ShopPagination;
  };
}

/**
 * Fetches store information and its paginated items from the backend.
 * Maps directly to backend endpoint: /api/store/{store}
 */
export const getStore = async (
  slug: string,
  page: number = 1,
): Promise<ShopResponse> => {
  const response = await api.get(`/store/${slug}`, {
    params: {
      page,
    },
  });

  console.log(`STORE API (${slug})`, JSON.stringify(response.data, null, 2));

  return response.data;
};
