import { ProductCard } from "@/components/ProductItems";
import {
  getTopDeals,
  Product,
  toggleCollection,
} from "@/services/productService";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  Text,
  View,
} from "react-native";

export default function TopDealPage() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchProducts = async (targetPage = 1, initial = true) => {
    if (initial && targetPage === 1) {
      setLoading(true);
    } else if (targetPage > 1) {
      setLoadingMore(true);
    }

    try {
      const response = await getTopDeals(targetPage);

      if (targetPage === 1) {
        setProducts(response.data.products);
      } else {
        setProducts((prev) => [...prev, ...response.data.products]);
      }

      setPage(response.data.pagination.current_page);
      setHasMore(response.data.pagination.has_more);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchProducts(1, true);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts(1, false);
  }, []);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchProducts(page + 1, false);
    }
  };

  const handleProductPress = (slug: string) => {
    router.push({
      pathname: "/products/[slug]",
      params: {
        slug,
      },
    });
  };

  /**
   * Toggle Favorite (same logic as Home)
   */
  const handleToggleFavorite = async (productId: number, slug: string) => {
    if (!slug) {
      console.warn("Cannot toggle favorite: Missing slug.");
      return;
    }

    // Optimistic UI
    setProducts((prev) =>
      prev.map((product) =>
        product.id === productId
          ? {
              ...product,
              is_liked: !product.is_liked,
            }
          : product,
      ),
    );

    try {
      const result = await toggleCollection(slug);

      console.log(`Backend sync complete for [${slug}]`, result.message);
    } catch (error) {
      console.error(error);

      // Rollback
      setProducts((prev) =>
        prev.map((product) =>
          product.id === productId
            ? {
                ...product,
                is_liked: !product.is_liked,
              }
            : product,
        ),
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="flex-row items-center px-4 py-4 bg-white border-b border-slate-200">
        <Text className="text-lg font-bold text-primary ml-3">Top Deals</Text>
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={{
          justifyContent: "space-between",
        }}
        contentContainerStyle={{
          padding: 8,
          paddingBottom: 20,
        }}
        renderItem={({ item }) => (
          <ProductCard
            item={{
              id: item.id.toString(),
              name: item.name,
              image: item.image ?? "",
              price: `₱${Number(item.price).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`,
              compare_price: item.compare_price,
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
        onEndReached={loadMore}
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
            <View className="py-4">
              <ActivityIndicator color="#034194" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View className="items-center justify-center mt-20">
              <Ionicons name="pricetag-outline" size={60} color="#94a3b8" />
              <Text className="mt-3 text-slate-600">No Top Deals Found</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
