import { ProductCard } from "@/components/ProductItems";
import { Skeleton } from "@/components/ui/skeleton";
import { getCart } from "@/services/cart";
import {
  Category,
  getStoreHome,
  Product,
  toggleCollection,
} from "@/services/productService";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import image from "../../assets/images/vector/FISMPC.png";

export default function HomePage() {
  const router = useRouter();

  const [selectedCategory, setSelectedCategory] = useState<string | number>(
    "All",
  );

  // --- SMOOTH ANIMATION CONFIGURATION ---
  const scrollX = useRef(new Animated.Value(0)).current;
  const [contentWidth, setContentWidth] = useState(1);
  const [containerWidth, setContainerWidth] = useState(1);
  // --------------------------------------

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // State managed from DB fetch results
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [topDeals, setTopDeals] = useState<Product[]>([]);

  // Real-time Cart Count Badge State Tracker
  const [cartCount, setCartCount] = useState<number>(0);

  const fetchProducts = async (
    catId: string | number = "All",
    targetPage = 1,
    isInitialLoad = true,
  ) => {
    if (isInitialLoad && targetPage === 1) {
      setLoading(true);
    } else if (targetPage > 1) {
      setLoadingMore(true);
    }

    try {
      const response = await getStoreHome(catId, targetPage);

      console.log("STORE RESPONSE:", response);

      if (targetPage === 1 && response?.data?.categories) {
        setCategories([
          { id: "All", name: "All", slug: "all" },
          ...response.data.categories,
        ]);
      }

      if (targetPage === 1) {
        setTopDeals(response?.data?.productsTopDeals ?? []);
        setProducts(response?.data?.productsDiscover ?? []);
      } else {
        setProducts((prev) => [
          ...prev,
          ...(response?.data?.productsDiscover ?? []),
        ]);
      }

      const pagination = response?.data?.pagination;
      if (pagination) {
        setPage(pagination.current_page);
        setHasMore(pagination.has_more);
      } else {
        setHasMore(false);
      }
    } catch (error: any) {
      console.log("Failed to load products:", error?.response?.data ?? error);
      if (targetPage === 1) {
        setProducts([]);
        setTopDeals([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const fetchCartCountOnly = async () => {
    try {
      const response = await getCart();
      if (
        response &&
        response.success &&
        response.cart &&
        response.cart.items
      ) {
        const totalItemsCount = response.cart.items.reduce(
          (accumulator, item) => accumulator + (item.quantity ?? 0),
          0,
        );
        setCartCount(totalItemsCount);
      }
    } catch (error) {
      console.error(
        "Failed silently to pull modern cart status parameters:",
        error,
      );
    }
  };

  useEffect(() => {
    fetchProducts("All", 1, true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchCartCountOnly();
    }, []),
  );

  const handleCategoryPress = (catId: string | number) => {
    setSelectedCategory(catId);
    setPage(1);
    fetchProducts(catId, 1, true);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    fetchProducts(selectedCategory, 1, false);
    fetchCartCountOnly();
  }, [selectedCategory]);

  const loadMoreProducts = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      fetchProducts(selectedCategory, nextPage, false);
    }
  };

  const handleProductPress = (slug: string) => {
    if (!slug) {
      console.warn("Cannot navigate: Selected product item slug is missing.");
      return;
    }
    router.push({
      pathname: "/products/[slug]",
      params: { slug },
    });
  };

  const handleToggleFavorite = async (productId: number, slug: string) => {
    if (!slug) return;

    setProducts((prevProducts) =>
      prevProducts.map((p) =>
        p.id === productId ? { ...p, is_liked: !p.is_liked } : p,
      ),
    );

    setTopDeals((prevDeals) =>
      prevDeals.map((d) =>
        d.id === productId ? { ...d, is_liked: !d.is_liked } : d,
      ),
    );

    try {
      await toggleCollection(slug);
    } catch (error) {
      console.error("Failed to sync collection endpoint changes:", error);
      // Rollback UI
      setProducts((prevProducts) =>
        prevProducts.map((p) =>
          p.id === productId ? { ...p, is_liked: !p.is_liked } : p,
        ),
      );
      setTopDeals((prevDeals) =>
        prevDeals.map((d) =>
          d.id === productId ? { ...d, is_liked: !d.is_liked } : d,
        ),
      );
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      <FlatList
        data={loading ? [] : products}
        renderItem={({ item }) => (
          <ProductCard
            item={{
              id: item.id.toString(),
              name: item.name,
              price: item.price
                ? `₱${Number(item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : "₱0.00",
              image: item.image ?? "",
              sold_count: `${item.sold_count ?? 0} sold`,
              rating: item.rating,
              stock: item.stock,
              category: "",
              isLiked: item.is_liked,
            }}
            onPress={() => handleProductPress(item.slug)}
            onFavoritePress={() => handleToggleFavorite(item.id, item.slug)}
          />
        )}
        keyExtractor={(item, index) => `${item.id.toString()}-${index}`}
        numColumns={2}
        columnWrapperStyle={
          products.length > 0 ? { justifyContent: "space-between" } : undefined
        }
        contentContainerStyle={{
          padding: 7,
          paddingBottom: 20,
        }}
        onEndReached={loadMoreProducts}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !loading ? (
            <View className="items-center justify-center py-12 px-4">
              <Ionicons name="basket-outline" size={64} color="#94a3b8" />
              <Text className="text-slate-700 text-base font-semibold mt-4 text-center">
                No Products Found
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <View className="py-4 items-center justify-center">
              <ActivityIndicator size="small" color="#034194" />
            </View>
          ) : null
        }
        ListHeaderComponent={
          <>
            {/* SEARCH CONTAINER BAR LINKING TO SEARCH SCREEN */}
            <View className="flex-row items-center mb-3">
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => router.push("/search")}
                className="flex-1 flex-row items-center bg-white rounded-2xl px-4 h-12 border border-slate-200"
              >
                <Ionicons name="search" size={22} color="#64748b" />
                <Text className="text-slate-400 ml-3 text-sm">
                  Search products..
                </Text>
              </TouchableOpacity>

              {/* CART */}
              <TouchableOpacity
                onPress={() => router.push("/cart")}
                className="ml-3 bg-white h-12 w-12 rounded-2xl items-center justify-center border border-slate-200 relative"
              >
                <Ionicons name="cart-outline" size={24} color="#034194" />
                {cartCount > 0 && (
                  <View className="absolute -top-1 -right-1 bg-[#D70127] rounded-full min-w-[18px] h-[18px] items-center justify-center px-1 border border-white">
                    <Text className="text-white text-[10px] font-bold">
                      {cartCount > 99 ? "99+" : cartCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* BANNER & DYNAMIC CATEGORIES NAVBAR */}
            <View className="bg-blue rounded-3xl p-3 mb-3">
              <Image
                source={image}
                className="!w-full !h-24 rounded-2xl"
                resizeMode="cover"
              />

              {/* CATEGORY SLIDER */}
              <Animated.ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mt-3"
                scrollEventThrottle={1}
                onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
                onContentSizeChange={(w) => setContentWidth(w)}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                  { useNativeDriver: true },
                )}
              >
                {categories.map((item) => (
                  <TouchableOpacity
                    key={item.id.toString()}
                    onPress={() => handleCategoryPress(item.id)}
                    className="mr-3 px-2 rounded-full"
                  >
                    <Text
                      className={
                        selectedCategory === item.id
                          ? "font-semibold text-primary"
                          : "font-medium text-slate-600"
                      }
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </Animated.ScrollView>

              {/* SLIDE BAR INDICATOR */}
              <View className="items-center mt-3">
                {(() => {
                  const totalCategories = Math.max(categories.length, 1);
                  const trackWidth = Math.min(
                    Math.max(totalCategories * 16, 48),
                    120,
                  );
                  const thumbWidth = trackWidth / totalCategories;
                  const maxScrollDistance = trackWidth - thumbWidth;

                  return (
                    <View
                      style={{ width: trackWidth }}
                      className="h-2 bg-primary border border-primary rounded-full overflow-hidden"
                    >
                      <Animated.View
                        className="h-full bg-white rounded-full"
                        style={{
                          width: `${100 / totalCategories}%`,
                          transform: [
                            {
                              translateX: scrollX.interpolate({
                                inputRange: [
                                  0,
                                  Math.max(contentWidth - containerWidth, 1),
                                ],
                                outputRange: [0, maxScrollDistance],
                                extrapolate: "clamp",
                              }),
                            },
                          ],
                        }}
                      />
                    </View>
                  );
                })()}
              </View>
            </View>

            {/* TOP DEALS */}
            {!loading && topDeals.length > 0 && (
              <View className="mb-5 mt-2">
                <View className="flex-row justify-between items-center px-2 mb-2">
                  <Text className="text-lg font-bold text-primary">
                    Top Deals
                  </Text>
                  <TouchableOpacity onPress={() => router.push("/top-deal")}>
                    <Text className="text-sm text-primary font-medium underline">
                      View All
                    </Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 12 }}
                >
                  {topDeals.map((item) => (
                    <View
                      key={item.id}
                      className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm w-44 relative"
                    >
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleProductPress(item.slug)}
                      >
                        <View className="relative">
                          <Image
                            source={{ uri: item.image ?? "" }}
                            className="w-full h-36"
                            resizeMode="cover"
                          />
                          <View className="absolute top-2 left-2 bg-[#D70127] px-2 py-1 rounded-full">
                            <Text className="text-white text-xs font-bold">
                              DEAL
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleToggleFavorite(item.id, item.slug)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow-sm z-20"
                      >
                        <Ionicons
                          name={item.is_liked ? "heart" : "heart-outline"}
                          size={16}
                          color={item.is_liked ? "#D70127" : "#64748b"}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleProductPress(item.slug)}
                        className="p-3"
                      >
                        <Text
                          numberOfLines={2}
                          className="text-sm font-semibold text-slate-800"
                        >
                          {item.name}
                        </Text>
                        <View className="flex-row items-center mt-2">
                          <Text className="text-primary font-bold text-base">
                            ₱
                            {Number(item.price).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </Text>
                          <Text className="text-xs text-slate-400 line-through ml-2">
                            ₱
                            {Number(item.compare_price).toLocaleString(
                              undefined,
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              },
                            )}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            <Text className="text-lg font-bold text-primary ps-2 mb-1">
              Discover
            </Text>

            {loading && (
              <View className="flex-row flex-wrap justify-between">
                {[1, 2, 3, 4].map((item) => (
                  <View key={item} style={{ width: "48%" }} className="mb-4">
                    <Skeleton className="h-[220px] rounded-3xl" />
                  </View>
                ))}
              </View>
            )}
          </>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#034194"]}
            tintColor="#034194"
          />
        }
      />
    </View>
  );
}
