import api from "./api";

export interface CartAttribute {
  name: string;
  value: string;
}

export interface CartVariant {
  id: number;
  sku: string | null;
  price: number;
  compare_price: number | null;
  stock: number;
  image: string | null;
  attributes: CartAttribute[];
}

export interface CartProduct {
  id: number;
  name: string;
  slug: string;
  seller: string;
}

export interface CartItem {
  id: number;
  quantity: number;
  product_variant_id: number;
  variant: CartVariant;
  product: CartProduct;
}

export interface CartResponse {
  success: boolean;
  cart: {
    id: number;
    items: CartItem[];
  };
}

export interface AddToCartPayload {
  product_variant_id: number;
  quantity: number;
}

export const getCart = async (): Promise<CartResponse> => {
  const response = await api.get("/store/cart");

  return response.data;
};

export const addToCart = async (payload: AddToCartPayload): Promise<any> => {
  const response = await api.post("/store/cart/items", payload);

  return response.data;
};

export const updateCartItem = async (
  cartItemId: number,
  quantity: number,
): Promise<any> => {
  const response = await api.patch(`/store/cart/items/${cartItemId}`, {
    quantity,
  });

  return response.data;
};

export const removeCartItem = async (cartItemId: number): Promise<any> => {
  const response = await api.delete(`/store/cart/items/${cartItemId}`);

  return response.data;
};
