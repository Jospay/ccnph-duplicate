import { Skeleton } from "@/components/ui/skeleton";
import { getNews, NewsItem } from "@/services/newsService";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

export default function SearchScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<NewsItem[]>([]);
  const [recommendations, setRecommendations] = useState<NewsItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [isSearching, setIsSearching] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

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
        const data = await getNews({
          page: 1,
          limit: 8,
          search: searchQuery,
        });

        const filteredData = (data ?? []).filter(
          (item: NewsItem) => item?.PostTitle && item.PostTitle.trim() !== "",
        );

        setRecommendations(filteredData.slice(0, 8));
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

    if (isInitial) {
      setLoading(true);
      setPage(1);
    } else {
      setLoadingMore(true);
    }

    try {
      const data = await getNews({
        page: targetPage,
        limit: 15,
        search: targetWord,
      });

      const cleanData = (data ?? []).filter(
        (item: NewsItem) => item?.PostTitle && item.PostTitle.trim() !== "",
      );

      if (targetPage === 1) {
        setResults(cleanData);
      } else {
        setResults((prev) => [...prev, ...cleanData]);
      }

      // If fewer items returned than the limit, assume end of results
      setHasMore(cleanData.length >= 15);
      setPage(targetPage);
    } catch (error) {
      console.error("Error matching query search results:", error);
      if (targetPage === 1) setResults([]);
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
  const handleSelectRecommendation = (item: NewsItem) => {
    Keyboard.dismiss();
    setSearchQuery(item.PostTitle);
    setIsSearching(false);

    // Immediately execute fully filled search query selection
    executeSearch(item.PostTitle, 1, true);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setResults([]);
    setRecommendations([]);
    setIsSearching(false);
    inputRef.current?.focus();
  };

  const handleNewsPress = (id: number | string) => {
    if (!id) return;
    router.push({
      pathname: "/(news)/details",
      params: { id: id.toString() },
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";

    const date = new Date(dateString.replace(" ", "T"));

    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
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
                placeholder="Search latest news..."
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
                          <Skeleton className="h-3 w-20 rounded-full mt-2" />
                        </View>
                      ))}
                    </View>
                  ) : recommendations.length > 0 ? (
                    <>
                      <View className="px-4 py-3 border-b border-slate-100">
                        <Text className="text-[11px] font-bold tracking-widest text-slate-400">
                          SUGGESTED ARTICLES
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
                            <View className="flex-1 pr-2">
                              <Text
                                numberOfLines={1}
                                className="text-sm font-semibold text-slate-800"
                              >
                                {item.PostTitle}
                              </Text>
                              {item.CategoryName ? (
                                <Text className="text-[11px] text-slate-400 mt-0.5">
                                  {item.CategoryName}
                                </Text>
                              ) : null}
                            </View>
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
                        No news suggestions found
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
                  <View className="px-4 pt-4">
                    {[1, 2, 3, 4].map((item) => (
                      <View
                        key={item}
                        className="mb-4 bg-white border border-slate-100 rounded-2xl overflow-hidden flex-row h-32"
                      >
                        <Skeleton className="w-32 h-full" />
                        <View className="flex-1 p-4 justify-between">
                          <View>
                            <Skeleton className="h-4 w-full rounded-full mb-3" />
                            <Skeleton className="h-4 w-11/12 rounded-full mb-3" />
                            <Skeleton className="h-4 w-9/12 rounded-full" />
                          </View>
                          <Skeleton className="h-3 w-32 rounded-full" />
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <FlatList
                    data={results}
                    keyExtractor={(item, index) => `result-${item.id}-${index}`}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => handleNewsPress(item.id)}
                        className="mx-4 mb-4 bg-white border border-slate-100 rounded-2xl overflow-hidden flex-row h-32"
                      >
                        <View className="relative">
                          <Image
                            source={{
                              uri: `https://newsphilippinesonline.com/editortextadminpanel/postimages/${item.PostImage}`,
                            }}
                            className="w-32 h-full bg-slate-100"
                            resizeMode="cover"
                          />
                          {item.CategoryName ? (
                            <View className="bg-white px-3 py-1 absolute top-1.5 left-1.5 rounded-full">
                              <Text className="text-[10px] font-bold text-slate-700">
                                {item.CategoryName}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        <View className="flex-1 p-4 justify-between">
                          <Text
                            numberOfLines={3}
                            className="text-[15px] font-bold text-slate-800 leading-6"
                          >
                            {item.PostTitle}
                          </Text>

                          <Text className="text-[11px] text-slate-400">
                            Posted on {formatDate(item.PostingDate)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )}
                    contentContainerStyle={{
                      paddingTop: 12,
                      paddingBottom: 40,
                    }}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.3}
                    keyboardShouldPersistTaps="handled"
                    onScrollBeginDrag={() => Keyboard.dismiss()}
                    ListEmptyComponent={
                      <View className="items-center justify-center py-20 px-4">
                        <Ionicons
                          name={
                            searchQuery ? "search-outline" : "newspaper-outline"
                          }
                          size={56}
                          color="#cbd5e1"
                        />
                        <Text className="text-slate-600 font-semibold mt-4 text-base text-center">
                          {searchQuery
                            ? "No matching articles found"
                            : "Begin searching news"}
                        </Text>
                        <Text className="text-slate-400 text-xs mt-1 text-center max-w-[260px]">
                          {searchQuery
                            ? `We couldn't locate active news articles for "${searchQuery}". Check spelling variants.`
                            : "Input your search terms into the lookup query engine above."}
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
