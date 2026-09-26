import { ProductCard } from "@/components/ProductItems";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getStoreHome,
  Product,
  toggleCollection,
} from "@/services/productService";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

export default function SearchPage() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [recommendations, setRecommendations] = useState<Product[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [isSearching, setIsSearching] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // ================= LIVE RECOMMENDATIONS / SUGGESTIONS =================
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setRecommendations([]);
      setLoadingSuggestions(false);
      return;
    }

    const fetchSuggestions = async () => {
      setLoadingSuggestions(true);
      try {
        // Fetch base data using existing pagination method
        const response = await getStoreHome("All", 1);
        const rawProducts: Product[] = response?.data?.productsDiscover ?? [];

        // Dynamic local filtering for instant dropdown suggestion
        const filtered = rawProducts.filter(
          (product) =>
            product?.name &&
            product.name.toLowerCase().includes(searchQuery.toLowerCase()),
        );
        setRecommendations(filtered.slice(0, 8)); // Top 8 suggestions limit
      } catch (err) {
        console.log("Suggestions Error:", err);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    const debounce = setTimeout(() => {
      fetchSuggestions();
    }, 250);

    return () => clearTimeout(debounce);
  }, [searchQuery]);

  // ================= EXECUTE DETAILED SEARCH RESULT =================
  const executeSearch = async (
    targetWord = searchQuery,
    targetPage = 1,
    isInitial = true,
  ) => {
    if (!targetWord.trim()) return;

    Keyboard.dismiss();
    setIsSearching(false);

    if (isInitial) setLoading(true);
    else setLoadingMore(true);

    try {
      const response = await getStoreHome("All", targetPage);
      const rawProducts: Product[] = response?.data?.productsDiscover ?? [];

      const searchFiltered = rawProducts.filter((product) =>
        product.name.toLowerCase().includes(targetWord.toLowerCase()),
      );

      if (targetPage === 1) {
        setProducts(searchFiltered);
      } else {
        setProducts((prev) => [...prev, ...searchFiltered]);
      }

      const pagination = response?.data?.pagination;
      if (pagination) {
        setPage(pagination.current_page);
        setHasMore(pagination.has_more);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error matching query search results:", error);
      if (targetPage === 1) setProducts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && searchQuery.trim() && !isSearching) {
      const nextPage = page + 1;
      executeSearch(searchQuery, nextPage, false);
    }
  };

  // ================= ACTION HANDLERS =================
  const handleSelectRecommendation = (item: Product) => {
    Keyboard.dismiss();
    setSearchQuery(item.name);
    setIsSearching(false);

    // Immediately execute fully filled search query selection
    executeSearch(item.name, 1, true);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setProducts([]);
    setRecommendations([]);
    setIsSearching(false);
    inputRef.current?.focus();
  };

  const handleProductPress = (slug: string) => {
    if (!slug) return;
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

    try {
      await toggleCollection(slug);
    } catch (error) {
      console.error("Failed to sync collection layout error:", error);
      // Rollback UI State
      setProducts((prevProducts) =>
        prevProducts.map((p) =>
          p.id === productId ? { ...p, is_liked: !p.is_liked } : p,
        ),
      );
    }
  };

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View className="flex-1 bg-white">
        <StatusBar hidden={true} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          {/* ================= SEARCH HEADER BAR ================= */}
          <View className="p-2 bg-white flex-row border-b border-slate-200">
            <View className="flex-1 flex-row items-center bg-white rounded-2xl px-4 h-12 border border-slate-200">
              <Ionicons name="search" size={22} color="#64748b" />
              <TextInput
                ref={inputRef}
                autoFocus
                value={searchQuery}
                onFocus={() => {
                  if (searchQuery.length >= 2) {
                    setIsSearching(true);
                  }
                }}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  setIsSearching(true);
                }}
                placeholder="Type items to search..."
                placeholderTextColor="#94a3b8"
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
                selectionColor="#034194"
                onSubmitEditing={() => executeSearch()}
                className="flex-1 text-sm ml-3 text-slate-800"
              />

              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={clearSearch}>
                  <Ionicons name="close-circle" size={18} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ================= SCREEN VIEW CONTEXT ================= */}
          <View className="flex-1 bg-slate-50">
            {/* ================= DROP-DOWN INLINE RECOMMENDATIONS ================= */}
            {isSearching && searchQuery.length >= 2 && (
              <View className="px-4 absolute top-0 left-0 right-0 z-50 bg-slate-50 pb-5 max-h-[80%] shadow-sm">
                <View className="bg-white rounded-3xl border border-slate-100 overflow-hidden mt-2">
                  {loadingSuggestions ? (
                    <View>
                      <View className="px-4 py-3 border-b border-slate-100">
                        <Skeleton className="h-3 w-32 rounded-full" />
                      </View>
                      {[1, 2, 3, 4].map((idx) => (
                        <View
                          key={idx}
                          className="px-4 py-4 border-b border-slate-100"
                        >
                          <Skeleton className="h-4 w-3/4 rounded-full" />
                        </View>
                      ))}
                    </View>
                  ) : recommendations.length > 0 ? (
                    <>
                      <View className="px-4 py-3 border-b border-slate-100">
                        <Text className="text-[11px] font-bold tracking-widest text-slate-400">
                          SUGGESTED PRODUCTS
                        </Text>
                      </View>
                      <FlatList
                        data={recommendations}
                        keyExtractor={(item, idx) => `rec-${item.id}-${idx}`}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        onScrollBeginDrag={() => Keyboard.dismiss()}
                        renderItem={({ item, index }) => (
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => handleSelectRecommendation(item)}
                            className={`p-4 flex-row items-center justify-between ${
                              index !== recommendations.length - 1
                                ? "border-b border-slate-100"
                                : ""
                            }`}
                          >
                            <Text
                              numberOfLines={1}
                              className="text-sm font-semibold text-slate-800 flex-1 pr-2"
                            >
                              {item.name}
                            </Text>
                            <Ionicons
                              name="arrow-forward"
                              size={14}
                              color="#cbd5e1"
                            />
                          </TouchableOpacity>
                        )}
                      />
                    </>
                  ) : (
                    <View className="py-10 items-center">
                      <Text className="text-slate-400 text-sm">
                        No product recommendations found
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* ================= MASTER CONFIRMED RESULTS LAYER ================= */}
            {!isSearching && (
              <>
                {loading ? (
                  <View className="flex-row flex-wrap justify-between mt-2 px-2">
                    {[1, 2, 3, 4].map((item) => (
                      <View
                        key={item}
                        style={{ width: "48%" }}
                        className="mb-4"
                      >
                        <Skeleton className="h-[220px] rounded-3xl" />
                      </View>
                    ))}
                  </View>
                ) : (
                  <FlatList
                    data={products}
                    renderItem={({ item }) => (
                      <ProductCard
                        item={{
                          id: item.id.toString(),
                          name: item.name,
                          price: item.price
                            ? `₱${Number(item.price).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`
                            : "₱0.00",
                          image: item.image ?? "",
                          sold_count: `${item.sold_count ?? 0} sold`,
                          rating: item.rating,
                          stock: item.stock,
                          category: "",
                          isLiked: item.is_liked,
                        }}
                        onPress={() => handleProductPress(item.slug)}
                        onFavoritePress={() =>
                          handleToggleFavorite(item.id, item.slug)
                        }
                      />
                    )}
                    keyExtractor={(item, index) => `result-${item.id}-${index}`}
                    numColumns={2}
                    columnWrapperStyle={
                      products.length > 0
                        ? {
                            justifyContent: "space-between",
                          }
                        : undefined
                    }
                    className="p-2"
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.3}
                    keyboardShouldPersistTaps="handled"
                    onScrollBeginDrag={() => Keyboard.dismiss()}
                    ListEmptyComponent={
                      <View className="items-center justify-center py-20 px-4">
                        <Ionicons
                          name={
                            searchQuery ? "search-outline" : "basket-outline"
                          }
                          size={56}
                          color="#cbd5e1"
                        />
                        <Text className="text-slate-600 font-semibold mt-4 text-base text-center">
                          {searchQuery
                            ? "No matching catalog results"
                            : "Begin searching items"}
                        </Text>
                        <Text className="text-slate-400 text-xs mt-1 text-center max-w-[260px]">
                          {searchQuery
                            ? `We couldn't locate active products for "${searchQuery}". Check spelling variants.`
                            : "Input your requirements into the lookup query engine above."}
                        </Text>
                      </View>
                    }
                    ListFooterComponent={
                      loadingMore ? (
                        <View className="py-4 items-center justify-center">
                          <ActivityIndicator size="small" color="#034194" />
                        </View>
                      ) : null
                    }
                  />
                )}
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}
