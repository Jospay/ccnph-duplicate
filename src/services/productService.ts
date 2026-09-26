import api from "./api";

export interface Category {
  id: number | string;
  name: string;
  slug: string;
  parent_id?: number | null;
  image?: string | null;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  rating: number | null;
  sold_count: number | null;
  image: string | null;
  price: number | null;
  compare_price: number | null;
  stock: number;
  is_liked: boolean;
}

export interface Pagination {
  current_page: number;
  last_page: number;
  has_more: boolean;
}

export interface StoreHomeResponse {
  success: boolean;
  data: {
    categories: Category[];
    productsTopDeals: Product[];
    productsDiscover: Product[];
    pagination: Pagination;
  };
}

export interface ProductImage {
  id: number;
  url: string;
  sort_order: number;
}

export interface AttributeValue {
  name: string;
  value: string;
}

export interface ProductVariant {
  id: number;
  sku: string | null;
  price: string | number;
  compare_price: string | number | null;
  stock: number;
  is_default: boolean;
  image: string | null;
  attributes: AttributeValue[];
}

export interface Store {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  banner: string | null;
  description: string | null;
  rating: number | null;
  is_official: boolean;
}

export interface DetailedProduct {
  id: number;
  name: string;
  sold_count: number | null;
  description: string | null;
  is_featured: boolean;
  is_active: boolean;
  rating: number | null;
  categories: Category[];
  images: ProductImage[];
  video: string | null;
  variants: ProductVariant[];
  store: Store;
  is_liked?: boolean;
}

export interface ProductShowResponse {
  status: string;
  product: DetailedProduct;
}

export interface ToggleCollectionResponse {
  status: string;
  message: string;
  is_active: boolean;
}

export interface CollectionProduct {
  id: number;
  user_id: number;
  product_id: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product: Product;
}

export interface CollectionResponse {
  status: string;
  collections: CollectionProduct[];
}

export interface TopDealsResponse {
  success: boolean;
  data: {
    products: Product[];
    pagination: Pagination;
  };
}

export interface DirectCheckoutSelectPayload {
  mode: "direct";
  product_variant_id: number;
  quantity: number;
}

export interface DirectCheckoutSelectResponse {
  success: boolean;
  message?: string;
}

// ==========================================
// SHOP SPECIFIC TYPES (Used by Store.tsx Layout)
// ==========================================
export interface ShopDetails {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  banner: string | null;
  description: string | null;
  rating: number | null;
  is_official: boolean;
  followers_count: number;
  is_followed: boolean;
  created_at: string;
}

export interface ShopProduct {
  id: number;
  name: string;
  slug: string;
  rating: number | null;
  sold_count: number | null;
  image: string | null;
  price: string | number | null;
  compare_price: string | number | null;
  stock: number;
  is_liked: boolean;
}

export interface ShopPagination {
  current_page: number;
  last_page: number;
  has_more: boolean;
  total?: number;
}

export interface StoreProductResponse {
  success: boolean;
  message: string;
  data: {
    store: ShopDetails;
    products: ShopProduct[];
    pagination: ShopPagination;
  };
}

export interface ToggleFollowResponse {
  success: boolean;
  message: string;
  is_followed: boolean;
  followers_count: number;
}

/**
 * STORE HOME
 */
export const getStoreHome = async (
  categoryId?: string | number,
  page: number = 1,
): Promise<StoreHomeResponse> => {
  const params: { category_id?: string | number; page: number } = { page };

  if (categoryId && categoryId !== "All") {
    params.category_id = categoryId;
  }

  const response = await api.get("/store/home", { params });
  return response.data;
};

/**
 * PRODUCT DETAILS
 */
export const getProductShow = async (
  slug: string,
): Promise<ProductShowResponse> => {
  const response = await api.get(`/store/products/${slug}`);
  return response.data;
};

/**
 * MY COLLECTIONS
 */
export const getCollections = async (): Promise<CollectionResponse> => {
  const response = await api.get("/store/collections");
  return response.data;
};

/**
 * TOGGLE COLLECTION
 */
export const toggleCollection = async (
  slug: string,
): Promise<ToggleCollectionResponse> => {
  const response = await api.post(`/store/collections/${slug}/toggle`);
  return response.data;
};

/**
 * GET TOP DEALS
 */
export const getTopDeals = async (
  page: number = 1,
): Promise<TopDealsResponse> => {
  const response = await api.get("/store/top-deals", { params: { page } });
  return response.data;
};

/**
 * DIRECT CHECKOUT SELECT VERIFICATION
 */
export const selectDirectCheckout = async (
  payload: DirectCheckoutSelectPayload,
): Promise<DirectCheckoutSelectResponse> => {
  const response = await api.post("/store/checkout/select", payload);
  return response.data;
};

/**
 * GET STORE DETAILS BY SLUG
 */
export const getStore = async (
  slug: string,
  page: number = 1,
): Promise<StoreProductResponse> => {
  const response = await api.get(`/store/${slug}`, { params: { page } });
  return response.data;
};

/**
 * TOGGLE FOLLOW/UNFOLLOW SHOP
 */
export const toggleFollowShop = async (
  slug: string,
): Promise<ToggleFollowResponse> => {
  const response = await api.post(`/store/${slug}/toggle-follow`);
  return response.data;
};

// Review Products Interfaces
export interface ReviewItem {
  id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  user_name: string;
  user_avatar: string | null;
  video_url: string | null;
  images: string[];
}

export interface ReviewStats {
  average_rating: number;
  total_reviews: number;
  breakdown: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface FetchProductReviewsResponse {
  success: boolean;
  data: {
    stats: ReviewStats;
    reviews: ReviewItem[];
    pagination: {
      current_page: number;
      last_page: number;
      has_more: boolean;
      total: number;
    };
  };
}

export const fetchProductReviewsAPI = async (
  productId: number | string,
  page: number = 1,
  ratingFilter: string = "all",
): Promise<FetchProductReviewsResponse> => {
  const response = await api.get<FetchProductReviewsResponse>(
    `/store/products/${productId}/reviews`,
    {
      params: { page, rating: ratingFilter },
    },
  );
  return response.data;
};
