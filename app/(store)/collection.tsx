import { ProductCard } from "@/components/ProductItems";
import { Skeleton } from "@/components/ui/skeleton";
import { getCart } from "@/services/cart";
import {
  CollectionProduct,
  getCollections,
  toggleCollection,
} from "@/services/productService";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function FavoritesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favoriteItems, setFavoriteItems] = useState<CollectionProduct[]>([]);
  const [cartCount, setCartCount] = useState<number>(0);

  // Local states for filtering items on-page
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Central data loader for collections and cart badges
  const fetchPageData = async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) setLoading(true);
    try {
      const [collectionResponse, cartResponse] = await Promise.allSettled([
        getCollections(),
        getCart(),
      ]);

      if (
        collectionResponse.status === "fulfilled" &&
        collectionResponse.value
      ) {
        const response = collectionResponse.value;
        if (
          response.status === "success" ||
          (response as any).success === true
        ) {
          const activeCollections = response.collections.filter(
            (item) => item && item.product,
          );
          setFavoriteItems(activeCollections);
        }
      }

      if (cartResponse.status === "fulfilled" && cartResponse.value) {
        const response = cartResponse.value;
        if (response.success && response.cart && response.cart.items) {
          const totalItemsCount = response.cart.items.reduce(
            (accumulator, item) => accumulator + (item.quantity ?? 0),
            0,
          );
          setCartCount(totalItemsCount);
        }
      }
    } catch (error) {
      console.error("Failed to load backend page datasets:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPageData(favoriteItems.length === 0);
    }, []),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPageData(false);
  }, []);

  const handleToggleFavorite = async (collectionId: number, slug: string) => {
    if (!slug) return;
    const technicalFallbackItems = [...favoriteItems];

    setFavoriteItems((prevItems) =>
      prevItems.filter(
        (item) => item.id !== collectionId && item.product?.slug !== slug,
      ),
    );

    try {
      await toggleCollection(slug);
    } catch (error) {
      console.error(
        "Failed to persist layout favorite selection toggles:",
        error,
      );
      setFavoriteItems(technicalFallbackItems);
    }
  };

  const handleProductPress = (slug: string) => {
    if (!slug) return;
    router.push({
      pathname: "/products/[slug]",
      params: { slug },
    });
  };

  // Live client-side product filtering based on your search entry criteria
  const displayedItems = favoriteItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    return item.product?.name
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase());
  });

  return (
    <View className="flex-1 bg-slate-50">
      {/* ACTIONS TOP HEADER CONTAINER */}
      <View className="bg-white pt-3 pb-3 px-4 border-b border-slate-200">
        {/* Row 1: Title and Counter */}
        {/* <View className="flex-row items-center mb-3">
          <Text className="text-xl font-bold text-slate-800">
            My Collection
          </Text>
          <Text className="text-xs text-slate-400 ml-2 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
            {loading ? "..." : favoriteItems.length}
          </Text>
        </View> */}

        {/* Row 2: Direct Search input bar + Functional App Icons */}
        <View className="flex-row items-center">
          <View className="flex-1 flex-row items-center bg-slate-100 rounded-2xl px-4 h-12 border border-slate-200">
            <Ionicons name="search" size={20} color="#64748b" />
            <TextInput
              placeholder="Search items in collection..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 text-slate-800 ml-2 text-sm h-full"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          {/* CART ICON WITH BADGE COUNTER */}
          <TouchableOpacity
            onPress={() => router.push("/cart")}
            className="ml-3 bg-white h-12 w-12 rounded-2xl items-center justify-center border border-slate-200 relative"
          >
            <Ionicons name="cart-outline" size={22} color="#034194" />
            {cartCount > 0 && (
              <View className="absolute -top-1 -right-1 bg-[#D70127] rounded-full min-w-[18px] h-[18px] items-center justify-center px-1 border border-white">
                <Text className="text-white text-[10px] font-bold">
                  {cartCount > 99 ? "99+" : cartCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* PRODUCTS GRID */}
      <FlatList
        data={loading ? [] : displayedItems}
        renderItem={({ item }) => {
          const product = item.product;
          if (!product) return null;

          const productPrice = Number(product.price ?? 0);
          const productSold = Number(product.sold_count ?? 0);
          const productRating =
            product.rating !== null && product.rating !== undefined
              ? Number(product.rating)
              : 5;
          const productStock = Number(product.stock ?? 0);
          const productImage = product.image ?? "";

          return (
            <ProductCard
              item={{
                id: product.id.toString(),
                name: product.name,
                price:
                  productPrice > 0
                    ? `₱${productPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : "₱0.00",
                image: productImage,
                sold_count: `${productSold} sold`,
                rating: productRating,
                stock: productStock,
                category: "",
                isLiked: true,
              }}
              onPress={() => handleProductPress(product.slug)}
              onFavoritePress={() =>
                handleToggleFavorite(item.id, product.slug)
              }
            />
          );
        }}
        keyExtractor={(item, index) =>
          item.id ? item.id.toString() : `fav-${item.product_id}-${index}`
        }
        numColumns={2}
        columnWrapperStyle={
          displayedItems.length > 0
            ? { justifyContent: "space-between" }
            : undefined
        }
        contentContainerStyle={{ padding: 7, paddingBottom: 20 }}
        ListHeaderComponent={
          <>
            {loading && (
              <View className="flex-row flex-wrap justify-between pt-2">
                {[1, 2, 3, 4].map((skeletonId) => (
                  <View
                    key={skeletonId}
                    style={{ width: "48%" }}
                    className="mb-4"
                  >
                    <Skeleton className="h-[220px] rounded-3xl" />
                  </View>
                ))}
              </View>
            )}

            {!loading &&
              favoriteItems.length > 0 &&
              displayedItems.length === 0 && (
                <View className="items-center justify-center py-20">
                  <Ionicons name="search-outline" size={48} color="#94a3b8" />
                  <Text className="text-slate-500 font-semibold text-base mt-2">
                    No matching items found
                  </Text>
                  <Text className="text-slate-400 text-xs text-center mt-1">
                    Try adjusting your search criteria keywords.
                  </Text>
                </View>
              )}

            {!loading && favoriteItems.length === 0 && (
              <View className="items-center justify-center py-20">
                <View className="bg-slate-200 p-4 rounded-full mb-3">
                  <Ionicons
                    name="heart-dislike-outline"
                    size={40}
                    color="#94a3b8"
                  />
                </View>
                <Text className="text-slate-500 font-semibold text-base">
                  No items here yet
                </Text>
                <Text className="text-slate-400 text-xs text-center px-8 mt-1">
                  Tap the heart icon on product cards while browsing to save
                  them here!
                </Text>
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
