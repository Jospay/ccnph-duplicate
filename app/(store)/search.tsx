import { ProductCard } from "@/components/ProductItems";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getStoreHome,
  Product,
  ProductScope,
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

// LOCAL / NATIONAL FILTER OPTIONS
const SCOPE_OPTIONS: {
  key: ProductScope;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "all", label: "All", icon: "apps-outline" },
  { key: "local", label: "Local", icon: "location-outline" },
  { key: "national", label: "National", icon: "globe-outline" },
];

// LOCAL / NATIONAL BADGE LOOK (used by suggestion rows)
const SCOPE_BADGE = {
  local: {
    label: "Local",
    icon: "location" as const,
    bg: "bg-emerald-600",
  },
  national: {
    label: "National",
    icon: "globe" as const,
    bg: "bg-[#3E4093]",
  },
};

export default function SearchPage() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  // Used to ignore slow/stale responses when the user types or filters quickly
  const searchRequestRef = useRef(0);
  const suggestionRequestRef = useRef(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState(""); // last executed search
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedScope, setSelectedScope] = useState<ProductScope>("all");

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
    const term = searchQuery.trim();

    if (term.length < 2) {
      suggestionRequestRef.current += 1;
      setRecommendations([]);
      setLoadingSuggestions(false);
      return;
    }

    const fetchSuggestions = async () => {
      const requestId = ++suggestionRequestRef.current;
      setLoadingSuggestions(true);
      try {
        // Server-side search so suggestions cover the whole catalog
        const response = await getStoreHome("All", 1, selectedScope, term);
        if (requestId !== suggestionRequestRef.current) return;

        const rawProducts: Product[] = response?.data?.productsDiscover ?? [];
        setRecommendations(rawProducts.slice(0, 8)); // Top 8 suggestions limit
      } catch {
        if (requestId === suggestionRequestRef.current) setRecommendations([]);
      } finally {
        if (requestId === suggestionRequestRef.current) {
          setLoadingSuggestions(false);
        }
      }
    };

    const debounce = setTimeout(() => {
      fetchSuggestions();
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery, selectedScope]);

  // ================= EXECUTE DETAILED SEARCH RESULT =================
  const executeSearch = async (
    targetWord = searchQuery,
    targetPage = 1,
    isInitial = true,
    scope: ProductScope = selectedScope,
  ) => {
    const word = targetWord.trim();
    if (!word) return;

    Keyboard.dismiss();
    setIsSearching(false);

    const requestId = ++searchRequestRef.current;

    if (isInitial) {
      setLoading(true);
      setActiveQuery(word);
      setHasSearched(true);
    } else {
      setLoadingMore(true);
    }

    try {
      // Server-side search + scope filter (backend handles visibility rules)
      const response = await getStoreHome("All", targetPage, scope, word);
      if (requestId !== searchRequestRef.current) return;

      const results: Product[] = response?.data?.productsDiscover ?? [];

      if (targetPage === 1) {
        setProducts(results);
      } else {
        setProducts((prev) => [...prev, ...results]);
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
      if (requestId === searchRequestRef.current && targetPage === 1) {
        setProducts([]);
        setHasMore(false);
      }
    } finally {
      if (requestId === searchRequestRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && !loading && hasMore && activeQuery && !isSearching) {
      executeSearch(activeQuery, page + 1, false, selectedScope);
    }
  };

  // ================= ACTION HANDLERS =================
  const handleSelectRecommendation = (item: Product) => {
    Keyboard.dismiss();
    setSearchQuery(item.name);
    setIsSearching(false);

    // Immediately execute fully filled search query selection
    executeSearch(item.name, 1, true, selectedScope);
  };

  const handleScopePress = (scope: ProductScope) => {
    if (scope === selectedScope) return;
    setSelectedScope(scope);

    // Re-run the confirmed search with the new filter
    if (hasSearched && activeQuery && !isSearching) {
      executeSearch(activeQuery, 1, true, scope);
    }
  };

  const clearSearch = () => {
    searchRequestRef.current += 1; // cancel any in-flight search
    setSearchQuery("");
    setActiveQuery("");
    setHasSearched(false);
    setProducts([]);
    setRecommendations([]);
    setHasMore(false);
    setLoading(false);
    setLoadingMore(false);
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

  const scopeLabel =
    selectedScope === "local"
      ? "local"
      : selectedScope === "national"
        ? "national"
        : "";

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
                  if (searchQuery.trim().length >= 2) {
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
                selectionColor="#3E4093"
                onSubmitEditing={() => executeSearch()}
                className="flex-1 text-sm ml-3 text-slate-800"
              />

              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={clearSearch}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={18} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ================= LOCAL / NATIONAL FILTER ================= */}
          <View className="px-2 py-2 bg-white border-b border-slate-100 flex-row">
            {SCOPE_OPTIONS.map((opt) => {
              const active = selectedScope === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  activeOpacity={0.8}
                  onPress={() => handleScopePress(opt.key)}
                  className={`flex-row items-center px-3 py-1.5 rounded-full mr-2 border ${
                    active
                      ? "bg-primary border-primary"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <Ionicons
                    name={opt.icon}
                    size={14}
                    color={active ? "#ffffff" : "#64748b"}
                  />
                  <Text
                    className={`ml-1.5 text-xs ${
                      active
                        ? "text-white font-semibold"
                        : "text-slate-600 font-medium"
                    }`}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ================= SCREEN VIEW CONTEXT ================= */}
          <View className="flex-1 bg-slate-50">
            {/* ================= DROP-DOWN INLINE RECOMMENDATIONS ================= */}
            {isSearching && searchQuery.trim().length >= 2 && (
              <View className="px-4 absolute top-0 left-0 right-0 z-50 bg-slate-50 pb-5 max-h-[80%] shadow-sm">
                <View className="bg-white rounded-3xl border border-slate-100 overflow-hidden mt-2 ">
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
                        renderItem={({ item, index }) => {
                          const badge = item.cooperative_scope
                            ? SCOPE_BADGE[item.cooperative_scope]
                            : null;

                          return (
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

                              {badge && (
                                <View
                                  className={`flex-row items-center px-2 py-0.5 rounded-full mr-2 ${badge.bg}`}
                                >
                                  <Ionicons
                                    name={badge.icon}
                                    size={9}
                                    color="#ffffff"
                                  />
                                  <Text className="text-white text-[9px] font-bold ml-1">
                                    {badge.label}
                                  </Text>
                                </View>
                              )}

                              <Ionicons
                                name="arrow-forward"
                                size={14}
                                color="#cbd5e1"
                              />
                            </TouchableOpacity>
                          );
                        }}
                      />
                    </>
                  ) : (
                    <View className="py-10 items-center">
                      <Text className="text-slate-400 text-sm">
                        {scopeLabel
                          ? `No ${scopeLabel} product recommendations found`
                          : "No product recommendations found"}
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
                          scope: item.cooperative_scope,
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
                    // Extra space at the bottom so the last row isn't cut off
                    contentContainerStyle={{ paddingBottom: 48 }}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.3}
                    keyboardShouldPersistTaps="handled"
                    onScrollBeginDrag={() => Keyboard.dismiss()}
                    ListHeaderComponent={
                      hasSearched && products.length > 0 ? (
                        <Text className="text-sm text-slate-500 px-1 mb-2">
                          Results for{" "}
                          <Text className="font-semibold text-slate-800">
                            {'"'}
                            {activeQuery}
                            {'"'}
                          </Text>
                          {scopeLabel ? ` · ${scopeLabel} only` : ""}
                        </Text>
                      ) : null
                    }
                    ListEmptyComponent={
                      <View className="items-center justify-center py-20 px-4">
                        <Ionicons
                          name={
                            hasSearched ? "search-outline" : "basket-outline"
                          }
                          size={56}
                          color="#cbd5e1"
                        />
                        <Text className="text-slate-600 font-semibold mt-4 text-base text-center">
                          {hasSearched
                            ? "No matching catalog results"
                            : "Begin searching items"}
                        </Text>
                        <Text className="text-slate-400 text-xs mt-1 text-center max-w-[260px]">
                          {hasSearched
                            ? `We couldn't find ${scopeLabel ? `${scopeLabel} ` : "active "}products for "${activeQuery}". Check the spelling or try another filter.`
                            : "Input your requirements into the lookup query engine above."}
                        </Text>
                      </View>
                    }
                    ListFooterComponent={
                      loadingMore ? (
                        <View className="py-4 items-center justify-center">
                          <ActivityIndicator size="small" color="#3E4093" />
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
