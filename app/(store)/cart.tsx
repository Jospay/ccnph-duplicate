import {
  CartItem,
  getCart,
  removeCartItem,
  updateCartItem,
} from "@/services/cart";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface UIItems extends CartItem {
  selected: boolean;
}

export default function CartPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<UIItems[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchCartData = useCallback(async () => {
    try {
      const data = await getCart();
      if (data.success && data.cart && data.cart.items) {
        const itemsWithSelection = data.cart.items.map((item) => ({
          ...item,
          selected: true,
        }));
        setCartItems(itemsWithSelection);
      } else {
        setCartItems([]);
      }
    } catch (error) {
      console.error("Error fetching cart data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Re-fetch data every time the Cart screen becomes active/focused
  useFocusEffect(
    useCallback(() => {
      fetchCartData();
    }, [fetchCartData]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchCartData();
  };

  const groupedSellers = useMemo(() => {
    const groups: Record<string, typeof cartItems> = {};

    cartItems.forEach((item) => {
      const sellerName = item.product?.seller || "FISMPC Store";
      if (!groups[sellerName]) {
        groups[sellerName] = [];
      }
      groups[sellerName].push(item);
    });

    return Object.entries(groups);
  }, [cartItems]);

  const handleUpdateQuantity = async (
    cartItemId: number,
    currentQty: number,
    type: "add" | "minus",
  ) => {
    const newQty = type === "add" ? currentQty + 1 : currentQty - 1;
    if (newQty < 1) return;

    setCartItems((prev) =>
      prev.map((item) =>
        item.id === cartItemId ? { ...item, quantity: newQty } : item,
      ),
    );

    try {
      await updateCartItem(cartItemId, newQty);
    } catch (error) {
      console.error("Failed to update cart quantity:", error);
      fetchCartData();
    }
  };

  const handleRemoveItem = async (cartItemId: number) => {
    setCartItems((prev) => prev.filter((item) => item.id !== cartItemId));

    try {
      await removeCartItem(cartItemId);
    } catch (error) {
      console.error("Failed to remove item from cart:", error);
      fetchCartData();
    }
  };

  const toggleProduct = (id: number) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item,
      ),
    );
  };

  const toggleSeller = (sellerName: string) => {
    const sellerItems = cartItems.filter(
      (item) => (item.product?.seller || "FISMPC Store") === sellerName,
    );
    const allSellerItemsSelected = sellerItems.every((item) => item.selected);

    setCartItems((prev) =>
      prev.map((item) => {
        const currentItemSeller = item.product?.seller || "FISMPC Store";
        if (currentItemSeller === sellerName) {
          return { ...item, selected: !allSellerItemsSelected };
        }
        return item;
      }),
    );
  };

  const toggleAll = () => {
    const allSelected = cartItems.every((item) => item.selected);
    setCartItems((prev) =>
      prev.map((item) => ({ ...item, selected: !allSelected })),
    );
  };

  const total = useMemo(() => {
    return cartItems
      .filter((item) => item.selected)
      .reduce((sum, item) => {
        const itemPrice = item.variant?.price ?? 0;
        return sum + itemPrice * item.quantity;
      }, 0);
  }, [cartItems]);

  const selectedCount = useMemo(() => {
    return cartItems.filter((item) => item.selected).length;
  }, [cartItems]);

  const goCheckout = () => {
    if (selectedCount === 0) return;

    const selectedIds = cartItems
      .filter((item) => item.selected)
      .map((item) => item.id);

    router.push({
      pathname: "/checkout",
      params: { cart_item_ids: selectedIds.join(",") },
    });
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-100 items-center justify-center">
        <ActivityIndicator size="large" color="#034194" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-100">
      <FlatList
        data={groupedSellers}
        keyExtractor={(item) => item[0]}
        contentContainerStyle={{
          padding: 12,
          paddingBottom: 140,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#034194"]}
          />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Ionicons name="cart-outline" size={64} color="#94a3b8" />
            <Text className="text-slate-500 mt-4 font-medium">
              Your cart is empty
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const seller = item[0];
          const products = item[1];
          const sellerSelected = products.every((product) => product.selected);

          return (
            <View className="bg-white rounded-2xl mb-4 overflow-hidden">
              <View className="flex-row items-center px-4 py-3 border-b border-slate-100">
                <TouchableOpacity onPress={() => toggleSeller(seller)}>
                  <Ionicons
                    name={sellerSelected ? "checkbox" : "square-outline"}
                    size={24}
                    color="#034194"
                  />
                </TouchableOpacity>

                <Ionicons
                  name="storefront-outline"
                  size={20}
                  color="#034194"
                  style={{ marginLeft: 10 }}
                />

                <Text className="ml-2 font-semibold text-slate-800">
                  {seller}
                </Text>
              </View>

              {products.map((item) => {
                const variantImage = item.variant.image || "";
                const attributesString = item.variant.attributes
                  ?.map((attr) => `${attr.name}: ${attr.value}`)
                  .join(" • ");

                return (
                  <View
                    key={item.id}
                    className="flex-row p-3 border-b border-slate-100"
                  >
                    <TouchableOpacity
                      onPress={() => toggleProduct(item.id)}
                      className="justify-center mr-3"
                    >
                      <Ionicons
                        name={item.selected ? "checkbox" : "square-outline"}
                        size={24}
                        color="#034194"
                      />
                    </TouchableOpacity>

                    <Image
                      source={{
                        uri: `http://192.168.1.53:8000${variantImage}`,
                      }}
                      style={{
                        width: 85,
                        height: 85,
                        borderRadius: 12,
                      }}
                    />

                    <View className="flex-1 ml-3">
                      <Text
                        numberOfLines={2}
                        className="font-medium text-slate-800"
                      >
                        {item.product.name}
                      </Text>

                      {attributesString ? (
                        <Text className="text-xs text-slate-500 mt-1">
                          {attributesString}
                        </Text>
                      ) : null}

                      <View className="flex-row items-center mt-2">
                        {item.variant.compare_price &&
                        item.variant.compare_price > item.variant.price ? (
                          <Text className="text-xs text-slate-400 line-through mr-2">
                            ₱{item.variant.compare_price}
                          </Text>
                        ) : null}

                        <Text className="text-primary font-bold text-lg">
                          ₱{item.variant.price}
                        </Text>
                      </View>

                      <View className="flex-row justify-between mt-3">
                        <TouchableOpacity
                          onPress={() => handleRemoveItem(item.id)}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={20}
                            color="red"
                          />
                        </TouchableOpacity>

                        <View className="flex-row items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                          <TouchableOpacity
                            onPress={() =>
                              handleUpdateQuantity(
                                item.id,
                                item.quantity,
                                "minus",
                              )
                            }
                            className="px-4 py-1 bg-slate-100 active:bg-slate-200"
                          >
                            <Text className="text-lg font-bold text-slate-600">
                              -
                            </Text>
                          </TouchableOpacity>

                          <Text className="px-5 font-semibold text-base text-slate-800">
                            {item.quantity}
                          </Text>

                          <TouchableOpacity
                            onPress={() =>
                              handleUpdateQuantity(
                                item.id,
                                item.quantity,
                                "add",
                              )
                            }
                            className="px-4 py-1 bg-slate-100 active:bg-slate-200"
                          >
                            <Text className="text-lg font-bold text-slate-600">
                              +
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          );
        }}
      />

      {cartItems.length > 0 && (
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3">
          <View className="flex-row justify-between items-center">
            <TouchableOpacity
              onPress={toggleAll}
              className="flex-row items-center"
            >
              <Ionicons
                name={
                  cartItems.every((i) => i.selected)
                    ? "checkbox"
                    : "square-outline"
                }
                size={24}
                color="#034194"
              />
              <Text className="ml-2 text-slate-700 font-medium">
                Select All
              </Text>
            </TouchableOpacity>

            <View className="items-end">
              <Text className="text-xs text-slate-500">
                {selectedCount} item(s)
              </Text>
              <Text className="text-primary font-bold text-xl">
                ₱{total.toLocaleString()}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={goCheckout}
            disabled={selectedCount === 0}
            className={`rounded-2xl mt-3 py-4 items-center ${
              selectedCount === 0 ? "bg-slate-300" : "bg-primary"
            }`}
          >
            <Text className="text-white font-semibold">
              Checkout ({selectedCount})
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
