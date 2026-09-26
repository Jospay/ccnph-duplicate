import { getCart } from "@/services/cart";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageBackground,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ProductCard } from "@/components/ProductItems";
import {
  getStore,
  ShopDetails,
  ShopPagination,
  ShopProduct,
  toggleCollection,
  toggleFollowShop,
} from "@/services/productService";

import UserProfile from "../../../assets/images/UserProfile.jpg";

export default function Store() {
  const router = useRouter();

  // Extract slug from dynamic route configuration /store/[slug]
  const { slug } = useLocalSearchParams<{ slug: string }>();

  // State management for API integrations
  const [storeDetails, setStoreDetails] = useState<ShopDetails | null>(null);
  const [storeProducts, setStoreProducts] = useState<ShopProduct[]>([]);
  const [pagination, setPagination] = useState<ShopPagination | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Dynamic Cart Badge State
  const [cartCount, setCartCount] = useState<number>(0);

  // Pagination states
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [search, setSearch] = useState("");
  const [follow, setFollow] = useState(false);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [followLoading, setFollowLoading] = useState(false);

  // Safely grab string value if parameter parses back as an array
  const storeSlug = Array.isArray(slug) ? slug[0] : slug || "";

  // Sync Cart badge values dynamically matching the Collection calculations logic block
  const fetchCartBadgeCount = async () => {
    try {
      const response = await getCart();
      if (
        response &&
        response.success &&
        response.cart &&
        response.cart.items
      ) {
        const calculatedQuantities = response.cart.items.reduce(
          (accumulator, item) => accumulator + (item.quantity ?? 0),
          0,
        );
        const finalCount =
          calculatedQuantities > 0
            ? calculatedQuantities
            : response.cart.items.length;
        setCartCount(finalCount);
      }
    } catch (e) {
      console.error("Failed syncing store view context badges:", e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCartBadgeCount();
    }, []),
  );

  // Fetch store data dynamically from API backend
  const fetchStoreData = async (
    targetPage: number = 1,
    isInitialLoad = true,
  ) => {
    if (!storeSlug || storeSlug === "undefined" || storeSlug === "[slug]") {
      setLoading(false);
      return;
    }

    if (isInitialLoad && targetPage === 1) {
      setLoading(true);
    } else if (targetPage > 1) {
      setLoadingMore(true);
    }

    try {
      const response = await getStore(storeSlug, targetPage);

      if (response && response.success && response.data) {
        if (targetPage === 1) {
          setStoreDetails(response.data.store);
          setStoreProducts(response.data.products || []);
          setFollow(response.data.store.is_followed ?? false);
          setFollowersCount(response.data.store.followers_count ?? 0);
        } else {
          setStoreProducts((prev) => [
            ...prev,
            ...(response.data.products || []),
          ]);
        }

        const paginationData = response.data.pagination;
        setPagination(paginationData);

        if (paginationData) {
          setPage(paginationData.current_page);
          setHasMore(paginationData.has_more);
        } else {
          setHasMore(false);
        }
      } else {
        if (targetPage === 1) {
          setStoreDetails(null);
          setStoreProducts([]);
        }
      }
    } catch (error: any) {
      console.error("❌ Failed to fetch store data from backend:", error);
      if (targetPage === 1) {
        setStoreDetails(null);
        setStoreProducts([]);
      }
      setHasMore(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchStoreData(1, true);
  }, [storeSlug]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    fetchStoreData(1, false);
    fetchCartBadgeCount();
  }, [storeSlug]);

  const loadMoreProducts = () => {
    if (!loadingMore && hasMore && !search) {
      const nextPage = page + 1;
      fetchStoreData(nextPage, false);
    }
  };

  const handleToggleFollow = async () => {
    if (!storeSlug || followLoading) return;

    // Optimistic UI update
    const previousFollow = follow;
    const previousCount = followersCount;

    setFollow(!previousFollow);
    setFollowersCount(previousFollow ? previousCount - 1 : previousCount + 1);
    setFollowLoading(true);

    try {
      const res = await toggleFollowShop(storeSlug);
      if (res && res.success) {
        setFollow(res.is_followed);
        setFollowersCount(res.followers_count);
      }
    } catch (error) {
      console.error("Failed to toggle follow status:", error);
      // Revert back on error
      setFollow(previousFollow);
      setFollowersCount(previousCount);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleToggleFavorite = async (productId: number, slug: string) => {
    if (!slug) return;

    setStoreProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, is_liked: !p.is_liked } : p,
      ),
    );

    try {
      await toggleCollection(slug);
    } catch (error) {
      console.error("Failed to sync collection endpoint changes:", error);
      // Rollback UI
      setStoreProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, is_liked: !p.is_liked } : p,
        ),
      );
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#0052cc" />
        <Text className="mt-4 text-slate-500 font-medium">
          Loading store...
        </Text>
      </View>
    );
  }

  if (!storeDetails) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Ionicons name="alert-circle-outline" size={64} color="#D70127" />
        <Text className="text-xl font-semibold text-slate-800 mt-4 text-center">
          Store Not Found
        </Text>
        <Text className="text-slate-500 text-sm mt-2 text-center">
          The store with slug <Text className="font-bold">{storeSlug}</Text>{" "}
          could not be retrieved.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-6 bg-primary px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const filteredProducts = storeProducts.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View className="flex-1 bg-slate-50">
      <FlatList
        data={filteredProducts}
        numColumns={2}
        keyExtractor={(item, index) => `${item.id.toString()}-${index}`}
        columnWrapperStyle={{
          justifyContent: "space-between",
          paddingHorizontal: 0,
        }}
        contentContainerStyle={{
          padding: 8,
          paddingBottom: 50,
        }}
        onEndReached={loadMoreProducts}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#034194"]}
            tintColor="#034194"
          />
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
            {/* SEARCH BAR */}
            <View className="flex-row mb-4">
              <View className="flex-1 h-14 bg-white rounded-2xl border border-slate-200 flex-row items-center px-4">
                <Ionicons name="search" size={22} color="#64748b" />
                <TextInput
                  placeholder="Search in this store..."
                  value={search}
                  onChangeText={setSearch}
                  className="flex-1 ml-3"
                />
              </View>

              {/* CART BUTTON WITH BADGE */}
              <TouchableOpacity
                onPress={() => router.push("/cart")}
                className="ml-3 bg-white h-14 w-14 rounded-2xl items-center justify-center border border-slate-200 relative"
              >
                <Ionicons name="cart-outline" size={25} color="#034194" />
                {cartCount > 0 && (
                  <View className="absolute -top-1 -right-1 bg-[#D70127] rounded-full min-w-[18px] h-[18px] items-center justify-center px-1 border border-white">
                    <Text className="text-white text-[10px] font-bold">
                      {cartCount > 99 ? "99+" : cartCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* SHOP HEADER */}
            <ImageBackground
              source={
                storeDetails.banner ? { uri: storeDetails.banner } : { uri: "" }
              }
              resizeMode="cover"
              className={`rounded-3xl mb-4 overflow-hidden border border-slate-200 ${
                storeDetails.banner ? "bg-transparent" : "bg-white"
              }`}
            >
              {storeDetails.banner && (
                <View className="absolute inset-0 bg-black/50" />
              )}

              <View className="p-5">
                <View className="flex-row items-center">
                  {/* Store Logo Container with Mall Badge */}
                  <View
                    style={{
                      position: "relative",
                      width: 75,
                      height: 75,
                      alignItems: "center",
                    }}
                  >
                    <Image
                      source={
                        storeDetails.logo
                          ? { uri: storeDetails.logo }
                          : UserProfile
                      }
                      style={{
                        width: 75,
                        height: 75,
                        borderRadius: 37.5,
                        backgroundColor: "#f1f5f9",
                      }}
                      className="border border-slate-200"
                    />

                    {storeDetails.is_official && (
                      <View
                        style={{
                          position: "absolute",
                          bottom: -4,
                          alignSelf: "center",
                          backgroundColor: "#D70127",
                          borderRadius: 4,
                          paddingHorizontal: 16,
                          paddingVertical: 2,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "bold",
                            color: "#FFFFFF",
                            textAlign: "center",
                          }}
                        >
                          Mall
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Store Details */}
                  <View className="ml-4 flex-1">
                    <View className="flex-row items-center flex-wrap">
                      <Text
                        className={`text-2xl font-bold mr-1 ${
                          storeDetails.banner ? "text-white" : "text-primary"
                        }`}
                        numberOfLines={1}
                      >
                        {storeDetails.name || "Fashion Store"}
                      </Text>
                    </View>

                    <Text
                      className={`text-xs mt-1 ${
                        storeDetails.banner
                          ? "text-slate-200"
                          : "text-slate-500"
                      }`}
                      numberOfLines={2}
                    >
                      {storeDetails.description || "Welcome to our store!"}
                    </Text>
                  </View>
                </View>

                {/* FOLLOW + CHAT BUTTON */}
                <View className="flex-row mt-5 gap-3">
                  <TouchableOpacity
                    disabled={followLoading}
                    onPress={handleToggleFollow}
                    className={`flex-1 py-3 rounded-xl items-center border ${
                      storeDetails.banner
                        ? follow
                          ? "bg-white border-white"
                          : "bg-transparent border-white"
                        : follow
                          ? "bg-primary border-primary"
                          : "bg-white border-primary"
                    }`}
                  >
                    <Text
                      className={`font-bold ${
                        storeDetails.banner
                          ? follow
                            ? "text-slate-900"
                            : "text-white"
                          : follow
                            ? "text-white"
                            : "text-primary"
                      }`}
                    >
                      {follow ? "Following" : "Follow"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      if (!storeDetails?.id) return;
                      router.push({
                        pathname: "/(store-chat)/",
                        params: {
                          storeId: String(storeDetails.id),
                          storeName: storeDetails.name,
                        },
                      });
                    }}
                    className="flex-1 py-3 bg-green-500 rounded-xl flex-row justify-center items-center"
                  >
                    <Ionicons name="chatbubble" size={18} color="white" />
                    <Text className="text-white font-bold ml-2">Chat</Text>
                  </TouchableOpacity>
                </View>

                {/* SHOP INFO / METRICS BLOCK */}
                <View
                  className={`flex-row justify-between mt-6 pt-4 border-t ${
                    storeDetails.banner ? "border-white" : "border-slate-200"
                  }`}
                >
                  <View className="items-center flex-1">
                    <Text
                      className={`font-bold text-center text-lg ${
                        storeDetails.banner ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {storeDetails.rating
                        ? `${Number(storeDetails.rating).toFixed(1)} ⭐`
                        : "—"}
                    </Text>
                    <Text
                      className={`text-xs mt-1 ${
                        storeDetails.banner
                          ? "text-slate-300"
                          : "text-slate-500"
                      }`}
                    >
                      Rating
                    </Text>
                  </View>

                  <View
                    className={`items-center flex-1 border-x ${
                      storeDetails.banner ? "border-white" : "border-slate-200"
                    }`}
                  >
                    <Text
                      className={`font-bold text-center text-lg ${
                        storeDetails.banner ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {pagination?.total !== undefined
                        ? pagination.total
                        : storeProducts.length}
                    </Text>
                    <Text
                      className={`text-xs mt-1 ${
                        storeDetails.banner
                          ? "text-slate-300"
                          : "text-slate-500"
                      }`}
                    >
                      Products
                    </Text>
                  </View>

                  <View className="items-center flex-1">
                    <Text
                      className={`font-bold text-center text-lg ${
                        storeDetails.banner ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {followersCount}
                    </Text>
                    <Text
                      className={`text-xs mt-1 ${
                        storeDetails.banner
                          ? "text-slate-300"
                          : "text-slate-500"
                      }`}
                    >
                      Followers
                    </Text>
                  </View>
                </View>
              </View>
            </ImageBackground>

            {/* PRODUCTS TITLE CONTAINER */}
            <View className="bg-blue rounded-xl py-3 mb-4">
              <Text className="text-primary text-center text-xl font-bold">
                Products
              </Text>
            </View>
          </>
        }
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
            onPress={() =>
              router.push({
                pathname: "/products/[slug]",
                params: { slug: item.slug },
              })
            }
            onFavoritePress={() => handleToggleFavorite(item.id, item.slug)}
          />
        )}
        ListEmptyComponent={
          <View className="items-center justify-center py-12 px-4">
            <Ionicons name="cube-outline" size={48} color="#94a3b8" />
            <Text className="text-slate-400 mt-2 text-center">
              No products found in this store.
            </Text>
          </View>
        }
      />
    </View>
  );
}
