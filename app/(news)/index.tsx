import { Skeleton } from "@/components/ui/skeleton";
import { getNews, NewsItem } from "@/services/newsService";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

const CARD_WIDTH = width - 48;
const SPACING = 12;
const SNAP_INTERVAL = CARD_WIDTH + SPACING;

export default function NewsIndex() {
  const router = useRouter();

  const [news, setNews] = useState<NewsItem[]>([]);
  const [latestNews, setLatestNews] = useState<NewsItem[]>([]);

  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [activeSlide, setActiveSlide] = useState(0);

  const sliderRef = useRef<FlatList>(null);

  const loadNews = async (pageNumber = 1, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);

      const data = await getNews({
        page: pageNumber,
        limit: 20,
      });

      // ================= LATEST NEWS =================

      let latestItems: NewsItem[] = [];

      if (pageNumber === 1) {
        latestItems = data.slice(0, 5);

        setLatestNews(latestItems);
      } else {
        latestItems = latestNews;
      }

      const latestIds = latestItems.map((item) => item.id);

      const filteredNews = data.filter((item) => !latestIds.includes(item.id));

      if (append) {
        setNews((prev) => [...prev, ...filteredNews]);
      } else {
        setNews(filteredNews);
      }
    } catch (err) {
      console.log("News error:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadNews(1, false);
  }, []);

  const loadMore = () => {
    if (loadingMore || loading || news.length === 0) return;

    const nextPage = page + 1;

    setPage(nextPage);

    loadNews(nextPage, true);
  };

  // ✅ FIXED: Use onScroll for real-time updates instead of onMomentumScrollEnd
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;

    const index = Math.round(offsetX / SNAP_INTERVAL);

    setActiveSlide(index);
  };

  const scrollToSlide = (index: number) => {
    sliderRef.current?.scrollToOffset({
      offset: index * SNAP_INTERVAL,
      animated: true,
    });

    setActiveSlide(index);
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
    <FlatList
      data={loading ? [] : news}
      keyExtractor={(item) => item.id.toString()}
      showsVerticalScrollIndicator={false}
      onEndReached={loadMore}
      onEndReachedThreshold={0.3}
      className="bg-white"
      ListHeaderComponent={
        <>
          {/* ================= HEADER ================= */}

          <View className="px-4 pt-2 flex-row items-center bg-white justify-between">
            <Text className="text-3xl font-bold text-primary py-4">News</Text>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push("/(news)/search")}
              className="p-2"
            >
              <Ionicons name="search" size={24} color="#034194" />
            </TouchableOpacity>
          </View>

          {/* ================= CAROUSEL TITLE ================= */}

          {latestNews.length > 0 && (
            <View className="px-4 mb-3">
              <Text className="text-lg font-bold text-primary">
                Latest News
              </Text>
            </View>
          )}

          {/* ================= SLIDER ================= */}

          <FlatList
            ref={sliderRef}
            data={latestNews}
            horizontal
            snapToInterval={SNAP_INTERVAL}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum
            bounces={false}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id.toString()}
            onScroll={onScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{
              paddingLeft: 16,
              paddingRight: 4,
            }}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() =>
                  router.push({
                    pathname: "/(news)/details",
                    params: { id: item.id.toString() },
                  })
                }
                style={{
                  width: CARD_WIDTH,
                  marginRight: index === latestNews.length - 1 ? 16 : SPACING,
                }}
                className="rounded-3xl overflow-hidden border border-slate-200 bg-white"
              >
                <View className="relative">
                  <Image
                    source={{
                      uri: `https://newsphilippinesonline.com/editortextadminpanel/postimages/${item.PostImage}`,
                    }}
                    resizeMode="cover"
                    className="w-full h-60"
                  />

                  <LinearGradient
                    colors={["rgba(3,65,148,0.4)", "transparent"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    className="absolute top-0 left-0 right-0 h-20"
                  />

                  <LinearGradient
                    colors={["transparent", "rgba(3,65,148,0.9)"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    className="absolute bottom-0 left-0 right-0 h-44"
                  />

                  {/* <View className="absolute top-4 right-4 bg-white px-3 py-1 rounded-2xl">
                    <Text className="text-primary text-[10px] font-bold">
                      {item.CategoryName}
                    </Text>
                  </View> */}

                  <View className="absolute bottom-4 left-0 right-0 px-4">
                    <Text
                      className="text-white text-lg font-bold"
                      numberOfLines={2}
                    >
                      {item.PostTitle}
                    </Text>

                    <Text className="text-white/80 text-xs mt-2">
                      Posted on {formatDate(item.PostingDate)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />

          {/* ================= DOTS ================= */}

          <View className="flex-row justify-center items-center mt-4 mb-5">
            {latestNews.map((_, index) => (
              <TouchableOpacity
                key={index}
                activeOpacity={0.8}
                onPress={() => scrollToSlide(index)}
                className={`mx-1 rounded-full ${
                  activeSlide === index
                    ? "bg-primary w-6 h-2"
                    : "bg-slate-300 w-2 h-2"
                }`}
              />
            ))}
          </View>
        </>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() =>
            router.push({
              pathname: "/(news)/details",
              params: { id: item.id.toString() },
            })
          }
          className="mx-4 mb-4 bg-white rounded-3xl overflow-hidden border border-slate-200"
        >
          <Image
            source={{
              uri: `https://newsphilippinesonline.com/editortextadminpanel/postimages/${item.PostImage}`,
            }}
            resizeMode="cover"
            className="w-full h-52"
          />

          <View className="p-4">
            <Text
              className="font-bold text-base text-slate-800"
              numberOfLines={2}
            >
              {item.PostTitle}
            </Text>

            <Text className="text-xs text-slate-400 mt-2">
              {item.CategoryName}
            </Text>
          </View>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        loading ? (
          <View className="px-4">
            {[1, 2, 3].map((item) => (
              <View
                key={item}
                className="mb-4 border border-slate-200 rounded-3xl overflow-hidden"
              >
                <Skeleton className="w-full h-52" />

                <View className="p-4">
                  <Skeleton className="h-5 w-full rounded mb-2" />
                  <Skeleton className="h-5 w-3/4 rounded mb-3" />
                  <Skeleton className="h-4 w-20 rounded" />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View className="p-10 items-center">
            <Text className="text-slate-400">No news articles found.</Text>
          </View>
        )
      }
      ListFooterComponent={
        loadingMore ? (
          <View className="px-4 pb-6">
            {[1, 2].map((item) => (
              <View
                key={item}
                className="mb-4 border border-slate-200 rounded-3xl overflow-hidden"
              >
                <Skeleton className="w-full h-52" />

                <View className="p-4">
                  <Skeleton className="h-5 w-full rounded mb-2" />
                  <Skeleton className="h-5 w-3/4 rounded mb-3" />
                  <Skeleton className="h-4 w-20 rounded" />
                </View>
              </View>
            ))}
          </View>
        ) : null
      }
    />
  );
}
